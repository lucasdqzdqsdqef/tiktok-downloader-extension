chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'download') {
    handleDownloadRequest(request.url, request.type)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.toString() }));
    return true; // Keep channel open for async response
  }
});

async function handleDownloadRequest(tiktokUrl, type) {
  // Use a public API for watermark-free TikTok download with HD quality
  const apiUrl = `https://www.tikwm.com/api/?url=${encodeURIComponent(tiktokUrl)}&hd=1`;
  
  const response = await fetch(apiUrl);
  const data = await response.json();
  
  if (data.code === 0 && data.data) {
    // Prefer hdplay for MP4 to ensure maximum quality without quality loss
    const mediaUrl = type === 'mp4' ? (data.data.hdplay || data.data.play) : data.data.music;
    const ext = type === 'mp4' ? 'mp4' : 'mp3';
    
    // Get settings
    const settings = await chrome.storage.local.get(['subfolder', 'naming']);
    
    // Parse naming template
    const uploader = data.data.author ? data.data.author.unique_id : 'unknown';
    const id = data.data.id || Date.now();
    
    let filenameTemplate = settings.naming || '{uploader} - {id}';
    let filename = filenameTemplate
      .replace('{uploader}', uploader)
      .replace('{id}', id)
      + '.' + ext;
      
    // Remove invalid characters
    filename = filename.replace(/[<>:"/\\|?*]+/g, '_');
    
    let finalPath = filename;
    if (settings.subfolder) {
        finalPath = settings.subfolder.replace(/\\/g, '/') + '/' + filename;
        if (finalPath.startsWith('/')) finalPath = finalPath.substring(1);
    }
    
    // Perform Download
    chrome.downloads.download({
      url: mediaUrl,
      filename: finalPath,
      saveAs: false
    });
  } else {
    throw new Error(`API Error: ${data.msg || 'Unknown API failure'}`);
  }
}
