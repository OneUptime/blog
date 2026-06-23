# Validation Summary: Native apps had a good run, but PWA has caught up and is the future.

## Status
not-code-blog

## Post Type
Opinion / strategy piece (product & platform strategy). Argues for a PWA-first
approach over building parallel native iOS/Android apps, framed around OneUptime's
choices. Contains no code examples, terminal commands, or configuration snippets.

## Technologies Covered
- Progressive Web Apps (PWAs)
- Service Workers
- IndexedDB
- Cache API
- Web Push Notifications
- Background Sync
- HTTP/2, HTTP/3 (QUIC)
- Partial hydration / SSR (Preact, React)
- App store distribution models (native vs. web)

## Sources Consulted
- MDN — Progressive Web Apps: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- MDN — Service Worker API: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API
- MDN — Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- MDN — Background Synchronization API: https://developer.mozilla.org/en-US/docs/Web/API/Background_Synchronization_API
- WebKit — Web Push for Web Apps on iOS/iPadOS (iOS 16.4): https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- Chrome Developers — Deprecating HTTP/2 Server Push: https://developer.chrome.com/blog/removing-push/

## Issues Found
No technical issues found. As a non-technical opinion/strategy post with no code,
commands, or configuration, it falls under the "not-code-blog" classification.
The high-level capability claims it makes (Service Workers + IndexedDB + Cache API
for offline, web push, background sync, installability) are accurate and align with
current web platform standards.

## Review Notes
- The post mentions "HTTP/2 push/3 QUIC" in passing (section 8). HTTP/2 Server Push
  has effectively been deprecated/removed in major browsers (Chrome removed it in
  Chrome 106, 2022); modern preloading is typically done via `rel=preload`/Early Hints
  (103) instead. This is only a brief illustrative aside, not an implementation
  instruction, so it does not affect the not-code-blog classification — but if the
  post is ever expanded into a technical deep-dive, that reference should be updated.
- Web push on iOS is supported only for installed (Add to Home Screen) PWAs, starting
  with iOS/iPadOS 16.4 (March 2023). The post's claim that push works across iOS is
  correct given that caveat; worth making explicit in any future technical follow-up.
- "HTML page that was built in 1990's still work as is!" is a reasonable, if
  rhetorical, statement about the web's backwards compatibility; no correction needed
  for an opinion piece.
