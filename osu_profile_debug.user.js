// ==UserScript==
// @name         Osu! Profile Click Test (Debug)
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Тест кликабельности аватара и баннера для osu.ppy.sh
// @author       You
// @match        https://osu.ppy.sh/users/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('[Osu Script] Запуск теста кликабельности...');

    // Функция обработки клика
    function handleInteraction(e, url, type) {
        e.preventDefault();
        e.stopPropagation();

        const msg = `Найден ${type}!\nURL: ${url}`;
        console.log(`[Osu Script] ${msg}`);
        
        // Небольшая задержка, чтобы alert не перекрывал событие сразу
        setTimeout(() => {
            alert(msg + "\n\nЕсли ссылка верная, следующий шаг - добавление зума и скачивания.");
        }, 100);
    }

    // 1. Обработка AVATAR
    function initAvatar() {
        const avatarContainer = document.querySelector('.avatar--full');
        if (!avatarContainer) {
            console.warn('[Osu Script] Avatar (.avatar--full) не найден');
            return;
        }

        // Пытаемся найти картинку внутри или берем фон
        let imgUrl = '';
        const imgEl = avatarContainer.querySelector('img');
        if (imgEl && imgEl.src) {
            imgUrl = imgEl.src;
        } else {
            const bg = window.getComputedStyle(avatarContainer).backgroundImage;
            if (bg && bg !== 'none') {
                imgUrl = bg.replace(/url\(['"]?(.*?)['"]?\)/, '$1');
            }
        }

        if (!imgUrl) {
            console.warn('[Osu Script] Не удалось получить URL аватара');
            return;
        }

        console.log('[Osu Script] Avatar найден:', imgUrl);
        avatarContainer.style.cursor = 'pointer';
        avatarContainer.title = 'ЛКМ/ПКМ для теста';

        // ЛКМ
        avatarContainer.addEventListener('click', (e) => handleInteraction(e, imgUrl, 'Avatar'));
        
        // ПКМ
        avatarContainer.addEventListener('contextmenu', (e) => handleInteraction(e, imgUrl, 'Avatar'));
    }

    // 2. Обработка BANNER
    function initBanner() {
        const bannerContainer = document.querySelector('.profile-info__bg');
        if (!bannerContainer) {
            console.warn('[Osu Script] Banner (.profile-info__bg) не найден');
            return;
        }

        // Баннер обычно на фоне
        const bg = window.getComputedStyle(bannerContainer).backgroundImage;
        let imgUrl = '';
        
        if (bg && bg !== 'none') {
            imgUrl = bg.replace(/url\(['"]?(.*?)['"]?\)/, '$1');
        }

        if (!imgUrl) {
            console.warn('[Osu Script] Не удалось получить URL баннера');
            return;
        }

        console.log('[Osu Script] Banner найден:', imgUrl);
        bannerContainer.style.cursor = 'pointer';
        bannerContainer.title = 'ЛКМ/ПКМ для теста';

        // ЛКМ
        bannerContainer.addEventListener('click', (e) => handleInteraction(e, imgUrl, 'Banner'));
        
        // ПКМ
        bannerContainer.addEventListener('contextmenu', (e) => handleInteraction(e, imgUrl, 'Banner'));
    }

    // Запуск с небольшой задержкой, чтобы DOM точно прогрузился
    setTimeout(() => {
        initAvatar();
        initBanner();
    }, 1000);

})();
