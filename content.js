// Helper: create a menu, append it to body, and return it along with its buttons
function createMenu() {
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

    // Append to body so it's completely outside any overflow:hidden containers
    document.body.appendChild(menu);

    return { menu, mp4Btn, mp3Btn };
}

// Helper: position a menu next to a button
function positionMenu(menu, btn) {
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceRight = window.innerWidth - rect.right;

    // Vertical positioning
    if (spaceBelow < 150) {
        menu.style.top = 'auto';
        menu.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    } else {
        menu.style.bottom = 'auto';
        menu.style.top = (rect.bottom + 8) + 'px';
    }

    // Horizontal positioning: prefer right-aligned with button, but don't overflow left
    if (spaceRight < 240) {
        // Button near right edge: align right edge of menu with right edge of button
        menu.style.left = 'auto';
        menu.style.right = (window.innerWidth - rect.right) + 'px';
    } else {
        // Button has space: align left edge of menu with left edge of button
        menu.style.right = 'auto';
        menu.style.left = rect.left + 'px';
    }
}

// Helper: wire up download logic
function wireDownload(menu, mp4Btn, mp3Btn, getVideoUrl) {
    const handleDownload = async (type) => {
        mp4Btn.classList.add('loading');
        mp3Btn.classList.add('loading');

        if (type === 'mp4') mp4Btn.innerText = 'Fetching...';
        else mp3Btn.innerText = 'Fetching...';

        try {
            let videoUrl = getVideoUrl();
            videoUrl = videoUrl.split('?')[0];

            chrome.runtime.sendMessage({
                action: 'download',
                url: videoUrl,
                type: type
            }, (response) => {
                if (response && response.success) {
                    if (type === 'mp4') mp4Btn.innerText = 'Started!';
                    else mp3Btn.innerText = 'Started!';
                } else {
                    if (type === 'mp4') mp4Btn.innerText = 'Failed';
                    else mp3Btn.innerText = 'Failed';
                }
                setTimeout(() => {
                    menu.classList.remove('show');
                    mp4Btn.classList.remove('loading');
                    mp3Btn.classList.remove('loading');
                    mp4Btn.innerText = 'Download MP4 (Max Quality)';
                    mp3Btn.innerText = 'Download MP3 (Audio)';
                }, 2500);
            });
        } catch (err) {}
    };

    mp4Btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); handleDownload('mp4'); });
    mp3Btn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); handleDownload('mp3'); });
}

function injectButton() {
    const likeButtons = document.querySelectorAll('[data-e2e="like-icon"], [data-e2e="like-stat"], [data-e2e="browser-like"], [data-e2e="browse-like-icon"]');

    likeButtons.forEach(likeBtn => {
        let likeWrapper = likeBtn;
        while (likeWrapper.parentElement && likeWrapper.parentElement.children.length < 3 && likeWrapper.parentElement.tagName !== 'BODY') {
            likeWrapper = likeWrapper.parentElement;
        }

        const actionBar = likeWrapper.parentElement;
        if (!actionBar) return;
        if (actionBar.querySelector('.tt-download-container') || (actionBar.parentNode && actionBar.parentNode.querySelector('.tt-download-container'))) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'tt-download-container';

        const btn = document.createElement('button');
        btn.className = 'tt-download-btn';
        btn.title = 'Download Video';
        let logoUrl = '';
        try { logoUrl = chrome.runtime.getURL('ext_logo_sq.png'); } catch (e) {}
        btn.innerHTML = `<img src="${logoUrl}" style="width: 100%; height: 100%; border-radius: 12px; pointer-events: none;">`;

        wrapper.appendChild(btn);

        // Create menu on document.body
        const { menu, mp4Btn, mp3Btn } = createMenu();

        // Insert button into action bar
        let avatarWrapper = null;
        const links = actionBar.querySelectorAll('a[href*="/@"]');
        for (let link of links) {
            if (link.querySelector('img')) {
                avatarWrapper = link;
                break;
            }
        }
        if (!avatarWrapper && actionBar.previousElementSibling && actionBar.previousElementSibling.querySelector('a[href*="/@"] img')) {
            avatarWrapper = actionBar.previousElementSibling;
        }

        if (avatarWrapper && avatarWrapper.parentNode) {
            avatarWrapper.parentNode.insertBefore(wrapper, avatarWrapper);
        } else {
            wrapper.style.marginRight = '12px';
            wrapper.style.marginBottom = '0';
            likeWrapper.parentNode.insertBefore(wrapper, likeWrapper);
        }

        // Toggle menu on click
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            // Close other menus
            document.querySelectorAll('.tt-download-menu.show').forEach(m => {
                if (m !== menu) m.classList.remove('show');
            });

            positionMenu(menu, btn);
            menu.classList.toggle('show');
        });

        // Wire downloads
        const getVideoUrl = () => {
            let videoUrl = window.location.href;
            if (!videoUrl.includes('/video/')) {
                const videoElement = actionBar.closest('div[data-e2e="recommend-list-item-container"], div[class*="DivItemContainer"]');
                if (videoElement) {
                    const parentLink = videoElement.querySelector('a[href*="/video/"]');
                    if (parentLink && parentLink.href) videoUrl = parentLink.href;
                }
            }
            return videoUrl;
        };
        wireDownload(menu, mp4Btn, mp3Btn, getVideoUrl);

        // Store menu reference on wrapper for cleanup
        wrapper._menu = menu;
    });
}

function injectGridButtons() {
    const gridItems = document.querySelectorAll('[data-e2e="user-post-item"], div[class*="DivItemContainerForProfile"]');

    gridItems.forEach(item => {
        if (item.querySelector('.tt-grid-download-container')) return;

        const link = item.querySelector('a[href*="/video/"]');
        if (!link) return;

        const videoUrl = link.href.split('?')[0];
        item.style.position = 'relative';

        const wrapper = document.createElement('div');
        wrapper.className = 'tt-download-container tt-grid-download-container';

        const btn = document.createElement('button');
        btn.className = 'tt-grid-download-btn';
        btn.title = 'Download Video';
        let logoUrl = '';
        try { logoUrl = chrome.runtime.getURL('ext_logo_sq.png'); } catch (e) {}
        btn.innerHTML = `<img src="${logoUrl}" style="width: 100%; height: 100%; border-radius: 8px; pointer-events: none;">`;

        wrapper.appendChild(btn);
        item.appendChild(wrapper);

        // Create menu on document.body
        const { menu, mp4Btn, mp3Btn } = createMenu();
        mp4Btn.innerText = 'Download MP4';
        mp3Btn.innerText = 'Download MP3';

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();

            document.querySelectorAll('.tt-download-menu.show').forEach(m => {
                if (m !== menu) m.classList.remove('show');
            });

            positionMenu(menu, btn);
            menu.classList.toggle('show');
            wrapper.classList.toggle('menu-open', menu.classList.contains('show'));
        });

        wireDownload(menu, mp4Btn, mp3Btn, () => videoUrl);
        wrapper._menu = menu;
    });
}

// Observe DOM for new videos (infinite scroll and modal opens)
const observer = new MutationObserver(() => {
    injectButton();
    injectGridButtons();
});

observer.observe(document.body, { childList: true, subtree: true });
setTimeout(() => {
    injectButton();
    injectGridButtons();
}, 2000);

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.tt-download-menu') && !e.target.closest('.tt-download-container')) {
        document.querySelectorAll('.tt-download-menu.show').forEach(m => {
            m.classList.remove('show');
        });
        document.querySelectorAll('.tt-grid-download-container.menu-open').forEach(w => {
            w.classList.remove('menu-open');
        });
    }
});
