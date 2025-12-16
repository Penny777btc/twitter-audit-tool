// ========================================
// Twitter Audit Tool - Main Application
// ========================================
// An open-source tool for auditing Twitter users
// ========================================

// ========================================
// Configuration & Storage
// ========================================

const STORAGE_KEYS = {
    API_KEY: 'twitter_audit_api_key',
    KEYWORDS: 'twitter_audit_keywords',
    REQUEST_DELAY: 'twitter_audit_request_delay'
};

const DEFAULT_KEYWORDS = [
    'AI', 'ChatGPT', 'Vibe coding', 'Vibe Coding', 'vibecoding',
    'Gemini', 'Agent', 'OpenAI', 'Claude', 'Cursor', 'Antigravity',
    'GPT', 'LLM', 'Machine Learning', 'Deep Learning'
];

const DEFAULT_REQUEST_DELAY = 60000; // 60 seconds

// Get settings from localStorage
function getApiKey() {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
}

function setApiKey(key) {
    if (key && key.trim()) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, key.trim());
    } else {
        localStorage.removeItem(STORAGE_KEYS.API_KEY);
    }
}

function getKeywords() {
    const stored = localStorage.getItem(STORAGE_KEYS.KEYWORDS);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) {
            return DEFAULT_KEYWORDS;
        }
    }
    return DEFAULT_KEYWORDS;
}

function setKeywords(keywords) {
    localStorage.setItem(STORAGE_KEYS.KEYWORDS, JSON.stringify(keywords));
}

function getRequestDelay() {
    const stored = localStorage.getItem(STORAGE_KEYS.REQUEST_DELAY);
    return stored ? parseInt(stored) : DEFAULT_REQUEST_DELAY;
}

function setRequestDelay(delay) {
    localStorage.setItem(STORAGE_KEYS.REQUEST_DELAY, delay.toString());
}

// ========================================
// Global State
// ========================================

let tableData = [];
let lastCheckedIndex = null;

// ========================================
// File Handling
// ========================================

document.getElementById('fileInput').addEventListener('change', handleFileUpload);

// Also add click handler to reset input before selecting
document.getElementById('fileInput').addEventListener('click', function () {
    this.value = '';
});

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            processWorkbook(data, file.name);
        } catch (error) {
            console.error('Error reading file:', error);
            showToast('读取文件时出错', 'error');
        }
    };
    reader.readAsArrayBuffer(file);
}

function processWorkbook(data, filename) {
    try {
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length === 0) {
            showToast('表格为空', 'error');
            return;
        }

        // Store jsonData globally for column selection
        window.currentJsonData = jsonData;
        window.currentFilename = filename;

        // Show column selection dialog
        showColumnSelectionModal(jsonData);

    } catch (error) {
        console.error('Error processing workbook:', error);
        showToast('解析表格出错：' + error.message, 'error');
    }
}

