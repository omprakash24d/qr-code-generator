/**
 * Enhanced Service Worker for QR Code Generator PWA
 * Features: Offline support, caching strategies, background sync
 */

const CACHE_NAME = "qr-generator-v2.0.0";
const STATIC_CACHE = `${CACHE_NAME}-static`;
const DYNAMIC_CACHE = `${CACHE_NAME}-dynamic`;
const CDN_CACHE = `${CACHE_NAME}-cdn`;

// Files to cache immediately
const STATIC_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js",
];

// Dynamic cache size limit
const DYNAMIC_CACHE_LIMIT = 50;

// Install event - cache static assets
self.addEventListener("install", (event) => {
  console.log("[SW] Installing service worker...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log("[SW] Caching static assets");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("[SW] Static assets cached successfully");
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error("[SW] Failed to cache static assets:", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating service worker...");

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              return (
                cacheName.startsWith("qr-generator-") &&
                cacheName !== STATIC_CACHE
              );
            })
            .map((cacheName) => {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log("[SW] Service worker activated");
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached content with network fallback
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests
  if (!request.url.startsWith("http")) {
    return;
  }

  // Handle different types of requests
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isCDNRequest(request)) {
    event.respondWith(cacheFirst(request, CDN_CACHE));
  } else if (isAPIRequest(request)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  } else {
    event.respondWith(staleWhileRevalidate(request, DYNAMIC_CACHE));
  }
});

// Cache strategies

// Cache First - for static assets
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      console.log("[SW] Serving from cache:", request.url);
      return cachedResponse;
    }

    console.log("[SW] Fetching and caching:", request.url);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
    }

    return networkResponse;
  } catch (error) {
    console.error("[SW] Cache first strategy failed:", error);
    return new Response("Offline content not available", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

// Network First - for API requests
async function networkFirst(request, cacheName) {
  try {
    console.log("[SW] Network first for:", request.url);
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      const responseClone = networkResponse.clone();
      await cache.put(request, responseClone);
      await limitCacheSize(cacheName, DYNAMIC_CACHE_LIMIT);
    }

    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", request.url);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response(
      "Network request failed and no cached version available",
      {
        status: 503,
        statusText: "Service Unavailable",
      }
    );
  }
}

// Stale While Revalidate - for general requests
async function staleWhileRevalidate(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    // Fetch in background to update cache
    const fetchPromise = fetch(request).then((networkResponse) => {
      if (networkResponse.ok) {
        const responseClone = networkResponse.clone();
        cache.put(request, responseClone);
        limitCacheSize(cacheName, DYNAMIC_CACHE_LIMIT);
      }
      return networkResponse;
    });

    // Return cached version immediately if available
    if (cachedResponse) {
      console.log("[SW] Serving stale content:", request.url);
      return cachedResponse;
    }

    // Otherwise wait for network
    console.log("[SW] No cache, waiting for network:", request.url);
    return await fetchPromise;
  } catch (error) {
    console.error("[SW] Stale while revalidate failed:", error);
    return new Response("Request failed", {
      status: 503,
      statusText: "Service Unavailable",
    });
  }
}

// Helper functions

function isStaticAsset(request) {
  return (
    STATIC_ASSETS.some((asset) => request.url.includes(asset)) ||
    request.url.includes(".css") ||
    request.url.includes(".js") ||
    request.url.includes(".html")
  );
}

function isCDNRequest(request) {
  return (
    request.url.includes("cdn.jsdelivr.net") ||
    request.url.includes("cdnjs.cloudflare.com")
  );
}

function isAPIRequest(request) {
  return request.url.includes("/api/") || request.method !== "GET";
}

// Limit cache size to prevent storage bloat
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    console.log(`[SW] Cache ${cacheName} exceeds limit, cleaning up...`);
    const deletePromises = keys
      .slice(0, keys.length - maxItems)
      .map((key) => cache.delete(key));

    await Promise.all(deletePromises);
  }
}

// Background sync for offline actions
self.addEventListener("sync", (event) => {
  console.log("[SW] Background sync triggered:", event.tag);

  if (event.tag === "qr-generate") {
    event.waitUntil(handleOfflineQRGeneration());
  }
});

// Handle offline QR generation
async function handleOfflineQRGeneration() {
  try {
    // This would handle any queued QR generation requests
    // For now, we'll just log that the feature is available
    console.log("[SW] Handling offline QR generation...");

    // In a full implementation, you might:
    // 1. Retrieve queued requests from IndexedDB
    // 2. Process them when back online
    // 3. Show notifications to the user
  } catch (error) {
    console.error("[SW] Background sync failed:", error);
  }
}

// Push notifications (for future enhancements)
self.addEventListener("push", (event) => {
  console.log("[SW] Push event received:", event);

  const options = {
    body: event.data
      ? event.data.text()
      : "QR Code Generator update available!",
    icon: "./icon-192.png",
    badge: "./badge-72.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "Open App",
        icon: "./icon-128.png",
      },
      {
        action: "close",
        title: "Close",
        icon: "./close-icon.png",
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("QR Code Generator", options)
  );
});

// Handle notification clicks
self.addEventListener("notificationclick", (event) => {
  console.log("[SW] Notification clicked:", event);

  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("./"));
  }
});

// Handle skip waiting message from main thread
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log("[SW] Received skip waiting message");
    self.skipWaiting();
  }
});

// Periodic background sync (for browsers that support it)
self.addEventListener("periodicsync", (event) => {
  console.log("[SW] Periodic sync triggered:", event.tag);

  if (event.tag === "qr-cache-refresh") {
    event.waitUntil(refreshCaches());
  }
});

// Refresh critical caches
async function refreshCaches() {
  try {
    console.log("[SW] Refreshing critical caches...");
    const cache = await caches.open(STATIC_CACHE);

    // Re-fetch critical assets
    const criticalAssets = [
      "./",
      "./index.html",
      "https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js",
    ];

    await Promise.all(
      criticalAssets.map((asset) =>
        fetch(asset)
          .then((response) => {
            if (response.ok) {
              return cache.put(asset, response);
            }
          })
          .catch((error) => {
            console.log(`[SW] Failed to refresh ${asset}:`, error);
          })
      )
    );

    console.log("[SW] Cache refresh completed");
  } catch (error) {
    console.error("[SW] Cache refresh failed:", error);
  }
}

console.log("[SW] Service worker script loaded");
