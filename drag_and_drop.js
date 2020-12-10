'use strict';

import ms from './symbol_generator/index.js';

$$('ul ul li').forEach(function (li) {
  li.draggable = true;

  const SIDC = li.dataset.sidc;
  const radius = li.dataset.radius;

  const img = document.createElement("img");
  const sym = new ms.Symbol(SIDC, { size: 40 });
  const svg = sym.asSVG();
  img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
  li.style.backgroundImage = `url(${img.src})`;

  li.addEventListener("dragstart", function (e) {
    const x = img.width / 2;
    const y = img.height;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(img, x, y);
    const data = JSON.stringify({ type: li.textContent, icon: img.src, radius });
    e.dataTransfer.setData('text/plain', data);
  });

});
