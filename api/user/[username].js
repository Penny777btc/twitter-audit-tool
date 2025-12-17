// Vercel Serverless Function for Twitter API
// Path: /api/user/[username].js

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Twitter-Bearer-Token');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ success: false, error: 'Method not allowed' });
    }

    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ success: false, error: 'Username is required' });
    }

    // Get bearer token from header or environment
    const bearerToken = req.headers['x-twitter-bearer-token'] || process.env.TWITTER_BEARER_TOKEN;

    if (!bearerToken) {
        return res.status(401).json({
            success: false,
            error: 'Twitter API Bearer Token is required. Please configure it in settings.'
        });
    }

    try {
        // Fetch user data
        const userResponse = await fetch(
            `https://api.twitter.com/2/users/by/username/${encodeURIComponent(username)}?user.fields=public_metrics,description,profile_image_url`,
            {
                headers: {
                    'Authorization': `Bearer ${bearerToken}`
                }
            }
        );

        if (!userResponse.ok) {
            const errorData = await userResponse.json().catch(() => ({}));

            if (userResponse.status === 429) {
                return res.status(429).json({
                    success: false,
                    error: 'Twitter API rate limit exceeded. Please wait and try again.'
                });
            }

            if (userResponse.status === 401) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid Twitter API token'
                });
            }

            return res.status(userResponse.status).json({
                success: false,
                error: errorData.detail || errorData.title || `Twitter API error: ${userResponse.status}`
            });
        }

        const userData = await userResponse.json();

        if (!userData.data) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const user = userData.data;
        console.log(`[API] Found: ${user.name} (@${user.username}), followers: ${user.public_metrics?.followers_count}`);

        // Try to fetch recent tweets
        let tweets = [];
        try {
            const tweetsResponse = await fetch(
                `https://api.twitter.com/2/users/${user.id}/tweets?max_results=5&tweet.fields=text`,
                {
                    headers: {
                        'Authorization': `Bearer ${bearerToken}`
                    }
                }
            );

            if (tweetsResponse.ok) {
                const tweetsData = await tweetsResponse.json();
                if (tweetsData.data) {
                    tweets = tweetsData.data.map(t => t.text);
                    console.log(`[API] Found ${tweets.length} tweets`);
                }
            } else {
                console.log(`[API] Rate limited on tweets fetch`);
            }
        } catch (tweetError) {
            console.log(`[API] Error fetching tweets: ${tweetError.message}`);
        }

        // Extract rate limit info from user response (primary cost)
        const rateLimit = {
            limit: userResponse.headers.get('x-rate-limit-limit'),
            remaining: userResponse.headers.get('x-rate-limit-remaining'),
            reset: userResponse.headers.get('x-rate-limit-reset')
        };

        return res.status(200).json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                description: user.description || '',
                profile_image_url: user.profile_image_url,
                followers_count: user.public_metrics?.followers_count || 0,
                following_count: user.public_metrics?.following_count || 0,
                tweet_count: user.public_metrics?.tweet_count || 0
            },
            tweets: tweets,
            rate_limit: rateLimit
        });

    } catch (error) {
        console.error(`[API] Error:`, error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal server error'
        });
    }
}
