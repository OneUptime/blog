# Validation review

Official proxy cache directives, upstream cache variable, map and JSON log format references reviewed. The article distinguishes read bypass from write inhibition without recommending privacy-header overrides.

Actual NGINX1.30.7 loopback origin counter tests verified normal MISS/HIT, repeated no-store MISS, bypass response populating cache, no-store still reading a cached response, combined bypass/no-store preventing storage, and private response repeated misses. Article config with local cache path passed nginx -t. Fixture used URI-only cache key for one synthetic origin; article key includes scheme/host/request URI. No concurrency, expiry, revalidation, stale, CDN or production runtime claims.

Eight-node eight-edge Mermaid structurally reviewed, not rendered. Image1280x720 visually checked for full title legibility and branding.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
