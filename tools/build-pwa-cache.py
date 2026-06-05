#!/usr/bin/env python3
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIRS = [
    ROOT / "assets",
    ROOT / "icons",
    ROOT / "vendor" / "three" / "build",
    ROOT / "vendor" / "three" / "examples" / "jsm",
]
STATIC_FILES = [
    "flappy3d.html",
    "flappy3d.html?fullfx",
    "manifest.webmanifest",
]


def web_path(path: Path) -> str:
    return "./" + path.relative_to(ROOT).as_posix()


def main():
    files = list(STATIC_FILES)
    for directory in CACHE_DIRS:
        if not directory.exists():
            continue
        for path in sorted(directory.rglob("*")):
            if path.is_file() and path.name != ".DS_Store":
                files.append(web_path(path))

    seen = set()
    urls = []
    for item in files:
        if item not in seen:
            seen.add(item)
            urls.append(item)

    body = "\n".join(f"  {url!r}," for url in urls)
    sw = f"""const CACHE_NAME = 'flappy3d-pwa-v1';
const PRECACHE_URLS = [
{body}
];

self.addEventListener('install', event => {{
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
}});

self.addEventListener('activate', event => {{
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
}});

self.addEventListener('fetch', event => {{
  const request = event.request;
  if (request.method !== 'GET') return;
  event.respondWith(
    caches.match(request)
      .then(cached => cached || fetch(request).then(response => {{
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }}))
      .catch(() => request.mode === 'navigate' ? caches.match('./flappy3d.html') : undefined)
  );
}});
"""
    (ROOT / "sw.js").write_text(sw)
    print(f"wrote sw.js with {len(urls)} precache urls")


if __name__ == "__main__":
    main()
