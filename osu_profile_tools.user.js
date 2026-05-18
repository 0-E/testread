// ==UserScript==
// @name         osu! Profile Image Tools (Zoom & Ctrl+Save)
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  ЛКМ - зум, Ctrl+ЛКМ - быстрое сохранение, ПКМ - отключен (стандарт). В зуме ПКМ работает.
// @author       You
// @match        https://osu.ppy.sh/users/*
// @grant        GM_download
// @grant        GM_xmlhttpRequest
// @connect      ppy.sh
// @connect      osu.ppy.sh
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Функция поиска URL изображения
    function getImageUrl(element) {
        if (!element) return null;
        
        // Если это тег img
        if (element.tagName === 'IMG') {
            return element.src;
        }
        
        // Если это div с background-image (баннер)
        const style = window.getComputedStyle(element);
        const bgImage = style.backgroundImage;
        
        if (bgImage && bgImage !== 'none') {
            const match = bgImage.match(/url\(["']?(.*?)["']?\)/);
            if (match && match[1]) {
                return match[1];
            }
        }
        return null;
    }

    // Функция скачивания
    function downloadImage(url, filename) {
        if (typeof GM_download !== 'undefined') {
            GM_download({
                url: url,
                name: filename || 'osu_image.jpg',
                onload: () => console.log('Download started'),
                onerror: (err) => {
                    console.error('Download failed', err);
                    alert('Не удалось скачать изображение автоматически. Попробуйте ПКМ в зуме.');
                }
            });
        } else {
            // Fallback если GM_download недоступен (редко в ViolentMonkey)
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                responseType: "blob",
                onload: function(response) {
                    const blob = response.response;
                    const link = document.createElement("a");
                    link.href = URL.createObjectURL(blob);
                    link.download = filename || 'osu_image.jpg';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                }
            });
        }
    }

    // Создание модального окна для зума
    function createModal(imgUrl) {
        const existing = document.getElementById('osu-zoom-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'osu-zoom-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.9);
            z-index: 99999;
            display: flex;
            justify-content: center;
            align-items: center;
            cursor: zoom-out;
        `;

        const img = document.createElement('img');
        img.src = imgUrl;
        img.style.cssText = `
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
            pointer-events: auto; /* Важно: разрешаем события на картинке для ПКМ */
            user-select: none;
            -webkit-user-drag: none;
        `;
        // Запрещаем контекстное меню НА САМОЙ КАРТИНКЕ внутри модалки? 
        // Нет, пользователь просил чтобы в зуме работало сохранение по ПКМ.
        // Поэтому ничего не предотвращаем внутри модалки.

        modal.appendChild(img);
        document.body.appendChild(modal);

        // Закрытие по клику на фон (не на картинку)
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Закрытие по Esc
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                modal.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    // Инициализация
    function init() {
        const avatarSelector = '.avatar--full';
        const bannerSelector = '.profile-info__bg';

        function setupElement(el) {
            if (!el || el.dataset.osuToolInitialized) return;
            
            el.dataset.osuToolInitialized = 'true';
            el.style.cursor = 'zoom-in';
            el.setAttribute('draggable', 'false');

            el.addEventListener('mousedown', function(e) {
                const url = getImageUrl(el);
                if (!url) return;

                // Ctrl + ЛКМ -> Сохранить
                if (e.ctrlKey && e.button === 0) {
                    e.preventDefault();
                    e.stopPropagation();
                    const fileName = url.split('/').pop().split('?')[0] || 'osu_image.jpg';
                    downloadImage(url, fileName);
                    return;
                }

                // Просто ЛКМ -> Зум
                if (e.button === 0 && !e.ctrlKey) {
                    e.preventDefault();
                    createModal(url);
                    return;
                }
                
                // ПКМ (button 2) -> Ничего не делаем специально.
                // Скрипт игнорирует ПКМ на исходном элементе, позволяя браузеру делать что угодно (или ничего).
            });

            // Явно разрешаем стандартное поведение для ПКМ, чтобы не было конфликтов
            el.addEventListener('contextmenu', function(e) {
                // Не предотвращаем default, но и не делаем ничего.
                // Это возвращает стандартное поведение браузера для элемента (обычно ничего, если это div с bg)
                // или меню если это img.
            });
        }

        const avatar = document.querySelector(avatarSelector);
        const banner = document.querySelector(bannerSelector);

        if (avatar) setupElement(avatar);
        if (banner) setupElement(banner);
        
        if (!avatar || !banner) {
            setTimeout(init, 500);
        }
    }

    init();
})();
