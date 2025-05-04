// content.js

// This script analyzes the page for videos and communicates with the popup
(() => {
  
  // Add console logging to help debug
  console.log('Video Downloader Pro: Content script loaded');
  
  // Function to analyze video elements
  function analyzeVideoElements() {
    console.log('Video Downloader Pro: Analyzing page for videos');
    const videos = [];
    const videoElements = document.querySelectorAll('video');
    
    console.log(`Video Downloader Pro: Found ${videoElements.length} video elements`);
    
    videoElements.forEach((video, index) => {
      // Skip videos with no source
      if (!video.src && video.querySelectorAll('source').length === 0) {
        console.log(`Video Downloader Pro: Skipping video ${index} (no source)`);
        return;
      }
      
      // Basic information about the video
      const videoInfo = {
        id: 'video_' + index,
        type: 'html5',
        src: video.src || video.querySelector('source')?.src || '',
        title: video.title || document.title || 'Video ' + (index + 1),
        duration: video.duration || 0,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        qualities: []
      };
      
      console.log(`Video Downloader Pro: Found video with source: ${videoInfo.src}`);
      
      // Try to get thumbnail
      if (video.poster) {
        videoInfo.thumbnail = video.poster;
      }
      
      // Get sources for different qualities
      const sources = video.querySelectorAll('source');
      if (sources.length > 0) {
        sources.forEach(source => {
          const label = source.dataset.quality || source.title || extractResolutionFromSrc(source.src);
          videoInfo.qualities.push({
            url: source.src,
            label: label || 'Default',
            type: source.type || 'video/mp4',
            size: 'Unknown'
          });
        });
      } else if (video.src) {
        // If no sources but has src
        videoInfo.qualities.push({
          url: video.src,
          label: extractResolutionFromSrc(video.src) || 'Default',
          type: video.srcObject ? 'stream' : determineTypeFromSrc(video.src),
          size: 'Unknown'
        });
      }
      
      videos.push(videoInfo);
    });
    
    // Analyze HLS (m3u8) and DASH (mpd) videos
    analyzeHlsAndDashVideos(videos);
    
    // Analyze embedded players
    analyzeEmbeddedPlayers(videos);
    
    console.log(`Video Downloader Pro: Total videos found: ${videos.length}`);
    return videos;
  }
  
  // Function to analyze HLS and DASH video formats
  function analyzeHlsAndDashVideos(videosArray) {
    // Look for HLS (m3u8) links in the page
    const hlsRegex = /\.m3u8(\?[^"'\s]*)?["'\s]/g;
    const dashRegex = /\.mpd(\?[^"'\s]*)?["'\s]/g;
    
    // Check page source for HLS and DASH links
    const pageSource = document.documentElement.outerHTML;
    let match;
    
    // Find HLS streams
    while ((match = hlsRegex.exec(pageSource)) !== null) {
      const url = extractUrlFromMatch(match[0], pageSource, match.index);
      if (url && isValidUrl(url) && !isAlreadyAdded(videosArray, url)) {
        console.log(`Video Downloader Pro: Found HLS stream: ${url}`);
        videosArray.push({
          id: 'hls_' + videosArray.length,
          type: 'hls',
          src: url,
          title: document.title || 'HLS Stream',
          thumbnail: '',
          qualities: [{
            url: url,
            label: 'Auto (HLS)',
            type: 'application/x-mpegURL',
            size: 'Varies'
          }]
        });
      }
    }

    
    // Find DASH streams
    while ((match = dashRegex.exec(pageSource)) !== null) {
      const url = extractUrlFromMatch(match[0], pageSource, match.index);
      if (url && isValidUrl(url) && !isAlreadyAdded(videosArray, url)) {
        console.log(`Video Downloader Pro: Found DASH stream: ${url}`);
        videosArray.push({
          id: 'dash_' + videosArray.length,
          type: 'dash',
          src: url,
          title: document.title || 'DASH Stream',
          thumbnail: '',
          qualities: [{
            url: url,
            label: 'Auto (DASH)',
            type: 'application/dash+xml',
            size: 'Varies'
          }]
        });
      }
    }
  }
  
  // Function to analyze embedded video players
  function analyzeEmbeddedPlayers(videosArray) {
    // YouTube embeds
    const youtubeEmbeds = document.querySelectorAll('iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]');
    youtubeEmbeds.forEach((embed, index) => {
      const src = embed.src;
      const videoIdMatch = src.match(/\/embed\/([\w-]+)/);
      
      if (videoIdMatch && videoIdMatch[1]) {
        const videoId = videoIdMatch[1];
        const title = embed.title || document.title || 'YouTube Video';
        const thumbnail = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
        
        console.log(`Video Downloader Pro: Found YouTube embed: ${videoId}`);
        
        videosArray.push({
          id: 'youtube_' + index,
          type: 'youtube',
          src: src,
          videoId: videoId,
          title: title,
          thumbnail: thumbnail,
          qualities: [
            { label: '720p', type: 'video/mp4', size: '~18MB' },
            { label: '480p', type: 'video/mp4', size: '~12MB' },
            { label: '360p', type: 'video/mp4', size: '~8MB' }
          ]
        });
      }
    });
    
    // Vimeo embeds
    const vimeoEmbeds = document.querySelectorAll('iframe[src*="player.vimeo.com/video"]');
    vimeoEmbeds.forEach((embed, index) => {
      const src = embed.src;
      const videoIdMatch = src.match(/\/video\/(\d+)/);
      
      if (videoIdMatch && videoIdMatch[1]) {
        const videoId = videoIdMatch[1];
        const title = embed.title || document.title || 'Vimeo Video';
        
        console.log(`Video Downloader Pro: Found Vimeo embed: ${videoId}`);
        
        videosArray.push({
          id: 'vimeo_' + index,
          type: 'vimeo',
          src: src,
          videoId: videoId,
          title: title,
          thumbnail: '',
          qualities: [
            { label: 'HD', type: 'video/mp4', size: 'Varies' },
            { label: 'SD', type: 'video/mp4', size: 'Varies' }
          ]
        });
      }
    });
    
    // Facebook embeds
    const fbEmbeds = document.querySelectorAll('iframe[src*="facebook.com/plugins/video"]');
    fbEmbeds.forEach((embed, index) => {
      console.log(`Video Downloader Pro: Found Facebook embed`);
      
      videosArray.push({
        id: 'facebook_' + index,
        type: 'facebook',
        src: embed.src,
        title: embed.title || document.title || 'Facebook Video',
        thumbnail: '',
        qualities: [
          { label: 'HD', type: 'video/mp4', size: 'Varies' },
          { label: 'SD', type: 'video/mp4', size: 'Varies' }
        ]
      });
    });
  }
  
  // Helper function to extract URL from a match
  function extractUrlFromMatch(matchString, fullText, matchIndex) {
    // Look back for the beginning of the URL
    let startIndex = matchIndex;
    while (startIndex > 0 && !/["'\s()]/.test(fullText[startIndex - 1])) {
      startIndex--;
    }
    
    // Extract the URL
    const url = fullText.substring(startIndex, matchIndex + matchString.length - 1);
    return makeAbsoluteUrl(url.trim());
  }
  
  // Helper function to make relative URLs absolute
  function makeAbsoluteUrl(url) {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    
    // Handle protocol-relative URLs
    if (url.startsWith('//')) {
      return window.location.protocol + url;
    }
    
    // Handle relative URLs
    const base = window.location.origin;
    if (url.startsWith('/')) {
      return base + url;
    } else {
      const path = window.location.pathname.split('/').slice(0, -1).join('/') + '/';
      return base + path + url;
    }
  }
  
  // Helper function to check if URL is valid
  function isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // Helper function to check if a video is already in the array
  function isAlreadyAdded(videosArray, url) {
    return videosArray.some(video => 
      video.src === url || 
      video.qualities.some(quality => quality.url === url)
    );
  }
  
  // Helper function to extract resolution from src
  function extractResolutionFromSrc(src) {
    const resolutionMatch = src.match(/(\d+)p/);
    if (resolutionMatch) {
      return resolutionMatch[1] + 'p';
    }
    return null;
  }
  
  // Helper function to determine video type from src
  function determineTypeFromSrc(src) {
    if (src.includes('.mp4')) return 'video/mp4';
    if (src.includes('.webm')) return 'video/webm';
    if (src.includes('.ogg') || src.includes('.ogv')) return 'video/ogg';
    if (src.includes('.m3u8')) return 'application/x-mpegURL';
    if (src.includes('.mpd')) return 'application/dash+xml';
    return 'video/mp4'; // Default
  }
  
  // Function to create a video thumbnail from a video element
  function createVideoThumbnail(videoElement) {
    return new Promise((resolve, reject) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = videoElement.videoWidth;
        canvas.height = videoElement.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.7);
        resolve(thumbnailUrl);
      } catch (error) {
        reject(error);
      }
    });
  }
  
  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(`Video Downloader Pro: Received message with action: ${request.action}`);
    
    if (request.action === 'getVideos') {
      try {
        const videos = analyzeVideoElements();
        console.log(`Video Downloader Pro: Sending ${videos.length} videos to popup`);
        sendResponse({ success: true, videos: videos });
      } catch (error) {
        console.error('Video Downloader Pro: Error analyzing videos', error);
        sendResponse({ success: false, error: error.message });
      }
      return true; // Keep the message channel open for asynchronous response
    } else if (request.action === 'getVideoThumbnail') {
      const videoElements = document.querySelectorAll('video');
      let targetVideo = null;
      
      for (let i = 0; i < videoElements.length; i++) {
        const video = videoElements[i];
        if ((video.src && video.src === request.src) || 
            (video.querySelector('source') && video.querySelector('source').src === request.src)) {
          targetVideo = video;
          break;
        }
      }
      
      if (targetVideo) {
        createVideoThumbnail(targetVideo)
          .then(thumbnail => {
            sendResponse({ success: true, thumbnail: thumbnail });
          })
          .catch(error => {
            sendResponse({ success: false, error: error.message });
          });
        return true; // Indicates async response
      } else {
        sendResponse({ success: false, error: 'Video element not found' });
      }
    }
    
    return true; // Keep the message channel open
  });
  
  // Let the extension know that the content script is loaded
  console.log('Video Downloader Pro: Content script fully initialized');
})();
