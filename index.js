'use strict';

import ms from './symbol_generator/index.js';

globalThis.$ = document.querySelector.bind(document);
globalThis.$$ = document.querySelectorAll.bind(document);

globalThis.map = new GMaps({
  el: '#map',
  // Area 51
  lat: 37.2514875,
  lng: -115.8644347,
  zoom: 11,


});

function point2LatLng(point, map) {
  const topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
  const bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
  const scale = Math.pow(2, map.getZoom());
  const worldPoint = new google.maps.Point(point.x / scale + bottomLeft.x, point.y / scale + topRight.y);
  return map.getProjection().fromPointToLatLng(worldPoint);
}

$('#map').addEventListener("drop", function (e) {
  const data = JSON.parse(e.dataTransfer.getData('text/plain'));
  const latLng = point2LatLng({ x: e.x, y: e.y }, map);
  const lat = latLng.lat();
  const lng = latLng.lng();
  const marker = map.addMarker({ lat, lng, icon: data.icon, draggable: true });
  marker.timeouts = [];
  // keep markers above waypoints
  marker.addListener('dragend', () => {
    const zIndex = Math.min(999, marker.getZIndex());
    marker.setZIndex(zIndex);
  });
  if (data.radius) {
    marker.circle = drawMortarRadius(lat, lng);
    marker.circle.addListener('mouseover', () => marker.circle.set('editable', true));
    marker.circle.addListener('mouseout', () => marker.circle.set('editable', false));
    marker.addListener('drag', function (e) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      marker.circle.setCenter({ lat, lng });
    });
  }
});

$('#map').addEventListener("dragenter", function (e) {
  e.preventDefault();
});

$('#map').addEventListener("dragover", function (e) {
  e.preventDefault();
});

function randomColor() {
  const number = Math.random() * 360;
  const hue = number * 137.508; // use golden angle approximation
  return `hsl(${hue}, 60%, 75%)`;
}

globalThis.waypoints = [];

map.setContextMenu({
  control: 'map',
  options: [
    {
      title: 'Add Waypoint',
      name: 'add_waypoint',
      action: function (e) {
        const SIDC = '10032500001318000000';
        const uniqueDesignation = prompt('Enter a unique designation for this waypoint:', waypoints.length + 1);
        const sym = new ms.Symbol(SIDC, { size: 40, uniqueDesignation });
        const color = randomColor();
        const svg = sym.asSVG().replace('black', color);
        const uri = `data:image/svg+xml;base64,${btoa(svg)}`;
        const waypoint = this.addMarker({
          icon: uri,
          //icon: 'https://cdn.mapmarker.io/api/v1/font-awesome/v5/pin?icon=fa-star-solid&size=50&hoffset=0&voffset=-1&oncolor=6E942A&background=6E942A',
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
          title: 'Add waypoint',
          draggable: true,
        });
        waypoint.uniqueDesignation = uniqueDesignation;
        waypoints.push(waypoint);

        // keep waypoints beneath other markers
        waypoint.addListener('dragend', () => waypoint.setZIndex(-999));
      }
    }
  ]
});

function drawMortarRadius(lat, lng) {
  return map.drawCircle({
    strokeColor: "#FF0000",
    strokeOpacity: 0.8,
    strokeWeight: 2,
    fillColor: "#FF0000",
    fillOpacity: 0.35,
    lat,
    lng,
    radius: 1_000,
    editable: true,
    draggable: false
  });
}

map.setContextMenu({
  control: 'marker',
  options: [
    {
      title: 'Add note',
      name: 'add_note',
      action: function (e) {
        if (e.marker.clickListener) e.marker.clickListener.remove();
        const note = prompt("Enter a note:", "Hello World!");
        if (!note) return;
        const content = `<p style="color:black; margin: 0; padding: 0;">${note}</p>`;
        const infowindow = new google.maps.InfoWindow({ content });
        e.marker.infowindow = infowindow;
        const clickListener = e.marker.addListener('click', () => {
          infowindow.open(map, e.marker);
        });
        e.marker.clickListener = clickListener;
      }
    },
    {
      title: 'Change Icon',
      name: 'change_icon',
      action: function (e) {
        e.marker.setIcon(prompt("Enter the URL of an icon:", "https://google.com/favicon.ico"));
      }
    },
    {
      title: 'Schedule movement',
      name: 'schedule_movement',
      action: function (e) { 
        const uniqueDesignation = prompt("Enter the unique designation of the waypoint to move to:", waypoints.length);
        const waypoint = waypoints.find(({ uniqueDesignation: uD }) => uD == uniqueDesignation);
        if (!waypoint) return alert(`No waypoint with the unique designation "${uniqueDesignation}".`);
        const delay = prompt("Enter how many seconds before movement should occur:", "1");
        const ms = delay * 1000;
        if (Number.isNaN(ms)) return alert(`"${delay}" is not a number.`);
        const timeout = setTimeout(() => {
          const latLng = waypoint.position;
          const lat = latLng.lat();
          const lng = latLng.lng();
          e.marker.setPosition(new google.maps.LatLng(lat, lng));
          if (e.marker.circle)  e.marker.circle.setCenter({ lat, lng });
        }, ms);
        e.marker.timeouts.push(timeout);
      }
    },
    {
      title: 'Clear all scheduled movement',
      name: 'clear_all_scheduled_movement',
      action: function (e) {
        if (!e.marker.timeouts) return;
        e.marker.timeouts.forEach(clearTimeout);
        e.marker.timeouts = [];
      }
    },
    {
      title: 'Delete Marker',
      name: 'delete_marker',
      action: function (e) {
        if (e.marker.circle) map.removePolygon(e.marker.circle);
        if (waypoints.includes(e.marker)) waypoints.splice(waypoints.indexOf(e.marker), 1);
        map.removeMarker(e.marker);
      }
    },
  ]
});
