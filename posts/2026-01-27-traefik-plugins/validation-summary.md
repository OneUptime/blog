# Validation Summary: How to Use Traefik Plugins

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Traefik (v3.0) reverse proxy and load balancer
- Traefik plugin system (Yaegi-interpreted Go middleware)
- Go (plugin development, `net/http` handler interface)
- Docker / Docker Compose
- Kubernetes (Traefik CRDs: `Middleware`, `IngressRoute` on `traefik.io/v1alpha1`)
- Helm (Traefik Helm chart values)
- YAML configuration (static and dynamic Traefik config)

## Sources Consulted
- Official Traefik plugin documentation: https://doc.traefik.io/traefik/plugins/
- Traefik Plugin Catalog: https://plugins.traefik.io
- Yaegi (Go interpreter used by Traefik plugins): https://github.com/traefik/yaegi
- Traefik demo plugin reference: https://github.com/traefik/plugindemo
- Traefik Kubernetes CRD reference (`traefik.io/v1alpha1` group for Traefik v3+)
- Go standard library `net/http`, `regexp`, `encoding/json` documentation

## Issues Found

1. **Incorrect plugin runtime claim (significant).** The post stated: "Traefik plugins are middleware components written in Go that run as WebAssembly (Wasm) modules." This is inaccurate. Traefik's canonical plugin system loads plugins as Go source code executed on the fly by **Yaegi**, an embedded Go interpreter — plugins are not pre-compiled, and they do not run as Wasm modules in the standard system described by the rest of the post (the catalog, `experimental.plugins.*` config, and `.traefik.yml` manifest all refer to the Yaegi-based system). Rewrote the sentence to correctly describe Yaegi-based execution.

2. **Go code would fail to compile (unused import).** The "Advanced Plugin: Request Validator" snippet imported `"strings"` but never referenced it. Go treats unused imports as compile errors, so the example as written would not build. Removed the unused `"strings"` import from the import block.

3. **Misleading comment in plugin manifest.** The `.traefik.yml` manifest snippet had a comment `# Path to documentation` immediately above the `testData:` field. `testData` is the sample plugin configuration used by the catalog/tests, not a documentation path. Updated the comment to "Sample configuration used to test the plugin" to accurately describe the field.

## Review Notes

- The custom plugin Go interface (`Config`, `CreateConfig`, `New(ctx, next, config, name)` signature, `ServeHTTP`) matches the official Traefik plugin development contract.
- The `.traefik.yml` manifest fields (`displayName`, `type: middleware`, `import`, `summary`, `testData`) are all valid required fields per the catalog spec. Optional fields like `iconPath` and `bannerPath` were not used but are not required.
- The Kubernetes CRD API group `traefik.io/v1alpha1` is correct for Traefik v3+ (the older `traefik.containo.us/v1alpha1` was deprecated and removed in v3).
- The static-config plugin path (`experimental.plugins.<name>.moduleName` / `version`) and the demo plugin reference (`github.com/traefik/plugindemo`) are accurate.
- Several community plugin names referenced in the catalog section (e.g., `crowdsec-bouncer`, `geoblock`, `traefik-plugin-oidc`) and the specific versions referenced in the example configs (e.g., `v0.7.1`, `v0.2.5`) are illustrative examples; readers should consult the Traefik Plugin Catalog for current modulePath and version values before deploying.
- The `rate-limit` plugin configuration example (with `average`, `burst`, `period`, `sourceCriterion`) shows shape rather than a specific real plugin's exact schema, since field names vary by community plugin — readers should consult each plugin's own README before copying.
- The `docker-compose.yml` examples still include the `version: "3.8"` top-level key, which is obsolete in Docker Compose V2 but harmless; not corrected since it does not cause functional issues.
- The `headerPrefix: "Bearer"` value in the JWT example assumes the specific plugin strips the prefix without a trailing space; behavior is plugin-specific and varies by implementation.
