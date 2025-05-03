// popup.js

document.addEventListener('DOMContentLoaded', () => {
  const scanningEl = document.getElementById('scanning');
  const noVideosEl = document.getElementById('no-videos');
  const videosContainerEl = document.getElementById('videos-container');
  const videosListEl = document.getElementById('videos-list');
  const qualitySelectorEl = document.getElementById('quality-selector');
  const qualityOptionsEl = document.getElementById('quality-options');
  const previewThumbnailEl = document.getElementById('preview-thumbnail');
  const previewInfoEl = document.getElementById('preview-info');
  const downloadStatusEl = document.getElementById('download-status');
  const progressEl = document.getElementById('progress');
  const progressTextEl = document.getElementById('progress-text');
  const downloadMessageEl = document.getElementById('download-message');
  
  let selectedVideo = null;
  let selectedQuality = null;
  
  // Initialize by scanning for videos
  scanForVideos();
  
  // Button event listeners
  document.getElementById('rescan-btn').addEventListener('click', scanForVideos);
  document.getElementById('refresh-btn').addEventListener('click', scanForVideos);
  document.getElementById('back-btn').addEventListener('click', showVideosList);
  document.getElementById('download-btn').addEventListener('click', startDownload);
  document.getElementById('done-btn').addEventListener('click', showVideosList);
  
  // Function to scan for videos on the current page
  function scanForVideos() {
    showElement(scanningEl);
    hideElement(noVideosEl);
    hideElement(videosContainerEl);
    hideElement(qualitySelectorEl);
    hideElement(downloadStatusEl);
    
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const currentTab = tabs[0];
      
      chrome.tabs.sendMessage(currentTab.id, { action: 'getVideos' }, response => {
        if (chrome.runtime.lastError) {
          console.log('Content script not loaded, injecting it now');
          // Content script not loaded yet, inject it
          chrome.scripting.executeScript({
            target: { tabId: currentTab.id },
            files: ['content.js']
          }).then(() => {
            // Try again after content script is loaded
            setTimeout(() => {
              chrome.tabs.sendMessage(currentTab.id, { action: 'getVideos' }, response => {
                handleVideosResponse(response);
              });
            }, 1000); // Increased timeout for script initialization
          }).catch(err => {
            console.error('Failed to inject content script:', err);
            showNoVideosFound('Could not analyze page. Try refreshing the page first.');
          });
        } else {
          handleVideosResponse(response);
        }
      });
    });
    
    // Fallback timeout in case of communication failure
    setTimeout(() => {
      if (scanningEl.style.display !== 'none') {
        showNoVideosFound('Scan timed out. Try refreshing the page.');
      }
    }, 10000);
  }
  
  // Function to handle the response from content script
  function handleVideosResponse(response) {
    hideElement(scanningEl);
    
    if (response && response.success && response.videos && response.videos.length > 0) {
      displayVideos(response.videos);
    } else {
      showNoVideosFound();
    }
  }
  
  // Function to show no videos found message
  function showNoVideosFound(message = 'No videos found on this page.') {
    document.querySelector('#no-videos p').textContent = message;
    showElement(noVideosEl);
  }
  
  // Function to display videos in the popup
  function displayVideos(videos) {
    videosListEl.innerHTML = '';
    
    videos.forEach(video => {
      const videoEl = document.createElement('div');
      videoEl.className = 'video-item';
      videoEl.dataset.videoId = video.id;
      
      const thumbnailEl = document.createElement('div');
      thumbnailEl.className = 'video-thumbnail';
      if (video.thumbnail) {
        thumbnailEl.style.backgroundImage = `url('${video.thumbnail}')`;
      }
      
      const infoEl = document.createElement('div');
      infoEl.className = 'video-info';
      
      const titleEl = document.createElement('div');
      titleEl.className = 'video-title';
      titleEl.textContent = video.title;
      
      const metaEl = document.createElement('div');
      metaEl.className = 'video-meta';
      
      let metaText = video.type.toUpperCase();
      if (video.duration) {
        metaText += ` • ${formatDuration(video.duration)}`;
      }
      if (video.width && video.height) {
        metaText += ` • ${video.width}x${video.height}`;
      }
      
      metaEl.textContent = metaText;
      
      infoEl.appendChild(titleEl);
      infoEl.appendChild(metaEl);
      
      videoEl.appendChild(thumbnailEl);
      videoEl.appendChild(infoEl);
      
      videoEl.addEventListener('click', () => {
        selectedVideo = video;
        showQualitySelector(video);
      });
      
      videosListEl.appendChild(videoEl);
    });
    
    showElement(videosContainerEl);
  }
  
  // Function to show quality selector for a video
  function showQualitySelector(video) {
    hideElement(videosContainerEl);
    showElement(qualitySelectorEl);
    
    // Display video info in preview
    if (video.thumbnail) {
      previewThumbnailEl.style.backgroundImage = `url('${video.thumbnail}')`;
    } else {
      previewThumbnailEl.style.backgroundImage = '';
      previewThumbnailEl.style.backgroundColor = '#eee';
    }
    
    previewInfoEl.innerHTML = `
      <div class="video-title">${video.title}</div>
      <div class="video-meta">${video.type.toUpperCase()}${video.duration ? ' • ' + formatDuration(video.duration) : ''}</div>
    `;
    
    // Display quality options
    qualityOptionsEl.innerHTML = '';
    
    if (video.qualities.length === 0) {
      // Default quality option if none available
      video.qualities = [{
        url: video.src,
        label: 'Default',
        type: 'video/mp4',
        size: 'Unknown'
      }];
    }
    
    video.qualities.forEach((quality, index) => {
      const optionEl = document.createElement('div');
      optionEl.className = 'quality-option';
      optionEl.dataset.index = index;
      
      optionEl.innerHTML = `
        <div class="quality-name">${quality.label}</div>
        <div class="quality-info">${quality.type.split('/')[1]} • ${quality.size}</div>
      `;
      
      optionEl.addEventListener('click', () => {
        document.querySelectorAll('.quality-option').forEach(el => {
          el.classList.remove('selected');
        });
        optionEl.classList.add('selected');
        selectedQuality = index;
      });
      
      qualityOptionsEl.appendChild(optionEl);
      
      // Select the first quality by default
      if (index === 0) {
        optionEl.classList.add('selected');
        selectedQuality = 0;
      }
    });
  }
  
  // Function to start download process
  function startDownload() {
    if (!selectedVideo || selectedQuality === null) return;
    
    hideElement(qualitySelectorEl);
    showElement(downloadStatusEl);
    
    const quality = selectedVideo.qualities[selectedQuality];
    const videoUrl = quality.url;
    let fileName = sanitizeFileName(selectedVideo.title) + getFileExtension(quality.type);
    
    if (selectedVideo.type === 'youtube' || selectedVideo.type === 'vimeo') {
      // For YouTube and Vimeo, we need to use the background script to get the direct download URL
      downloadMessageEl.textContent = 'Extracting video URL...';
      
      chrome.runtime.sendMessage({
        action: 'extractVideoUrl',
        videoType: selectedVideo.type,
        videoId: selectedVideo.videoId,
        qualityLabel: quality.label
      }, response => {
        if (response && response.success) {
          initiateDownload(response.directUrl, fileName);
        } else {
          downloadFailed(response && response.error ? response.error : 'Failed to extract download URL');
        }
      });
    } else {
      // For direct videos, download directly
      initiateDownload(videoUrl, fileName);
    }
  }
  
  // Function to initiate download with chrome.downloads API
  function initiateDownload(url, fileName) {
    if (!url) {
      downloadFailed('Invalid download URL');
      return;
    }
    
    chrome.downloads.download({
      url: url,
      filename: fileName,
      saveAs: true
    }, downloadId => {
      if (chrome.runtime.lastError || downloadId === undefined) {
        downloadFailed(chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Download failed to start');
      } else {
        trackDownloadProgress(downloadId);
      }
    });
  }
  
  // Function to track download progress
  function trackDownloadProgress(downloadId) {
    let downloadListener = chrome.downloads.onChanged.addListener(delta => {
      if (delta.id !== downloadId) return;
      
      if (delta.state) {
        if (delta.state.current === 'complete') {
          updateProgress(100);
          downloadMessageEl.textContent = 'Download completed successfully!';
          chrome.downloads.onChanged.removeListener(downloadListener);
        } else if (delta.state.current === 'interrupted') {
          downloadFailed('Download was interrupted');
          chrome.downloads.onChanged.removeListener(downloadListener);
        }
      }
      
      if (delta.bytesReceived && delta.totalBytes) {
        const percent = Math.round((delta.bytesReceived.current / delta.totalBytes.current) * 100);
        updateProgress(percent);
      }
    });
    
    // Initial message
    downloadMessageEl.textContent = 'Downloading video...';
    
    // If we have no progress after 5 seconds, show an alternate message
    setTimeout(() => {
      if (parseInt(progressTextEl.textContent) === 0) {
        downloadMessageEl.textContent = 'Download started in your browser. Check your downloads folder.';
        updateProgress(100);
      }
    }, 5000);
  }
  
  // Function to update progress UI
  function updateProgress(percent) {
    progressEl.style.width = `${percent}%`;
    progressTextEl.textContent = `${percent}%`;
  }
  
  // Function to handle download failures
  function downloadFailed(message) {
    updateProgress(0);
    downloadMessageEl.textContent = `Error: ${message}`;
  }
  
  // Function to show videos list UI state
  function showVideosList() {
    hideElement(qualitySelectorEl);
    hideElement(downloadStatusEl);
    showElement(videosContainerEl);
    
    // Reset progress
    updateProgress(0);
  }
  
  // Helper function to show an element
  function showElement(element) {
    element.style.display = 'block';
  }
  
  // Helper function to hide an element
  function hideElement(element) {
    element.style.display = 'none';
  }
  
  // Helper function to format duration
  function formatDuration(seconds) {
    if (!seconds || isNaN(seconds) || seconds === Infinity) return '';
    
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  }
  
  // Helper function to sanitize file names
  function sanitizeFileName(name) {
    return name.replace(/[\/\\:*?"<>|]/g, '_').substring(0, 100);
  }
  
  // Helper function to get file extension
  function getFileExtension(mimeType) {
    if (mimeType.includes('mp4')) return '.mp4';
    if (mimeType.includes('webm')) return '.webm';
    if (mimeType.includes('ogg')) return '.ogg';
    // Default to mp4 for unknown types
    return '.mp4';
  }
});