function showColumnSelectionModal(jsonData) {
    const headerRow = jsonData[0] || [];

    // Create modal if not exists
    let modal = document.getElementById('columnSelectModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'columnSelectModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3>📊 选择 Handle 列</h3>
                    <button class="modal-close" onclick="closeColumnSelectModal()">×</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 16px;">请选择包含 Twitter Handle 的列：</p>
                    <div class="input-group">
                        <select id="columnSelect" class="form-input"></select>
                    </div>
                    <div id="columnPreview" style="margin-top: 16px; max-height: 200px; overflow-y: auto; background: var(--bg-tertiary); border-radius: 8px; padding: 12px;"></div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeColumnSelectModal()">取消</button>
                    <button class="btn btn-accent" onclick="confirmColumnSelection()">确认选择</button>
                </div>
            </div>
        `;
        modal.onclick = (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('modal-overlay')) {
                closeColumnSelectModal();
            }
        };
        document.body.appendChild(modal);
    }

    // Populate column options
    const select = document.getElementById('columnSelect');
    select.innerHTML = '';

    headerRow.forEach((header, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `列 ${index + 1}: ${header || '(无标题)'}`;
        select.appendChild(option);
    });

    // Auto-select best column
    const bestColumn = findBestColumn(jsonData);
    select.value = bestColumn;

    // Add change listener for preview
    select.onchange = () => updateColumnPreview(jsonData, parseInt(select.value));

    // Show preview
    updateColumnPreview(jsonData, bestColumn);

    modal.style.display = 'flex';
}

function findBestColumn(jsonData) {
    const twitterUrlRegex = /(?:twitter\.com|x\.com)\/(@?[a-zA-Z0-9_]{1,15})/i;
    const columnScores = {};
    const headerRow = jsonData[0] || [];
    const handleColumnKeywords = ['handle', 'twitter', 'x.com', '推特', '账号', 'username', 'user', '@'];

    headerRow.forEach((header, colIndex) => {
        if (!header) return;
        const headerStr = String(header).toLowerCase();
        columnScores[colIndex] = 0;

        handleColumnKeywords.forEach(keyword => {
            if (headerStr.includes(keyword.toLowerCase())) {
                columnScores[colIndex] += 10;
            }
        });
    });

    const sampleSize = Math.min(20, jsonData.length);
    for (let rowIdx = 1; rowIdx < sampleSize; rowIdx++) {
        const row = jsonData[rowIdx];
        if (!row) continue;

        row.forEach((cell, colIndex) => {
            if (!cell) return;
            const cellStr = String(cell).trim();
            columnScores[colIndex] = columnScores[colIndex] || 0;

            if (cellStr.startsWith('@')) columnScores[colIndex] += 5;
            if (twitterUrlRegex.test(cellStr)) columnScores[colIndex] += 10;
            if (cellStr.length >= 3 && cellStr.length <= 15 && /^@?[a-zA-Z0-9_]+$/.test(cellStr)) {
                columnScores[colIndex] += 1;
            }
        });
    }

    let bestColumn = 0;
    let bestScore = 0;
    Object.entries(columnScores).forEach(([colIndex, score]) => {
        if (score > bestScore) {
            bestScore = score;
            bestColumn = parseInt(colIndex);
        }
    });

    return bestColumn;
}

function updateColumnPreview(jsonData, columnIndex) {
    const preview = document.getElementById('columnPreview');
    const samples = [];
    let nonEmptyCount = 0;

    for (let i = 1; i < Math.min(11, jsonData.length); i++) {
        const row = jsonData[i];
        const value = row && row[columnIndex] ? String(row[columnIndex]).trim() : '(空)';
        samples.push(`<div style="padding: 4px 0; border-bottom: 1px solid var(--border-color);">第 ${i} 行: <strong>${value}</strong></div>`);
    }

    // Count non-empty cells
    for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (row && row[columnIndex] && String(row[columnIndex]).trim()) {
            nonEmptyCount++;
        }
    }

    preview.innerHTML = `
        <p style="margin-bottom: 8px; color: var(--text-secondary);">
            预览（前 10 行）| 非空行数: <strong>${nonEmptyCount}</strong> / ${jsonData.length - 1}
        </p>
        ${samples.join('')}
    `;
}

function closeColumnSelectModal() {
    const modal = document.getElementById('columnSelectModal');
    if (modal) modal.style.display = 'none';
}

function confirmColumnSelection() {
    const columnIndex = parseInt(document.getElementById('columnSelect').value);
    const jsonData = window.currentJsonData;
    const filename = window.currentFilename;

    closeColumnSelectModal();

    // Extract handles from selected column
    const handles = extractHandlesFromColumn(jsonData, columnIndex);

    if (handles.length === 0) {
        showToast('所选列中未找到有效的 Handle', 'error');
        return;
    }

    // Create table data
    tableData = handles.map((handle, index) => ({
        id: index + 1,
        handle: handle,
        link: `https://x.com/${handle}`,
        followers: null,
        description: '',
        tweets: [],
        aiKeywords: [],
        aiDetected: null,
        status: 'pending',
        error: null,
        selected: false
    }));

    // Show table section
    document.getElementById('uploadSection').style.display = 'none';
    document.getElementById('tableSection').style.display = 'flex';

    renderTable();
    updateDataCount();

    console.log(`Loaded ${handles.length} Twitter handles from ${filename}`);
    showToast(`成功加载 ${handles.length} 个 Handle`, 'success');
}

function extractHandlesFromColumn(jsonData, columnIndex) {
    const twitterUrlRegex = /(?:twitter\.com|x\.com)\/(@?[a-zA-Z0-9_]{1,15})/i;
    const handles = [];

    for (let rowIdx = 1; rowIdx < jsonData.length; rowIdx++) {
        const row = jsonData[rowIdx];
        if (!row || row[columnIndex] === undefined || row[columnIndex] === null) continue;

        const cellStr = String(row[columnIndex]).trim();
        if (!cellStr) continue;

        // Try to extract from URL
        const urlMatch = cellStr.match(twitterUrlRegex);
        if (urlMatch) {
            const handle = cleanHandle(urlMatch[1]);
            if (handle) {
                handles.push(handle);
                continue;
            }
        }

        // Clean and add
        const handle = cleanHandle(cellStr);
        if (handle && handle.length > 0) {
            handles.push(handle);
        }
    }

    return [...new Set(handles)]; // Remove duplicates
}

