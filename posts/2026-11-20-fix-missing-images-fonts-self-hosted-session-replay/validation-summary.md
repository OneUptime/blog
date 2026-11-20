# Validation summary

Reviewed 20 November 2026 using official OneUptime, NGINX, curl, Chrome and Mozilla documentation. OneUptime behavior was additionally checked in source commit `0de2d9ceac0a2404f5df7ad1f9ab1e22c56bea7e`.

## Checks performed

- Reviewed replay asset and masking behavior against current official docs and pinned OneUptime source docs
- curl example passed bash -n; flags checked against official curl manual
- NGINX location directives checked against official core and headers module docs; braces and statement terminators checked structurally
- Reviewed root-to-URI mapping, fixed CORS origin, MIME assumptions and inherited-header caveat
- Mermaid node definitions and edge references checked structurally
- 1280x720 social image visually inspected; title complete and readable

## Limitations

- NGINX binary unavailable: no nginx -t or live header/asset serving test
- No real session replay, browser network capture, CA trust, authentication, CORS or font rendering test
- curl example was not sent to placeholder internal endpoint
- Structural configuration checks are not a substitute for validating the complete NGINX deployment
- Mermaid not browser-rendered

## Official sources

- https://oneuptime.com/docs/en/telemetry/session-replay#images-styles-and-fonts-during-playback
- https://oneuptime.com/docs/en/rum/session-replay-troubleshooting#images-icons-or-styles-are-missing-in-the-replay
- https://developer.chrome.com/docs/devtools/network/
- https://curl.se/docs/manpage.html
- https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files
- https://nginx.org/en/docs/http/ngx_http_headers_module.html
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cross-Origin-Resource-Policy
- https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
