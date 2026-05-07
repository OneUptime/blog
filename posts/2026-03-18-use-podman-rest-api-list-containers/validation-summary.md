# Validation Summary: How to Use the Podman REST API to List Containers

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Podman REST API
- Podman `system service`
- Docker-compatible Podman API
- `curl`
- Python `http.client`
- Python `urllib.parse`
- Docker SDK for Python
- `jq`

## Sources Consulted
- Podman `podman-system-service` documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman REST API reference: https://docs.podman.io/en/v3.0/_static/api-static.html
- curl man page: https://curl.se/docs/manpage.html
- Docker SDK for Python containers reference: https://docker-py.readthedocs.io/en/stable/containers.html
- Docker SDK for Python client reference: https://docker-py.readthedocs.io/en/stable/client.html
- Python `http.client` documentation: https://docs.python.org/3/library/http.client.html
- Python `urllib.parse` documentation: https://docs.python.org/3/library/urllib.parse.html

## Issues Found
- The Docker-compatible examples used `v1.41`, but Podman's current `system service` documentation officially describes Docker API compatibility at `v1.40`. I changed those example paths to `v1.40`.
- The `curl` filter examples embedded raw JSON directly in the URL. That is fragile because `curl` treats `{}` and `[]` specially unless globbing is disabled, and those characters should be encoded in URLs. I changed the examples to use `-G` with `--data-urlencode`.
- The custom `top` example passed `ps_args` with spaces directly in the URL. I changed it to use `--data-urlencode` so the query string is encoded correctly.
- The logs example used an RFC 3339 timestamp for `since`. The API reference documents this parameter as a Unix timestamp, so I changed the example to `1773792000` for `2026-03-18T00:00:00Z`.
- The stats example used the deprecated Libpod endpoint `/libpod/containers/{name}/stats`. I changed it to `/libpod/containers/stats` with the `containers` query parameter.
- The custom Python client built the `filters` query string by inserting raw JSON directly into the URL. I updated it to use `urllib.parse.urlencode()` so the query parameters are encoded correctly.
- Two wording claims were broader than the docs support. I softened the CLI/API comparison language and changed the Docker SDK sentence from “works seamlessly” to a narrower, accurate compatibility claim.

## Review Notes
- Podman documents the Docker compatibility layer as `v1.40`, and also notes that the server does not reject unsupported version strings. Using the documented compatibility version is the safer example for readers.
- The post's examples use the rootless socket path under `$XDG_RUNTIME_DIR/podman/podman.sock`, which is appropriate for rootless setups. Rootful services commonly use `/run/podman/podman.sock`.