// Extract Twitter handles from any format of spreadsheet
// Strategy: First identify which column contains handles, then extract from that column only
function extractTwitterHandles(jsonData) {
    if (!jsonData || jsonData.length === 0) return [];

    const twitterUrlRegex = /(?:twitter\.com|x\.com)\/(@?[a-zA-Z0-9_]{1,15})/i;

    // Step 1: Find the column that most likely contains Twitter handles
    const columnScores = {};
    const headerRow = jsonData[0] || [];

    // Check header names for hints
    const handleColumnKeywords = ['handle', 'twitter', 'x.com', '推特', '账号', 'username', 'user', '@'];

    headerRow.forEach((header, colIndex) => {
        if (!header) return;
        const headerStr = String(header).toLowerCase();
        columnScores[colIndex] = columnScores[colIndex] || 0;

        // Boost score if header contains keywords
        handleColumnKeywords.forEach(keyword => {
            if (headerStr.includes(keyword.toLowerCase())) {
                columnScores[colIndex] += 10;
            }
        });
    });

    // Analyze each column's content (sample first 20 rows)
    const sampleSize = Math.min(20, jsonData.length);
    for (let rowIdx = 1; rowIdx < sampleSize; rowIdx++) {
        const row = jsonData[rowIdx];
        if (!row) continue;

        row.forEach((cell, colIndex) => {
            if (!cell) return;
            const cellStr = String(cell).trim();
            columnScores[colIndex] = columnScores[colIndex] || 0;

            // High score for @ prefix
            if (cellStr.startsWith('@')) {
                columnScores[colIndex] += 5;
            }

            // High score for Twitter URLs
            if (twitterUrlRegex.test(cellStr)) {
                columnScores[colIndex] += 10;
            }

            // Moderate score for handle-like strings
            if (cellStr.length >= 3 && cellStr.length <= 15 && /^@?[a-zA-Z0-9_]+$/.test(cellStr)) {
                columnScores[colIndex] += 1;
            }
        });
    }

    // Find the column with highest score
    let bestColumn = -1;
    let bestScore = 0;
    Object.entries(columnScores).forEach(([colIndex, score]) => {
        if (score > bestScore) {
            bestScore = score;
            bestColumn = parseInt(colIndex);
        }
    });

    console.log('Column scores:', columnScores);
    console.log('Best column:', bestColumn, 'with score:', bestScore);

    // If no good column found, return empty
    if (bestColumn < 0 || bestScore < 5) {
        console.log('No suitable Handle column found');
        return [];
    }

    // Step 2: Extract handles from the best column only (one per row)
    const handles = [];

    for (let rowIdx = 1; rowIdx < jsonData.length; rowIdx++) { // Skip header row
        const row = jsonData[rowIdx];
        if (!row || row[bestColumn] === undefined || row[bestColumn] === null) continue;

        const cellStr = String(row[bestColumn]).trim();
        if (!cellStr) {
            console.log(`Row ${rowIdx}: Empty cell, skipping`);
            continue;
        }

        // Try to extract handle from Twitter URL
        const urlMatch = cellStr.match(twitterUrlRegex);
        if (urlMatch) {
            const handle = cleanHandle(urlMatch[1]);
            if (handle) {
                handles.push(handle);
                continue;
            }
        }

        // Extract handle (remove @ if present, clean up)
        const handle = cleanHandle(cellStr);

        // Accept any non-empty handle (more lenient)
        if (handle && handle.length > 0) {
            handles.push(handle);
        } else {
            console.log(`Row ${rowIdx}: Could not extract handle from "${cellStr}"`);
        }
    }

    const uniqueHandles = [...new Set(handles)];
    console.log(`Extracted ${handles.length} handles (${uniqueHandles.length} unique) from ${jsonData.length - 1} rows`);

    if (handles.length !== uniqueHandles.length) {
        console.log(`Note: ${handles.length - uniqueHandles.length} duplicate handles were removed`);
    }

    // Return unique handles (no duplicates)
    return uniqueHandles;
}

