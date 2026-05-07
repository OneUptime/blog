# Validation Summary: How to Use the Podman REST API to Create Containers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman libpod REST API
- Podman Docker-compatible REST API
- Containers
- `curl`
- Python

## Sources Consulted
- Podman API reference: https://docs.podman.io/en/latest/Reference.html
- Podman OpenAPI schema for v4.0: https://storage.googleapis.com/libpod-master-releases/swagger-v4.0.yaml
- Podman `podman-create(1)` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman libpod create handler source: https://raw.githubusercontent.com/containers/podman/main/pkg/api/handlers/libpod/containers_create.go
- Podman Docker-compatible create handler source: https://raw.githubusercontent.com/containers/podman/main/pkg/api/handlers/compat/containers_create.go
- Podman vendored Docker mount type definition for v4.0.0: https://raw.githubusercontent.com/containers/podman/v4.0.0/vendor/github.com/docker/docker/api/types/mount/mount.go

## Issues Found
- The post implied the create endpoints would work directly with image references, but Podman’s create handlers return a not-found error when the image is not already present locally. I added a note explaining that images must be pulled first.
- The `mounts` examples used `destination` and `options`, which do not match the `Mount` object shape Podman uses for `SpecGenerator.mounts`. I corrected those examples to use valid mount fields.
- The restart policy example paired `restart_tries` with `restart_policy: "always"`, but Podman documents `restart_tries` as only applying to `on-failure`. I changed the example to use `on-failure`.
- The Python helper always attempted to decode a JSON response body, but the container start endpoint returns `204 No Content` on success. I updated the script to handle empty responses safely.

## Review Notes
- The examples use the rootless Unix socket path at `$XDG_RUNTIME_DIR/podman/podman.sock`. That is correct for a rootless Podman service, but rootful setups typically use `/run/podman/podman.sock`.
- The post uses versioned API paths such as `/v4.0.0/libpod/...` and `/v1.41/...`. Those examples are valid for the documented payload shapes reviewed here, but readers should still align requests with the API version exposed by their Podman service when working across environments.
