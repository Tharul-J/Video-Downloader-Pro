// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractVideoUrl') {
    // Process different video platforms
    if (request.videoType === 'youtube') {
      extractYouTubeUrl(request.videoId, request.qualityLabel)
        .then(url => sendResponse({ success: true, directUrl: url }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Async response
    } else if (request.videoType === 'vimeo') {
      extractVimeoUrl(request.videoId, request.qualityLabel)
        .then(url => sendResponse({ success: true, directUrl: url }))
        .catch(error => sendResponse({ success: false, error: error.message }));
      return true; // Async response
    } else {
      sendResponse({ success: false, error: 'Unsupported video type' });
    }
  }
});

// Function to extract direct URL from YouTube video ID
async function extractYouTubeUrl(videoId, qualityLabel) {
  // For Chrome extensions, we can use a redirect to youtube-dl websites that handle this
  // This is a simplified approach that works for demonstration purposes
  const redirectUrl = `https://www.y2mate.com/youtube/${videoId}`;
  return redirectUrl;
}

// Function to extract direct URL from Vimeo video ID
async function extractVimeoUrl(videoId, qualityLabel) {
  // For Chrome extensions, we can use a redirect to vimeo download services
  // This is a simplified approach that works for demonstration purposes
  const redirectUrl = `https://www.savethevideo.com/vimeo?url=https://vimeo.com/${videoId}`;
  return redirectUrl;
}

// Helper function for file name formatting based on quality selection
function getFileExtension(mimeType) {
  if (mimeType.includes('mp4')) return '.mp4';
  if (mimeType.includes('webm')) return '.webm';
  if (mimeType.includes('ogg')) return '.ogg';
  // Default to mp4 for unknown types
  return '.mp4';
}

// Helper function to sanitize file names
function sanitizeFileName(name) {
  return name.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 100);
}