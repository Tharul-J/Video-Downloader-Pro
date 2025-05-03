# 📥 Clip X – Web Video Downloader Extension

**Clip X** is a lightweight browser extension designed to detect and download videos from various websites, offering users multiple quality options. It provides a clean and intuitive experience for downloading video content directly from the browser.

---

## 🚀 Features

- **Automatic Video Detection**  
  Detects video elements embedded on any webpage.

- **Multiple Quality Options**  
  Offers available video resolutions such as 1080p, 720p, 480p, etc., for user selection.

- **One-Click Download**  
  Allows users to download their preferred video quality with a single click.

- **Supports Various Sites**  
  Works on many websites that use HTML5 or embedded video players.

---

## 🛠️ How It Works

1. The extension scans the current webpage for video content.
2. If a video is found, the Clip X icon becomes active.
3. Clicking the icon opens a popup with available quality options.
4. User selects a resolution and downloads the video.

---

## 📁 Project Structure

clip-x-extension/
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── style.css
└── icons/
└── clipx-icon.png





---

## 📦 Installation (Developer Mode)


1. Download or clone this repository.
2. Open Chrome and go to `chrome://extensions/`.
3. Enable **Developer Mode** in the top-right corner.
4. Click **Load unpacked** and select the `clip-x-extension` folder.

---

## 📄 `manifest.json` Highlights

```json
{
  "manifest_version": 3,
  "name": "Clip X - Video Downloader",
  "version": "1.0",
  "description": "Download videos from any website with multiple quality options.",
  "permissions": ["downloads", "scripting", "activeTab"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": "icons/clipx-icon.png"
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"]
    }
  ]
}


-----------

🧠 Tech Stack
Frontend: HTML, CSS, JavaScript

Browser APIs: Chrome Extensions API, Downloads API

⚠️ Disclaimer
This extension is intended for educational and personal use. Downloading copyrighted or protected content may violate the terms of service of websites. Use responsibly.

🙌 Contributions
Contributions are welcome! Feel free to fork the project and submit a pull request or open an issue with your suggestions.
