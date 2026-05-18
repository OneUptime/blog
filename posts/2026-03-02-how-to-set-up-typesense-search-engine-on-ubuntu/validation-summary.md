# Validation Summary: How to Set Up Typesense Search Engine on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Typesense (open-source search engine, v29.0 current at review time)
- Ubuntu 22.04 / 24.04
- systemd
- curl (REST API calls)
- Nginx (reverse proxy)
- Vector search / embeddings
- Typesense scoped API keys

## Sources Consulted
- Official Typesense install guide: https://raw.githubusercontent.com/typesense/typesense-website/master/docs-site/content/guide/install-typesense.md
- Official Typesense server configuration reference (v29.0): https://raw.githubusercontent.com/typesense/typesense-website/master/docs-site/content/29.0/api/server-configuration.md
- Official Typesense collections API docs (v29.0): https://raw.githubusercontent.com/typesense/typesense-website/master/docs-site/content/29.0/api/collections.md
- Official Typesense documents API docs (v29.0): https://raw.githubusercontent.com/typesense/typesense-website/master/docs-site/content/29.0/api/documents.md
- Official Typesense vector search docs (v29.0): https://raw.githubusercontent.com/typesense/typesense-website/master/docs-site/content/29.0/api/vector-search.md
- Official Typesense API keys docs (v29.0): https://raw.githubusercontent.com/typesense/typesense-website/master/docs-site/content/29.0/api/api-keys.md
- Official Typesense cluster operations docs (v29.0): https://raw.githubusercontent.com/typesense/typesense-website/master/docs-site/content/29.0/api/cluster-operations.md
- Live probe of `https://dl.typesense.org/releases/29.0/typesense-server-29.0-amd64.deb` (HTTP 200) and `https://dl.typesense.org/apt/pubkey.gpg` / `https://dl.typesense.org/repo/apt/pubkey.gpg` (both HTTP 404)

## Issues Found

1. **Install commands pointed at a non-existent APT repository.** The original instructions added `https://dl.typesense.org/repo/apt` to `/etc/apt/sources.list.d/typesense.list`. That URL (and the alternate `https://dl.typesense.org/apt`) both return 404 - Typesense does not publish an APT repository. The official, supported method is to download the DEB package directly from `https://dl.typesense.org/releases/<version>/typesense-server-<version>-amd64.deb` (verified live - HTTP 200) and install it with `sudo apt install ./<file>.deb`. I rewrote the install section to use the official direct-DEB method, pinned to v29.0, with a note that arm64 has a separate package and that v26.0+ requires Ubuntu 20.04+.

2. **INI config used the wrong parameter names for the listener.** The post used `listen-address` and `listen-port`, which are not valid Typesense parameters. Per the official server configuration reference, the correct parameter names are `api-address` and `api-port` (the INI file accepts any command-line flag with the `--` stripped). I renamed both keys.

3. **CORS configuration was incomplete.** The original config set only `cors-domains = *`. CORS is gated on the separate `enable-cors` boolean per the official docs; without it, `cors-domains` has no effect. I added `enable-cors = true` and reworked the `cors-domains` comment to clarify how to scope it to specific origins.

4. **Minor INI structure cleanup.** The original placed the `; Directory to store Typesense data` comment above the `[server]` section header, which is harmless but reads as if the directive belongs in another section. I moved the comments next to their directives and added a blank line after `[server]` to match the format shown in the official docs example.

5. **Added a note that the DEB package auto-generates the admin API key.** The official install docs call this out explicitly ("The admin API key is auto-generated and can be found inside the config file"). The original post implied you must always generate your own; I noted the auto-generated key option while keeping the `openssl rand -base64 32` example for users who want to rotate it.

## Review Notes

- The `id` field is explicitly defined in the `products` collection schema. Per the Typesense docs the `id` field is special and "is not required to be defined as part of the collection schema." Defining it explicitly is accepted by Typesense and not an error, so this was left as-is.
- The vector field definition uses `{"name": "embedding", "type": "float[]", "num_dim": 384, "index": true}`. `index: true` is the default for vector fields and is not shown in the official vector search examples, but it is not invalid - left as-is.
- The vector search `vector_query` syntax `embedding:(YOUR_QUERY_VECTOR_HERE, k:10)` is correct format-wise; users must substitute a real comma-separated vector literal like `[0.1, 0.2, ...]`. The placeholder makes this clear.
- The Nginx reverse proxy config restricts the public-facing surface to `GET /collections/...`, which blocks document writes and admin operations - this is a reasonable hardening pattern.
- The post pins example install commands to a specific Typesense version (v29.0 after the fix). Readers should bump that to the current latest version when running through the tutorial - this is normal and was not flagged as an issue.
- `typesense-server --version` is shown for verifying install in the original; that flag is not explicitly documented in the server-configuration reference, but is removed in the fixed install section anyway (replaced with `sudo systemctl start` per the official docs flow).
