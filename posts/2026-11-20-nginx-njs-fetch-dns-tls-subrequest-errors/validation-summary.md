# Validation review

Official njs install, module/API references and core subrequest buffer documentation reviewed alongside njs0.9.5 source. NGINX1.30.7/njs0.9.5 built locally; macOS linker rejected Linux -Wl,-E, replaced only with -Wl,-export_dynamic in isolated build source. No JS/runtime behavior was patched. Engine testing caught reserved import alias meta and unsupported await inside argument; examples corrected to handlers and separate await.

Exact article JavaScript with fixture endpoint ports passed seven runtime cases: valid JSON200, HTTP503, invalid JSON, wrong certificate SAN, unrelated CA, omitted resolver and internal subrequest503 mapped to502. TLS verification remained enabled. Article configuration with local CA and JS file paths passed nginx -t. No timeout, oversized body, real proxy-subrequest backend, production or load test claimed.

Nine-node nine-edge diagram structurally reviewed, not rendered. Social image1280x720 visually checked for legible complete title and branding.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
