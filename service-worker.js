const CACHE_NAME = 'brainpop-v1.0.0';

const STATIC_ASSETS = [

'/',

'/index.html',

'/css/style.css',

'/manifest.json',

'/js/game.js',

'/js/ui.js',

'/js/storage.js',

'/bg3.mp3'

];


// Install

self.addEventListener('install', event => {

event.waitUntil(

caches.open(CACHE_NAME)

.then(cache => cache.addAll(STATIC_ASSETS))

);

self.skipWaiting();

});


// Activate

self.addEventListener('activate', event => {

event.waitUntil(

caches.keys()

.then(keys =>

Promise.all(

keys

.filter(key => key !== CACHE_NAME)

.map(key => caches.delete(key))

)

)

);

self.clients.claim();

});


// Fetch

self.addEventListener('fetch', event => {

if (event.request.method !== 'GET') return;

event.respondWith(

caches.match(event.request)

.then(cached => {

return (

cached ||

fetch(event.request)

.then(response => {

const copy = response.clone();

caches.open(CACHE_NAME)

.then(cache => cache.put(event.request, copy));

return response;

})

.catch(() => cached)

);

})

);

});