function cleanHandle(handle) {
    if (!handle) return '';
    return String(handle)
        .replace(/^@/, '')
        .replace(/https?:\/\/(www\.)?(twitter|x)\.com\//i, '')
        .replace(/[?#].*$/, '') // Remove query params
        .replace(/\s+/g, '') // Remove whitespace
        .trim();
}

function isValidHandle(handle) {
    if (!handle) return false;
    // Twitter handles: 1-15 chars, alphanumeric + underscore
    return /^[a-zA-Z0-9_]{1,15}$/.test(handle);
}

function showUploadSection() {
    document.getElementById('tableSection').style.display = 'none';
    document.getElementById('uploadSection').style.display = 'block';
    tableData = [];
}

// ========================================
// Table Rendering
// ========================================

function renderTable() {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    const dataToRender = getFilteredData();

    dataToRender.forEach((row, displayIndex) => {
        // Find the actual index in tableData
        const actualIndex = tableData.indexOf(row);
        const tr = document.createElement('tr');
        if (row.selected) tr.classList.add('selected');

        tr.innerHTML = `
            <td class="col-checkbox" onclick="event.stopPropagation()">
                <input type="checkbox" onchange="toggleSelect(${actualIndex}, event)" ${row.selected ? 'checked' : ''}>
            </td>
            <td class="col-index">${actualIndex + 1}</td>
            <td class="col-handle">
                <span class="cell-handle">@${escapeHtml(row.handle)}</span>
            </td>
            <td class="col-link">
                <a href="${escapeHtml(row.link)}" target="_blank" rel="noopener" class="link-cell">
                    ${escapeHtml(row.link)}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15,3 21,3 21,9"/>
                        <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                </a>
            </td>
            <td class="col-followers">
                <span class="cell-followers">${row.followers !== null ? formatNumber(row.followers) : '—'}</span>
            </td>
            <td class="col-ai">
                ${renderAiTag(row)}
            </td>
            <td class="col-status">
                ${renderStatus(row)}
            </td>
        `;

        tr.style.cursor = 'pointer';
        tr.addEventListener('click', () => showUserDetails(row));

        tbody.appendChild(tr);
    });
}

function formatNumber(num) {
    if (num === null || num === undefined) return '—';
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
}

function renderAiTag(row) {
    if (row.aiDetected === null) {
        return '<span class="text-muted">—</span>';
    }
    if (row.aiDetected) {
        return `<span class="tag tag-ai" title="${row.aiKeywords.join(', ')}">🏷️ ${row.aiKeywords.length} 个</span>`;
    }
    return '<span class="tag tag-no-ai">无</span>';
}

function renderStatus(row) {
    switch (row.status) {
        case 'pending':
            return '<span class="status-badge status-pending">待审核</span>';
        case 'loading':
            return '<span class="status-badge status-loading"><span class="spinner"></span>审核中</span>';
        case 'success':
            return '<span class="status-badge status-success">✓ 完成</span>';
        case 'error':
            return `<span class="status-badge status-error" title="${row.error || ''}">✗ 失败</span>`;
        default:
            return '';
    }
}

function updateDataCount() {
    const filter = document.getElementById('statusFilter')?.value || 'all';
    const filteredCount = getFilteredData().length;
    const totalCount = tableData.length;

    if (filter === 'all') {
        document.getElementById('dataCount').textContent = `共 ${totalCount} 条记录`;
    } else {
        const statusText = { pending: '待审核', success: '已完成', error: '失败' };
        document.getElementById('dataCount').textContent = `${statusText[filter]}: ${filteredCount} / ${totalCount} 条`;
    }

    // Show/hide retry button based on failed count
    const failedCount = tableData.filter(row => row.status === 'error').length;
    const retryBtn = document.getElementById('btnRetryFailed');
    if (retryBtn) {
        retryBtn.style.display = failedCount > 0 ? 'inline-flex' : 'none';
        if (failedCount > 0) {
            retryBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="23,4 23,10 17,10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                重试失败 (${failedCount})
            `;
        }
    }
}

// 当前筛选后的数据
let currentFilter = 'all';

function getFilteredData() {
    if (currentFilter === 'all') return tableData;
    return tableData.filter(row => row.status === currentFilter);
}

function filterByStatus() {
    currentFilter = document.getElementById('statusFilter').value;
    renderTable();
    updateDataCount();
}

function retryFailed() {
    const failedRows = tableData.filter(row => row.status === 'error');
    if (failedRows.length === 0) {
        showToast('没有失败的记录需要重试', 'info');
        return;
    }

    // Reset failed rows to pending
    failedRows.forEach(row => {
        row.status = 'pending';
        row.error = null;
    });

    renderTable();
    updateDataCount();

    showToast(`已将 ${failedRows.length} 个失败记录重置为待审核`, 'success');

    // Open audit modal to start retrying
    openAuditModal();
}

// ========================================
// Selection & Batch Operations
// ========================================

function toggleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const isChecked = selectAll.checked;
    tableData.forEach(row => row.selected = isChecked);
    renderTable();
    updateControls();
}

function toggleSelect(index, event) {
    if (event.shiftKey && lastCheckedIndex !== null) {
        const start = Math.min(lastCheckedIndex, index);
        const end = Math.max(lastCheckedIndex, index);
        for (let i = start; i <= end; i++) {
            tableData[i].selected = true;
        }
    } else {
        tableData[index].selected = !tableData[index].selected;
        lastCheckedIndex = index;
    }

    const allSelected = tableData.every(row => row.selected);
    document.getElementById('selectAll').checked = allSelected;

    renderTable();
    updateControls();

    if (event) event.stopPropagation();
}

function updateControls() {
    const selectedCount = tableData.filter(row => row.selected).length;
    const btnDelete = document.getElementById('btnDeleteSelected');

    if (selectedCount > 0) {
        btnDelete.style.display = 'inline-flex';
        btnDelete.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
            删除 (${selectedCount})
        `;
    } else {
        btnDelete.style.display = 'none';
    }
}

function deleteSelected() {
    const count = tableData.filter(row => row.selected).length;
    if (count === 0) {
        showToast('请先选择要删除的记录', 'error');
        return;
    }
    if (!confirm(`确定要删除选中的 ${count} 条记录吗？`)) return;

    tableData = tableData.filter(row => !row.selected);
    document.getElementById('selectAll').checked = false;
    lastCheckedIndex = null;

    renderTable();
    updateDataCount();
    updateControls();
    showToast(`已删除 ${count} 条记录`, 'success');
}

// 全选按钮
function selectAllRows() {
    const allSelected = tableData.every(row => row.selected);
    tableData.forEach(row => row.selected = !allSelected);

    const selectAllCheckbox = document.getElementById('selectAll');
    if (selectAllCheckbox) selectAllCheckbox.checked = !allSelected;

    renderTable();
    updateControls();
    showToast(allSelected ? '已取消全选' : `已选中 ${tableData.length} 条记录`, 'info');
}

// 范围删除模态框
function openRangeDeleteModal() {
    if (tableData.length === 0) {
        showToast('没有数据可删除', 'error');
        return;
    }

    const modal = document.getElementById('rangeDeleteModal');
    document.getElementById('deleteStartInput').value = 1;
    document.getElementById('deleteEndInput').value = Math.min(100, tableData.length);
    document.getElementById('deleteEndInput').max = tableData.length;

    updateDeletePreview();

    document.getElementById('deleteStartInput').addEventListener('input', updateDeletePreview);
    document.getElementById('deleteEndInput').addEventListener('input', updateDeletePreview);

    modal.style.display = 'flex';
}

function closeRangeDeleteModal() {
    document.getElementById('rangeDeleteModal').style.display = 'none';
}

function handleRangeDeleteModalClick(event) {
    if (event.target.classList.contains('modal') || event.target.classList.contains('modal-overlay')) {
        closeRangeDeleteModal();
    }
}

function updateDeletePreview() {
    const start = parseInt(document.getElementById('deleteStartInput').value) || 1;
    const end = parseInt(document.getElementById('deleteEndInput').value) || 1;
    const count = Math.max(0, Math.min(end, tableData.length) - Math.max(1, start) + 1);

    const preview = document.getElementById('deletePreview');
    if (count > 0 && start <= end) {
        preview.innerHTML = `将删除第 ${start} 到 ${end} 行，共 <strong>${count}</strong> 条记录`;
        preview.className = 'info-box warning';
    } else {
        preview.innerHTML = '无效的范围';
        preview.className = 'info-box error';
    }
}

function confirmRangeDelete() {
    const start = parseInt(document.getElementById('deleteStartInput').value) || 1;
    const end = parseInt(document.getElementById('deleteEndInput').value) || 1;

    if (start < 1 || end < start || end > tableData.length) {
        showToast('无效的删除范围', 'error');
        return;
    }

    const count = end - start + 1;

    // Remove rows in range (0-indexed internally)
    tableData = tableData.filter((row, index) => {
        const rowNum = index + 1;
        return rowNum < start || rowNum > end;
    });

    closeRangeDeleteModal();
    renderTable();
    updateDataCount();
    updateControls();
    showToast(`已删除 ${count} 条记录`, 'success');
}

// ========================================
// Link Generation
// ========================================

function generateAllLinks() {
    tableData.forEach(row => {
        if (row.handle) {
            row.link = `https://x.com/${row.handle}`;
        }
    });
    renderTable();
    showToast('所有链接已生成！', 'success');
}

// ========================================
// Settings Modal
// ========================================

function openSettingsModal() {
    const modal = document.getElementById('settingsModal');

    // Load current settings
    document.getElementById('apiKeyInput').value = getApiKey();
    document.getElementById('apiKeyInput').type = 'password';
    document.getElementById('keywordsInput').value = getKeywords().join('\n');
    document.getElementById('requestDelayInput').value = getRequestDelay() / 1000;

    updateApiKeyStatus();

    modal.style.display = 'flex';
}

function closeSettingsModal() {
    document.getElementById('settingsModal').style.display = 'none';
}

function handleSettingsModalClick(event) {
    if (event.target.classList.contains('modal') || event.target.classList.contains('modal-overlay')) {
        closeSettingsModal();
    }
}

function toggleApiKeyVisibility() {
    const input = document.getElementById('apiKeyInput');
    input.type = input.type === 'password' ? 'text' : 'password';
}

function saveSettings() {
    // Save API Key
    const apiKey = document.getElementById('apiKeyInput').value.trim();
    setApiKey(apiKey);

    // Save Keywords
    const keywordsText = document.getElementById('keywordsInput').value;
    const keywords = keywordsText.split('\n').map(k => k.trim()).filter(k => k.length > 0);
    setKeywords(keywords.length > 0 ? keywords : DEFAULT_KEYWORDS);

    // Save Request Delay
    const delaySeconds = parseInt(document.getElementById('requestDelayInput').value) || 60;
    setRequestDelay(Math.max(10, Math.min(300, delaySeconds)) * 1000);

    closeSettingsModal();

    // Show success feedback
    showToast('设置已保存！', 'success');
}

// Toast notification
function showToast(message, type = 'info') {
    // Remove existing toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f97316' : '#3b82f6'};
        color: white;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        z-index: 9999;
        animation: fadeInUp 0.3s ease;
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

function updateApiKeyStatus() {
    const statusEl = document.getElementById('apiKeyStatus');
    const hasKey = !!getApiKey();

    if (hasKey) {
        statusEl.innerHTML = `
            <div class="info-box success">
                <span>✅ API Key 已配置</span>
            </div>
        `;
    } else {
        statusEl.innerHTML = `
            <div class="info-box error">
                <span>❌ API Key 未配置</span>
                <p class="text-muted">请输入您的 Twitter API Bearer Token</p>
            </div>
        `;
    }
}

// ========================================
// Audit Modal & Settings
// ========================================

function openAuditModal() {
    // Check API Key first
    if (!getApiKey()) {
        alert('请先在设置中配置 Twitter API Key');
        openSettingsModal();
        return;
    }

    const modal = document.getElementById('auditModal');
    const pendingCount = tableData.filter(row => row.status === 'pending').length;

    document.getElementById('totalRecordsCount').textContent = pendingCount;
    document.getElementById('auditCountInput').value = Math.min(5, pendingCount);
    document.getElementById('auditStartInput').value = 1;

    updateEstimatedTime();
    document.getElementById('auditCountInput').addEventListener('input', updateEstimatedTime);

    modal.style.display = 'flex';
}

function closeAuditModal() {
    document.getElementById('auditModal').style.display = 'none';
}

function handleAuditModalClick(event) {
    if (event.target.classList.contains('modal') || event.target.classList.contains('modal-overlay')) {
        closeAuditModal();
    }
}

function updateEstimatedTime() {
    const count = parseInt(document.getElementById('auditCountInput').value) || 0;
    const delayPerUser = getRequestDelay() / 1000;
    const totalSeconds = count * delayPerUser;

    let timeStr;
    if (totalSeconds < 60) {
        timeStr = `${Math.round(totalSeconds)} 秒`;
    } else if (totalSeconds < 3600) {
        const mins = Math.ceil(totalSeconds / 60);
        timeStr = `约 ${mins} 分钟`;
    } else {
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.ceil((totalSeconds % 3600) / 60);
        timeStr = `约 ${hours} 小时 ${mins} 分钟`;
    }

    document.getElementById('estimatedTime').textContent = timeStr;

    // Also update the count display
    const countDisplay = document.getElementById('auditCountDisplay');
    if (countDisplay) {
        countDisplay.textContent = count;
    }
}

function startAuditWithCount() {
    const count = parseInt(document.getElementById('auditCountInput').value) || 5;
    const startIndex = (parseInt(document.getElementById('auditStartInput').value) || 1) - 1;

    if (count < 1 || count > 100) {
        showToast('审核数量必须在 1-100 之间', 'error');
        return;
    }

    if (startIndex < 0 || startIndex >= tableData.length) {
        showToast('起始位置无效', 'error');
        return;
    }

    closeAuditModal();
    startAudit(startIndex, count);
}

// ========================================
// Twitter API Integration
// ========================================

async function startAudit(startIndex = 0, maxCount = null) {
    const progressContainer = document.getElementById('progressContainer');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressPercent = document.getElementById('progressPercent');

    progressContainer.style.display = 'block';

    let completed = 0;
    const endIndex = maxCount !== null
        ? Math.min(startIndex + maxCount, tableData.length)
        : tableData.length;
    const total = endIndex - startIndex;

    for (let i = startIndex; i < endIndex; i++) {
        const row = tableData[i];

        row.status = 'loading';
        renderTable();

        progressText.textContent = `正在审核 @${row.handle}... (${completed + 1}/${total})`;

        try {
            await fetchTwitterUserData(row);
            row.status = 'success';
        } catch (error) {
            console.error(`Error auditing ${row.handle}:`, error);
            row.status = 'error';
            row.error = error.message;
        }

        completed++;
        const percent = Math.round((completed / total) * 100);
        progressFill.style.width = `${percent}%`;
        progressPercent.textContent = `${percent}%`;

        renderTable();

        if (i < endIndex - 1) {
            await sleep(getRequestDelay());
        }
    }

    progressText.textContent = `审核完成！已审核 ${completed} 条记录`;

    setTimeout(() => {
        progressContainer.style.display = 'none';
    }, 3000);
}

async function fetchTwitterUserData(row) {
    if (!row.handle) {
        throw new Error('无效的 Handle');
    }

    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('请先配置 API Key');
    }

    const cleanedHandle = row.handle.replace(/^@/, '');
    const apiUrl = `http://localhost:3000/api/user/${encodeURIComponent(cleanedHandle)}`;

    console.log(`Fetching @${cleanedHandle}...`);

    // Retry logic for rate limiting
    let retries = 0;
    const maxRetries = 2;

    while (retries <= maxRetries) {
        try {
            const response = await fetch(apiUrl, {
                headers: {
                    'X-Twitter-Bearer-Token': apiKey
                }
            });
            const result = await response.json();

            if (response.status === 429) {
                // Rate limited - wait and retry
                retries++;
                if (retries <= maxRetries) {
                    console.log(`Rate limited, waiting 60s before retry ${retries}/${maxRetries}...`);
                    showToast(`速率限制，等待 60 秒后重试...`, 'warning');
                    await sleep(60000); // Wait 60 seconds
                    continue;
                } else {
                    throw new Error('API 速率限制，请稍后再试');
                }
            }

            if (!response.ok) {
                // Check for specific error types
                if (response.status === 401) {
                    throw new Error('API Key 无效或已过期');
                }
                throw new Error(result.error || result.message || `HTTP ${response.status}`);
            }

            if (!result.success) {
                // User might not exist
                if (result.error && result.error.includes('not found')) {
                    throw new Error('用户不存在');
                }
                throw new Error(result.error || '未知错误');
            }

            const user = result.user;
            row.followers = user.followers_count || 0;
            row.description = user.description || '';
            row.tweets = result.tweets || [];

            // Check for keywords
            const keywords = getKeywords();
            const allText = [row.description, ...row.tweets].join(' ');
            row.aiKeywords = keywords.filter(keyword =>
                allText.toLowerCase().includes(keyword.toLowerCase())
            );
            row.aiDetected = row.aiKeywords.length > 0;

            console.log(`@${cleanedHandle}: ${row.followers} followers, keywords: ${row.aiKeywords.length}`);
            return; // Success!

        } catch (error) {
            if (retries < maxRetries && error.message.includes('速率限制')) {
                retries++;
                continue;
            }
            throw error;
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// User Details Modal
// ========================================

function showUserDetails(row) {
    const modal = document.getElementById('userModal');
    const title = document.getElementById('userModalTitle');
    const body = document.getElementById('userModalBody');

    title.textContent = `@${row.handle}`;

    // Check where keywords were found
    const bioKeywords = row.aiKeywords.filter(kw =>
        row.description && row.description.toLowerCase().includes(kw.toLowerCase())
    );
    const tweetKeywords = row.aiKeywords.filter(kw =>
        row.tweets.some(t => t.toLowerCase().includes(kw.toLowerCase()))
    );

    body.innerHTML = `
        <div class="user-profile">
            <div class="user-avatar">${row.handle.charAt(0).toUpperCase()}</div>
            <div class="user-info">
                <h4>@${escapeHtml(row.handle)}</h4>
                <p>${row.description ? highlightKeywords(escapeHtml(row.description)) : '暂无简介'}</p>
            </div>
        </div>
        
        <div class="user-stats">
            <div class="stat-card">
                <div class="stat-value">${formatNumber(row.followers)}</div>
                <div class="stat-label">粉丝数</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${row.tweets.length}</div>
                <div class="stat-label">推文</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${row.aiKeywords.length}</div>
                <div class="stat-label">关键词</div>
            </div>
        </div>
        
        ${row.aiKeywords.length > 0 ? `
            <div class="keywords-section">
                <h5>检测到的关键词</h5>
                <div class="keywords-list">
                    ${row.aiKeywords.map(kw => {
        const inBio = row.description && row.description.toLowerCase().includes(kw.toLowerCase());
        const inTweets = row.tweets.some(t => t.toLowerCase().includes(kw.toLowerCase()));
        const source = inBio && inTweets ? '简介+推文' : inBio ? '简介' : '推文';
        return `<span class="tag tag-ai" title="来源: ${source}">${escapeHtml(kw)}</span>`;
    }).join('')}
                </div>
                <p class="text-muted" style="margin-top: 8px; font-size: 0.8rem;">
                    💡 关键词来源: ${bioKeywords.length > 0 ? `简介(${bioKeywords.length})` : ''}${bioKeywords.length > 0 && tweetKeywords.length > 0 ? ' + ' : ''}${tweetKeywords.length > 0 ? `推文(${tweetKeywords.length})` : ''}
                </p>
            </div>
        ` : ''}
        
        <div class="tweets-section">
            <h5>最近推文 ${row.tweets.length === 0 ? '<span class="text-muted" style="font-weight: normal;">(API限制可能导致获取失败)</span>' : ''}</h5>
            ${row.tweets.length > 0 ? row.tweets.map(tweet => `
                <div class="tweet-item">${highlightKeywords(escapeHtml(tweet))}</div>
            `).join('') : '<p class="text-muted">暂无推文数据</p>'}
        </div>
        
        <a href="${row.link}" target="_blank" rel="noopener" class="btn btn-primary" style="width: 100%; margin-top: 16px;">
            查看 Twitter 主页 →
        </a>
    `;

    modal.style.display = 'flex';
}

function highlightKeywords(text) {
    let result = text;
    const keywords = getKeywords();
    keywords.forEach(keyword => {
        const regex = new RegExp(`(${keyword})`, 'gi');
        result = result.replace(regex, '<mark>$1</mark>');
    });
    return result;
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
}

function handleUserModalClick(event) {
    if (event.target.classList.contains('modal') || event.target.classList.contains('modal-overlay')) {
        closeUserModal();
    }
}

// ========================================
// Excel Export
// ========================================

function exportExcel() {
    if (tableData.length === 0) {
        showToast('没有数据可导出', 'error');
        return;
    }

    const exportData = tableData.map((row, idx) => ({
        '序号': idx + 1,
        'Handle': '@' + row.handle,
        '链接': row.link,
        '粉丝数': row.followers,
        '关键词数量': row.aiKeywords.length,
        '检测到的关键词': row.aiKeywords.join(', '),
        '状态': row.status === 'success' ? '完成' : row.status === 'error' ? '失败' : '待审核'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Twitter Audit');

    const filename = `twitter_audit_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, filename);

    showToast(`已导出 ${tableData.length} 条记录`, 'success');
}

// ========================================
// Keyboard Shortcuts
// ========================================

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeUserModal();
        closeAuditModal();
        closeSettingsModal();
    }
});

// ========================================
// Initialize
// ========================================

console.log('Twitter Audit Tool initialized');
console.log('API Key:', getApiKey() ? 'Configured' : 'Not configured');
console.log('Keywords:', getKeywords().length, 'configured');
