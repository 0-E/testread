// ==UserScript==
// @name         osu! Profile Image Tools
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  ЛКМ - приблизить изображение, ПКМ - сохранить avatar/banner
// @author       You
// @match        https://osu.ppy.sh/users/*
// @grant        GM_xmlhttpRequest
// @connect      ppy.sh
// @connect      s.ppy.sh
// @connect      a.ppy.sh
// ==/UserScript==

(function() {
    'use strict';

    let zoomModal = null;

    // Извлечение ID пользователя из URL
    function getUserId() {
        const match = window.location.pathname.match(/\/users\/(\d+)/);
        return match ? match[1] : null;
    }

    // Создание модального окна для зума
    function createZoomModal() {
        if (zoomModal) return zoomModal;
        
        zoomModal = document.createElement('div');
        zoomModal.id = 'osu-zoom-modal';
        zoomModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            display: none;
            justify-content: center;
            align-items: center;
            z-index: 999999;
            cursor: zoom-out;
        `;
        
        const img = document.createElement('img');
        img.id = 'osu-zoom-image';
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
        `;
        
        zoomModal.appendChild(img);
        document.body.appendChild(zoomModal);
        
        // Закрытие по клику
        zoomModal.addEventListener('click', () => {
            zoomModal.style.display = 'none';
        });
        
        // Закрытие по Esc
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && zoomModal.style.display === 'flex') {
                zoomModal.style.display = 'none';
            }
        });
        
        return zoomModal;
    }

    // Функция зума изображения
    function zoomImage(imageUrl) {
        const modal = createZoomModal();
        const img = document.getElementById('osu-zoom-image');
        img.src = imageUrl;
        modal.style.display = 'flex';
    }

    // Функция скачивания изображения через GM
    function downloadImage(imageUrl, filename) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: imageUrl,
            responseType: 'blob',
            onload: function(response) {
                const blob = response.response;
                const url = URL.createObjectURL(blob);
                
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 100);
            },
            onerror: function() {
                console.error('Error downloading image:', imageUrl);
                window.open(imageUrl, '_blank');
            }
        });
    }

    // Получение URL аватара
    function getAvatarUrl() {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) {
            return ogImage.getAttribute('content');
        }
        const avatarImg = document.querySelector('img[src*="a.ppy.sh"]');
        if (avatarImg) {
            return avatarImg.src;
        }
        return null;
    }

    // Получение URL баннера
    function getBannerUrl(userId) {
        return `https://s.ppy.sh/a/${userId}`;
    }

    // Поиск элемента баннера
    function findBannerElement() {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            const style = window.getComputedStyle(el);
            if (style.backgroundImage && style.backgroundImage.includes('s.ppy.sh')) {
                return el;
            }
        }
        const bannerSelectors = [
            '.profile-header__banner',
            '[class*="banner"]',
            '.user-page .profile-header'
        ];
        for (const selector of bannerSelectors) {
            const el = document.querySelector(selector);
            if (el) return el;
        }
        return null;
    }

    // Поиск элемента аватара
    function findAvatarElement() {
        const selectors = [
            'img[src*="a.ppy.sh"]',
            '[class*="avatar"] img',
            'img[class*="avatar"]',
            '.profile-header__avatar img'
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) return el;
        }
        return null;
    }

    // Проверка является ли элемент аватаром или содержит его
    function isAvatarElement(el) {
        const avatarEl = findAvatarElement();
        if (!avatarEl) return false;
        return el === avatarEl || avatarEl.contains(el) || el.contains(avatarEl);
    }

    // Проверка является ли элемент баннером или содержит его
    function isBannerElement(el) {
        const bannerEl = findBannerElement();
        if (!bannerEl) return false;
        return el === bannerEl || bannerEl.contains(el) || el.contains(bannerEl);
    }

    // Обработка кликов
    function setupImageHandlers() {
        const userId = getUserId();
        const avatarUrl = getAvatarUrl();
        const bannerUrl = userId ? getBannerUrl(userId) : null;

        document.addEventListener('click', function(e) {
            const target = e.target;
            
            if (isAvatarElement(target) && avatarUrl) {
                if (e.button === 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    zoomImage(avatarUrl);
                    return false;
                }
            }

            if (isBannerElement(target) && bannerUrl) {
                if (e.button === 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    zoomImage(bannerUrl);
                    return false;
                }
            }
        }, true);

        document.addEventListener('contextmenu', function(e) {
            const target = e.target;
            
            if (isAvatarElement(target) && avatarUrl) {
                e.preventDefault();
                e.stopPropagation();
                downloadImage(avatarUrl, `avatar_${userId}.jpg`);
                return false;
            }
            
            if (isBannerElement(target) && bannerUrl) {
                e.preventDefault();
                e.stopPropagation();
                downloadImage(bannerUrl, `banner_${userId}.jpg`);
                return false;
            }
        }, true);
    }

    // Запуск после загрузки страницы
    function init() {
        setTimeout(setupImageHandlers, 500);
        setTimeout(setupImageHandlers, 1500);
        setTimeout(setupImageHandlers, 3000);
        
        const observer = new MutationObserver(() => {
            setupImageHandlers();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
