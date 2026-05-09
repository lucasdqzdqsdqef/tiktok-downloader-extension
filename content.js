function injectButton() {
  const likeButtons = document.querySelectorAll('[data-e2e="like-icon"], [data-e2e="like-stat"], [data-e2e="browser-like"], [data-e2e="browse-like-icon"]');
  
  likeButtons.forEach(likeBtn => {
      // Find the "Like" item wrapper (stops when parent has multiple sibling buttons)
      let likeWrapper = likeBtn;
      while (likeWrapper.parentElement && likeWrapper.parentElement.children.length < 3 && likeWrapper.parentElement.tagName !== 'BODY') {
          likeWrapper = likeWrapper.parentElement;
      }
      
      const actionBar = likeWrapper.parentElement;
      if (!actionBar) return;
      
      // If we already injected for this action bar, skip
      if (actionBar.querySelector('.tt-download-container') || (actionBar.parentNode && actionBar.parentNode.querySelector('.tt-download-container'))) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'tt-download-container';
      wrapper.setAttribute('data-position', 'dropdown'); // default

      const btn = document.createElement('button');
      btn.className = 'tt-download-btn';
      btn.title = 'Download Video';
      let logoUrl = '';
      try {
          logoUrl = chrome.runtime.getURL('ext_logo_sq.png');
      } catch (e) {}
      btn.innerHTML = `<img src="${logoUrl}" style="width: 100%; height: 100%; border-radius: 12px; pointer-events: none;">`;

      const menu = document.createElement('div');
      menu.className = 'tt-download-menu';

      const mp4Btn = document.createElement('button');
      mp4Btn.className = 'tt-menu-item';
      mp4Btn.innerText = 'Download MP4 (Max Quality)';

      const mp3Btn = document.createElement('button');
      mp3Btn.className = 'tt-menu-item';
      mp3Btn.innerText = 'Download MP3 (Audio)';

      menu.appendChild(mp4Btn);
      menu.appendChild(mp3Btn);
      wrapper.appendChild(btn);
      wrapper.appendChild(menu);

      // Find avatar to inject above it if possible
      let avatarWrapper = null;
      const links = actionBar.querySelectorAll('a[href*="/@"]');
      for (let link of links) {
          if (link.querySelector('img')) {
              avatarWrapper = link;
              break;
          }
      }
      
      // Sometimes avatar is a previous sibling to the action bar
      if (!avatarWrapper && actionBar.previousElementSibling && actionBar.previousElementSibling.querySelector('a[href*="/@"] img')) {
          avatarWrapper = actionBar.previousElementSibling;
      }

      if (avatarWrapper && avatarWrapper.parentNode) {
          avatarWrapper.parentNode.insertBefore(wrapper, avatarWrapper);
      } else {
          // Horizontal modal row -> insert before Like button
          wrapper.style.marginRight = '12px';
          wrapper.style.marginBottom = '0';
          likeWrapper.parentNode.insertBefore(wrapper, likeWrapper);
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Dynamically determine menu vertical position based on screen space
        const rect = btn.getBoundingClientRect();
        if (window.innerHeight - rect.bottom < 150) {
            // Button is near the bottom of screen -> Pop up
            wrapper.setAttribute('data-position', 'up');
        } else {
            // Space below -> Drop down
            wrapper.setAttribute('data-position', 'down');
        }

        // Hide other open menus
        document.querySelectorAll('.tt-download-menu.show').forEach(m => {
            if (m !== menu) m.classList.remove('show');
        });
        menu.classList.toggle('show');
      });

    const handleDownload = async (type) => {
      mp4Btn.classList.add('loading');
      mp3Btn.classList.add('loading');
      
      if (type === 'mp4') mp4Btn.innerText = 'Fetching...';
      else mp3Btn.innerText = 'Fetching...';
      
      try {
        let videoUrl = window.location.href;
        
        // If the current URL is not a direct video link (e.g. we are on the homepage feed)
        if (!videoUrl.includes('/video/')) {
            // Find the closest video container
            const videoElement = actionBar.closest('div[data-e2e="recommend-list-item-container"], div[class*="DivItemContainer"]');
            if (videoElement) {
                const parentLink = videoElement.querySelector('a[href*="/video/"]');
                if (parentLink && parentLink.href) {
                   videoUrl = parentLink.href;
                }
            }
        }
        
        // Strip query parameters
        videoUrl = videoUrl.split('?')[0];

        chrome.runtime.sendMessage({
          action: 'download',
          url: videoUrl,
          type: type
        }, (response) => {
           if(response && response.success) {
               if (type === 'mp4') mp4Btn.innerText = 'Started!';
               else mp3Btn.innerText = 'Started!';
           } else {
               if (type === 'mp4') mp4Btn.innerText = 'Failed';
               else mp3Btn.innerText = 'Failed';
               console.error(response ? response.error : 'Unknown error');
           }
           setTimeout(() => {
               menu.classList.remove('show');
               mp4Btn.classList.remove('loading');
               mp3Btn.classList.remove('loading');
               mp4Btn.innerText = 'Download MP4 (Max Quality)';
               mp3Btn.innerText = 'Download MP3 (Audio)';
           }, 2500);
        });

      } catch (err) {
        console.error(err);
      }
    };

    mp4Btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); handleDownload('mp4'); });
    mp3Btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); handleDownload('mp3'); });
  });
}

// Observe DOM for new videos (infinite scroll and modal opens)
const observer = new MutationObserver(() => {
  injectButton();
});

observer.observe(document.body, { childList: true, subtree: true });
setTimeout(injectButton, 2000);

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.tt-download-container')) {
        document.querySelectorAll('.tt-download-menu.show').forEach(m => m.classList.remove('show'));
    }
});
