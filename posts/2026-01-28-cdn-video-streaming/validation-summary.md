# Validation Summary: How to Use CDN for Video Streaming

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HLS (HTTP Live Streaming) — Apple's adaptive streaming protocol
- DASH (Dynamic Adaptive Streaming over HTTP) — MPEG-DASH protocol
- nginx — origin server configuration
- Python — CDN configuration and metrics collection (illustrative)
- Node.js / Express — dynamic cache header middleware
- YAML — illustrative CDN edge rules
- CMAF / fMP4 segments (`.m4s`, `.fmp4`)
- MPEG-TS segments (`.ts`)
- HTTP caching semantics (`Cache-Control`, `immutable`, `stale-while-revalidate`, `stale-if-error`)
- Origin Shield pattern

## Sources Consulted
- nginx documentation for `ngx_http_proxy_module` (`proxy_buffering`, `proxy_force_ranges`) — https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- nginx documentation for `ngx_http_core_module` (`max_ranges`, `sendfile`, `tcp_nopush`, `types`, `output_buffers`) — https://nginx.org/en/docs/http/ngx_http_core_module.html
- HLS specification, RFC 8216 (HTTP Live Streaming) — https://datatracker.ietf.org/doc/html/rfc8216
- Apple HLS Authoring Specification — https://developer.apple.com/documentation/http-live-streaming/hls-authoring-specification-for-apple-devices
- MPEG-DASH specification, ISO/IEC 23009-1
- RFC 6381 — The 'Codecs' and 'Profiles' Parameters for "Bucket" Media Types (for `avc1.*` and `mp4a.40.*` codec strings)
- RFC 7234 / RFC 9111 — HTTP Caching (`Cache-Control` directives, `immutable`, byte-range semantics)
- RFC 5861 — `stale-while-revalidate` and `stale-if-error`
- IANA Media Types registry — `video/mp2t`, `video/mp4`, `application/vnd.apple.mpegurl`, `application/dash+xml`
- Express.js routing documentation — https://expressjs.com/en/guide/routing.html

## Issues Found

1. **`proxy_buffering off;` used in a static file location (basic nginx config).** The `proxy_buffering` directive belongs to `ngx_http_proxy_module` and only takes effect on responses received from a proxied upstream (via `proxy_pass`). In a `location` block that serves files directly from disk via `root`, the directive is a no-op and the comment ("Disable buffering for better streaming performance") was misleading. Replaced with `sendfile on;` / `tcp_nopush on;`, which are the actual directives that meaningfully affect efficient static-file streaming in nginx.

2. **`proxy_force_ranges on;` used to "enable range request support" on a static file location.** This directive likewise applies only to proxied responses; nginx already supports byte-range requests for static files served via `root`, and automatically emits the `Accept-Ranges: bytes` header on range-capable responses. The original config implied a directive was required to enable seek support, which is incorrect. Replaced with `max_ranges 10;` (a real `ngx_http_core_module` directive that bounds range-request size to mitigate amplification abuse), and updated the comment to clarify that range support is native for static content.

## Review Notes

- The HLS master manifest example uses `#EXT-X-VERSION:3`, which is correct for MPEG-TS (`.ts`) segments. Readers who switch to fMP4/CMAF segments should bump to `#EXT-X-VERSION:6` or higher per RFC 8216 §8.
- The `avc1.*` codec strings (`640028`, `64001f`, `4d401e`, `42c01e`) and `mp4a.40.2` (AAC-LC) are all valid per RFC 6381 and correctly map to High@L4.0, High@L3.1, Main@L3.0, and Baseline@L3.0 respectively. Note that Baseline H.264 (`42c01e`) is increasingly considered legacy; for new deployments, Constrained Baseline or Main profile is more common, but the example is not technically incorrect.
- The Express middleware uses the route pattern `'/video/:streamType/*'`. This works under Express 4.x but will throw under Express 5.x, which uses path-to-regexp 6+ and requires named wildcards (e.g. `*splat`). The post does not pin an Express version, so the example was left as-is; teams on Express 5 should adjust the wildcard syntax.
- The Python CDN configuration and metrics modules are explicitly framed as "hypothetical" / "example" code against a fictional `cdn_provider` API. They are illustrative and not verifiable against any specific real-world CDN SDK, which is appropriate for the post's scope.
- The CDN edge YAML configuration is also generic / illustrative — real providers (Cloudflare, Fastly VCL, Akamai, CloudFront) each use their own DSL, and the post correctly labels the example as a generic format.
- The `stale-while-revalidate` (RFC 5861) and `immutable` (RFC 8246) cache directives are used correctly.
- The 2–10 second segment-duration range is consistent with HLS practice; Apple historically recommended 6s and currently recommends 6s for VOD / lower for low-latency, but the broader 2–10s range cited in the post is accurate.
- The origin shield discussion is conceptually correct and matches how production CDNs (Cloudflare Argo Tiered Cache, Fastly Shielding, Akamai Tiered Distribution, CloudFront Origin Shield) describe the pattern.
