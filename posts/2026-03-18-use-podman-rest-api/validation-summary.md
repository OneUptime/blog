# Validation Summary: How to Use the Podman REST API

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman REST API
- Docker-compatible API
- `curl`
- `jq`
- Bash
- `systemd`

## Sources Consulted
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman API reference: https://docs.podman.io/en/latest/_static/api.html
- Podman OpenAPI specification for the current API reference: https://storage.googleapis.com/libpod-master-releases/swagger-v5.8.1.yaml
- Podman reference version index: https://docs.podman.io/en/v5.8.1/Reference.html

## Issues Found
- The post used `/_ping` as a versioned endpoint (`/v4.0.0/libpod/_ping`), but Podman documents `_ping` as an unversioned endpoint. I changed the examples to use `http://localhost/libpod/_ping`.
- The post used older API version examples (`v4.0.0` for libpod and `v1.41` for the Docker-compatible API). Current official Podman docs publish the libpod API at `v5.0.0`, and `podman system service` documents Docker compatibility for `v1.40`. I updated the examples accordingly.
- The volume removal example piped a successful DELETE response into `jq`, but the libpod volume delete endpoint returns `204 No Content` on success. I changed the example to print the HTTP status code instead.
- The force container removal example also assumed a JSON body on success. The libpod container delete endpoint can succeed without a response body, so I changed the example to print the HTTP status code instead of piping to `jq`.

## Review Notes
Podman's API service is documented for Linux and the examples assume a local Unix socket exposed by the rootless `podman.socket` systemd user unit. The post is technically correct after the fixes above.
