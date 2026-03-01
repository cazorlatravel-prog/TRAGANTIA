const CACHE_NAME = 'tragantia-v4';
const AUDIO_CACHE = 'tragantia-audio-v2';

const CORE_FILES = [
    '/',
    '/index.html',
    '/plaza-corredera.html',
    '/convento-merced.html',
    '/balcon-zabaleta.html',
    '/puerta-deseos.html',
    '/plaza-santa-maria.html',
    '/rio-tragantia.html',
    '/guarida-tragantia.html',
    '/codigos.js',
    '/manifest.json'
];

const AUDIO_FILES = [
    '/imagenes/audio1.mp3',
    '/imagenes/ambiente.mp3',
    '/imagenes/scare.mp3',
    '/imagenes/beep.mp3',
    '/imagenes/audio-plaza-corredera.mp3',
    '/imagenes/audio-convento-merced.mp3',
    '/imagenes/audio-balcon-zabaleta.mp3',
    '/imagenes/audio-puerta-deseos.mp3',
    '/imagenes/audio-plaza-santa-maria.mp3',
    '/imagenes/audio-rio-tragantia.mp3',
    '/imagenes/guarida.mp3',
    '/imagenes/verdad.mp3'
];

const IMAGE_FILES = [
    '/imagenes/tragantia.jpg',
    '/imagenes/lianas.png',
    '/imagenes/esporas.png',
    '/imagenes/portal1.jpg',
    '/imagenes/portal2.jpg',
    '/imagenes/icon-192.png',
    '/imagenes/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        Promise.all([
            caches.open(CACHE_NAME).then(cache => {
                return cache.addAll(CORE_FILES).catch(err => console.log('Error core:', err));
            }),
            caches.open(AUDIO_CACHE).then(cache => {
                return Promise.all(AUDIO_FILES.map(url => cache.add(url).catch(() => {})));
            }),
            caches.open(CACHE_NAME).then(cache => {
                return Promise.all(IMAGE_FILES.map(url => cache.add(url).catch(() => {})));
            })
        ])
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(names => Promise.all(
            names.filter(n => n !== CACHE_NAME && n !== AUDIO_CACHE).map(n => caches.delete(n))
        ))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);
    
    if (url.pathname.endsWith('.mp3')) {
        event.respondWith(
            caches.open(AUDIO_CACHE).then(cache => 
                cache.match(event.request).then(cached => {
                    if (cached) {
                        fetch(event.request).then(r => r.ok && cache.put(event.request, r)).catch(() => {});
                        return cached;
                    }
                    return fetch(event.request).then(r => { r.ok && cache.put(event.request, r.clone()); return r; }).catch(() => new Response('', {status: 404}));
                })
            )
        );
        return;
    }
    
    if (event.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
        event.respondWith(
            fetch(event.request).then(r => {
                if (r.ok) caches.open(CACHE_NAME).then(c => c.put(event.request, r.clone()));
                return r;
            }).catch(() => caches.match(event.request).then(c => c || caches.match('/index.html')))
        );
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(c => c || fetch(event.request).then(r => {
            if (r.ok && event.request.method === 'GET') caches.open(CACHE_NAME).then(cache => cache.put(event.request, r.clone()));
            return r;
        }))
    );
});
