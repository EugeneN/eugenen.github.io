importScripts('https://storage.googleapis.com/workbox-cdn/releases/4.0.0/workbox-sw.js');

if (workbox) {
  console.log(`Yay! Workbox is loaded 🎉`);

  workbox.routing.registerRoute(
    new RegExp('index\.html'),
    new workbox.strategies.StaleWhileRevalidate({cacheName: 'entrypoint-cache'})
  );
  workbox.routing.registerRoute(
    new RegExp('out\.js'),
    new workbox.strategies.StaleWhileRevalidate({cacheName: 'exe-cache'})
  );

  workbox.routing.registerRoute(
    /css\/index\.css$/,
    new workbox.strategies.StaleWhileRevalidate({cacheName: 'css-cache'})
  );

  workbox.routing.registerRoute(
    /data\/world.*\.json$/,
    new workbox.strategies.CacheFirst({
      cacheName: 'data-cache',
      plugins: [
        new workbox.expiration.Plugin({
          maxAgeSeconds: 365 * 24 * 60 * 60,
        })
      ],
    })
  );

  workbox.routing.registerRoute(
    /textures\/.+\.(?:png|jpg)$/,
    new workbox.strategies.CacheFirst({
      cacheName: 'textures-cache',
      plugins: [
        new workbox.expiration.Plugin({
          maxEntries: 100,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        })
      ],
    })
  );

} else {
  console.log(`Boo! Workbox didn't load 😬`);
}