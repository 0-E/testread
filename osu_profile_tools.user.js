// ==UserScript==
// @name         osu! Profile Image Tools
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  ЛКМ - приблизить изображение, ПКМ - сохранить avatar/banner
// @author       You
// @match        https://osu.ppy.sh/users/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Функция для получения URL аватара из meta тега
    function getAvatarUrl() {
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) {
            return ogImage.getAttribute('content');
        }
        return null;
    }

    // Функция для получения URL баннера
    function getBannerUrl(userId) {
        return `https://s.ppy.sh/a/${userId}`;
    }

    // Извлечение ID пользователя из URL
    function getUserId() {
        const match = window.location.pathname.match(/\/users\/(\d+)/);
        return match ? match[1] : null;
    }

    // Создание модального окна для зума
    function createZoomModal() {
        let modal = document.getElementById('osu-zoom-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'osu-zoom-modal';
            modal.style.cssText = `
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
            
            modal.appendChild(img);
            document.body.appendChild(modal);
            
            // Закрытие по клику
            modal.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        return modal;
    }

    // Функция зума изображения
    function zoomImage(imageUrl) {
        const modal = createZoomModal();
        const img = document.getElementById('osu-zoom-image');
        img.src = imageUrl;
        modal.style.display = 'flex';
    }

    // Функция скачивания изображения
    async function downloadImage(imageUrl, filename) {
        try {
            // Создаем временную ссылку для скачивания
            const response = await fetch(imageUrl, {
                method: 'GET',
                mode: 'cors',
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading image:', error);
            // Fallback: открываем в новой вкладке
            window.open(imageUrl, '_blank');
        }
    }

    // Обработка кликов по аватару и баннеру
    function setupImageHandlers() {
        const userId = getUserId();
        const avatarUrl = getAvatarUrl();
        const bannerUrl = userId ? getBannerUrl(userId) : null;

        // Находим элементы аватара и баннера
        const avatarSelectors = [
            'img[src*="a.ppy.sh"]',
            '[class*="avatar"] img',
            'img[class*="avatar"]',
            '.profile-header__avatar img',
            '[data-user-id] img'
        ];

        const bannerSelectors = [
            '[class*="banner"]',
            '.profile-header__banner',
            'img[src*="s.ppy.sh"]',
            '[style*="background-image"]'
        ];

        // Функция проверки является ли элемент аватаром
        function isAvatarElement(el) {
            if (!avatarUrl) return false;
            const img = el.tagName === 'IMG' ? el : el.querySelector('img');
            if (img && img.src.includes('a.ppy.sh')) return true;
            return el.closest('[class*="avatar"]') !== null;
        }

        // Функция проверки является ли элемент баннером
        function isBannerElement(el) {
            if (!bannerUrl) return false;
            const style = window.getComputedStyle(el);
            if (style.backgroundImage && style.backgroundImage.includes('s.ppy.sh')) return true;
            if (el.classList.contains('profile-header__banner')) return true;
            if (el.closest('[class*="banner"]') !== null) return true;
            return false;
        }

        // Глобальный обработчик кликов
        document.addEventListener('click', function(e) {
            const target = e.target;
            
            // Проверка на аватар
            if (isAvatarElement(target)) {
                if (e.button === 0) { // ЛКМ
                    e.preventDefault();
                    e.stopPropagation();
                    if (avatarUrl) {
                        zoomImage(avatarUrl);
                    }
                    return false;
                } else if (e.button === 2) { // ПКМ
                    e.preventDefault();
                    e.stopPropagation();
                    if (avatarUrl) {
                        downloadImage(avatarUrl, `avatar_${userId}.jpg`);
                    }
                    return false;
                }
            }

            // Проверка на баннер
            if (isBannerElement(target) || target.style.backgroundImage) {
                if (e.button === 0) { // ЛКМ
                    e.preventDefault();
                    e.stopPropagation();
                    if (bannerUrl) {
                        zoomImage(bannerUrl);
                    }
                    return false;
                } else if (e.button === 2) { // ПКМ
                    e.preventDefault();
                    e.stopPropagation();
                    if (bannerUrl) {
                        downloadImage(bannerUrl, `banner_${userId}.jpg`);
                    }
                    return false;
                }
            }
        }, true);

        // Обработчик контекстного меню
        document.addEventListener('contextmenu', function(e) {
            const target = e.target;
            
            if (isAvatarElement(target) || isBannerElement(target) || target.style.backgroundImage) {
                e.preventDefault();
                return false;
            }
        }, true);
    }

    // Запуск после загрузки страницы
    function init() {
        // Ждем загрузки динамического контента
        setTimeout(setupImageHandlers, 1000);
        
        // Также наблюдаем за изменениями DOM
        const observer = new MutationObserver(() => {
            setupImageHandlers();
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // Запуск скрипта
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
