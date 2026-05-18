// ==UserScript==
// @name         osu! Profile Image Tools (Fixed)
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  ЛКМ - приблизить avatar/banner, ПКМ - сохранить изображение. Исправленные селекторы.
// @author       You
// @match        https://osu.ppy.sh/users/*
// @grant        GM_xmlhttpRequest
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

    function handleImageClick(e, imgSrc, isBanner) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!imgSrc) return;
        
        // Обрабатываем только ЛКМ (кнопка 0)
        if (e.button === 0) { 
            openModal(imgSrc);
        }
        // ПКМ (кнопка 2) не обрабатываем - пусть браузер показывает своё контекстное меню
    }

    function attachListenerToElement(element, isBanner, getImageSrcFn) {
        if (!element || element.dataset.osuToolsAttached) return;
        
        element.dataset.osuToolsAttached = 'true';
        element.style.cursor = 'pointer';
        
        // Добавляем атрибут draggable="false" чтобы избежать перетаскивания
        if (element.tagName === 'IMG') {
            element.setAttribute('draggable', 'false');
        }
        
        element.addEventListener('mousedown', function(e) {
            const imgSrc = getImageSrcFn();
            handleImageClick(e, imgSrc, isBanner);
        });
        
        // НЕ отключаем контекстное меню браузера - оставляем стандартное поведение для ПКМ
    }

    function findAndAttach() {
        // --- AVATAR ---
        // Селектор: .avatar.avatar--guest.avatar--full или .avatar--full img
        const avatarContainer = document.querySelector('.avatar--full');
        if (avatarContainer) {
            // Пытаемся найти img внутри
            const avatarImg = avatarContainer.querySelector('img');
            if (avatarImg) {
                attachListenerToElement(avatarContainer, false, () => avatarImg.src || avatarImg.currentSrc);
            } else {
                // Если img нет, возможно фон задан через style.background-image
                const bgMatch = avatarContainer.style.backgroundImage.match(/url\(["']?([^"']+?)["']?\)/);
                if (bgMatch && bgMatch[1]) {
                    attachListenerToElement(avatarContainer, false, () => bgMatch[1]);
                }
            }
        }

        // --- BANNER ---
        // Селектор: .profile-info__bg
        const bannerContainer = document.querySelector('.profile-info__bg');
        if (bannerContainer) {
            // Баннер обычно задан через background-image
            const bgStyle = window.getComputedStyle(bannerContainer).backgroundImage;
            const bgMatch = bgStyle.match(/url\(["']?([^"']+?)["']?\)/);
            
            if (bgMatch && bgMatch[1]) {
                attachListenerToElement(bannerContainer, true, () => bgMatch[1]);
            }
        }
    }

    // Запуск при загрузке страницы
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', findAndAttach);
    } else {
        findAndAttach();
    }

    // Повторная попытка через некоторое время (для SPA и ленивой загрузки)
    setTimeout(findAndAttach, 1000);
    setTimeout(findAndAttach, 3000);
    setTimeout(findAndAttach, 5000);

})();
