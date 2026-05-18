// ==UserScript==
// @name         osu! Profile Image Tools
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  ЛКМ - приблизить avatar/banner, ПКМ - сохранить изображение
// @author       You
// @match        https://osu.ppy.sh/users/*
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      *
// ==/UserScript==

(function() {
    'use strict';

    let modal = null;
    let modalImg = null;

    function createModal() {
        if (modal) return;

        modal = document.createElement('div');
        modal.id = 'osu-image-modal';
        modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 999999;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.9);
            cursor: pointer;
        `;

        modalImg = document.createElement('img');
        modalImg.id = 'osu-modal-img';
        modalImg.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            max-width: 90%;
            max-height: 90%;
            box-shadow: 0 0 20px rgba(0,0,0,0.5);
        `;

        modal.appendChild(modalImg);
        document.body.appendChild(modal);

        // Закрытие по клику
        modal.addEventListener('click', closeModal);
        
        // Закрытие по Esc
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') closeModal();
        });
    }

    function openModal(imgSrc) {
        createModal();
        modalImg.src = imgSrc;
        modal.style.display = 'block';
    }

    function closeModal() {
        if (modal) {
            modal.style.display = 'none';
            modalImg.src = '';
        }
    }

    function downloadImage(url, filename) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            responseType: 'blob',
            onload: function(response) {
                const blob = response.response;
                const downloadUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(downloadUrl);
            },
            onerror: function() {
                alert('Не удалось скачать изображение');
            }
        });
    }

    function handleImageClick(e, imgElement, isBanner) {
        e.preventDefault();
        e.stopPropagation();
        
        if (e.button === 0) { // ЛКМ - приближение
            const imgSrc = imgElement.src || imgElement.currentSrc;
            if (imgSrc) {
                openModal(imgSrc);
            }
        } else if (e.button === 2) { // ПКМ - сохранение
            const imgSrc = imgElement.src || imgElement.currentSrc;
            if (imgSrc) {
                const filename = isBanner ? 'osu_banner.png' : 'osu_avatar.png';
                downloadImage(imgSrc, filename);
            }
        }
    }

    function attachListener(element, isBanner) {
        if (!element || element.dataset.osuToolsAttached) return;
        
        element.dataset.osuToolsAttached = 'true';
        element.style.cursor = 'pointer';
        
        element.addEventListener('mousedown', function(e) {
            handleImageClick(e, element, isBanner);
        });
        
        // Отключаем контекстное меню браузера
        element.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
        });
    }

    function findAndAttach() {
        // Avatar
        const avatar = document.querySelector('.profile-header__avatar img, .user-profile-header__avatar img, [class*="avatar"] img');
        if (avatar && avatar.parentElement) {
            attachListener(avatar.parentElement, false);
        }

        // Banner
        const banner = document.querySelector('.profile-header__cover, .user-profile-header__cover, [class*="cover"]');
        if (banner) {
            attachListener(banner, true);
        }

        // Альтернативные селекторы для новых версий сайта
        const allImages = document.querySelectorAll('img');
        allImages.forEach(img => {
            const src = img.src || img.currentSrc;
            if (src) {
                if (src.includes('avatars')) {
                    attachListener(img, false);
                } else if (src.includes('covers') || src.includes('banners')) {
                    attachListener(img, true);
                }
            }
        });
    }

    // Запуск при загрузке страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', findAndAttach);
    } else {
        findAndAttach();
    }

    // Повторная попытка через некоторое время (для SPA)
    setTimeout(findAndAttach, 1000);
    setTimeout(findAndAttach, 3000);

})();
