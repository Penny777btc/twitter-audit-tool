// ========================================
// Twitter Audit Tool - Backend Server
// ========================================
// 
// This server acts as a proxy to the Twitter API to avoid CORS issues.
// Users can provide their own API key via:
// 1. Environment variable (TWITTER_BEARER_TOKEN)
// 2. Request header (X-Twitter-Bearer-Token)
//
// ========================================

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

// Try to load dotenv if available
try {
    require('dotenv').config();
} catch (e) {
    // dotenv not installed, that's fine
}

// Configuration
const PORT = process.env.PORT || 3000;
const DEFAULT_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || '';

// MIME types for static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.ico': 'image/x-icon',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
};

// Helper function to make HTTPS requests
function httpsRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: JSON.parse(data)
                    });
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }
            });
        });

        req.on('error', reject);

        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

// Fetch Twitter user by username
async function fetchTwitterUser(username, bearerToken) {
    const options = {
        hostname: 'api.twitter.com',
        port: 443,
        path: `/2/users/by/username/${encodeURIComponent(username)}?user.fields=public_metrics,description,profile_image_url`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
        }
    };

    return await httpsRequest(options);
}

// Fetch user's recent tweets
async function fetchUserTweets(userId, maxResults, bearerToken) {
    const options = {
        hostname: 'api.twitter.com',
        port: 443,
        path: `/2/users/${userId}/tweets?max_results=${maxResults}&tweet.fields=text,created_at`,
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${bearerToken}`,
            'Content-Type': 'application/json'
        }
    };

    return await httpsRequest(options);
}

// Serve static files
function serveStaticFile(res, filePath) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content);
        }
    });
}

// Get bearer token from request or environment
function getBearerToken(req) {
    // Priority: Request header > Environment variable
    const headerToken = req.headers['x-twitter-bearer-token'];
    if (headerToken && headerToken.trim()) {
        return headerToken.trim();
    }
    return DEFAULT_BEARER_TOKEN;
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    const urlObj = new URL(req.url, `http://${req.headers.host}`);
    const pathname = urlObj.pathname;

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Twitter-Bearer-Token');

    // Handle OPTIONS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // API Routes
    if (pathname.startsWith('/api/')) {
        res.setHeader('Content-Type', 'application/json');

        // Get bearer token
        const bearerToken = getBearerToken(req);

        if (!bearerToken) {
            res.writeHead(401);
            res.end(JSON.stringify({
                error: 'API Key Required',
                message: '请在设置中配置您的 Twitter API Bearer Token'
            }));
            return;
        }

        try {
            // GET /api/user/:username
            if (pathname.startsWith('/api/user/')) {
                const username = decodeURIComponent(pathname.replace('/api/user/', '')).replace(/^@/, '');

                if (!username) {
                    res.writeHead(400);
                    res.end(JSON.stringify({ error: 'Username is required' }));
                    return;
                }

                console.log(`[API] Fetching user: @${username}`);
                const userResult = await fetchTwitterUser(username, bearerToken);

                if (userResult.statusCode !== 200) {
                    console.error('[API] Twitter error:', userResult.data);
                    res.writeHead(userResult.statusCode);
                    res.end(JSON.stringify(userResult.data));
                    return;
                }

                if (!userResult.data.data) {
                    res.writeHead(404);
                    res.end(JSON.stringify({ error: 'User not found', details: userResult.data }));
                    return;
                }

                const user = userResult.data.data;
                console.log(`[API] Found: ${user.name} (@${user.username}), followers: ${user.public_metrics?.followers_count}`);

                // Fetch user's tweets
                let tweets = [];
                if (user.id) {
                    const tweetsResult = await fetchUserTweets(user.id, 5, bearerToken);

                    if (tweetsResult.statusCode === 200 && tweetsResult.data.data) {
                        tweets = tweetsResult.data.data.map(t => t.text);
                        console.log(`[API] Found ${tweets.length} tweets`);
                    } else if (tweetsResult.statusCode === 429) {
                        console.log('[API] Rate limited on tweets fetch');
                    }
                }

                // Return combined result
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        description: user.description || '',
                        followers_count: user.public_metrics?.followers_count || 0,
                        following_count: user.public_metrics?.following_count || 0,
                        tweet_count: user.public_metrics?.tweet_count || 0,
                        profile_image_url: user.profile_image_url || ''
                    },
                    tweets: tweets
                }));
                return;
            }

            // GET /api/status - Check if API key is configured
            if (pathname === '/api/status') {
                res.writeHead(200);
                res.end(JSON.stringify({
                    hasEnvToken: !!DEFAULT_BEARER_TOKEN,
                    tokenSource: bearerToken === DEFAULT_BEARER_TOKEN ? 'environment' : 'request'
                }));
                return;
            }

            // Unknown API route
            res.writeHead(404);
            res.end(JSON.stringify({ error: 'API endpoint not found' }));

        } catch (error) {
            console.error('[API] Error:', error);
            res.writeHead(500);
            res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
        }

        return;
    }

    // Static file serving
    let filePath;
    const decodedPath = decodeURIComponent(pathname);

    if (decodedPath === '/' || decodedPath === '/twitter-audit/' || decodedPath === '/twitter-audit') {
        filePath = path.join(__dirname, 'index.html');
    } else if (decodedPath.startsWith('/twitter-audit/')) {
        filePath = path.join(__dirname, decodedPath.replace('/twitter-audit/', ''));
    } else if (decodedPath.endsWith('.xlsx')) {
        filePath = path.join(__dirname, '..', decodedPath);
    } else {
        filePath = path.join(__dirname, decodedPath);
    }

    serveStaticFile(res, filePath);
});

server.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║           Twitter Audit Tool - Server Started            ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  🌐 URL: http://localhost:${PORT}/twitter-audit/             ║`);
    console.log('╠══════════════════════════════════════════════════════════╣');
    if (DEFAULT_BEARER_TOKEN) {
        console.log('║  ✅ API Key: Configured via environment variable         ║');
    } else {
        console.log('║  ⚠️  API Key: Not configured (users must provide their own)║');
    }
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║  Press Ctrl+C to stop the server                         ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
});
