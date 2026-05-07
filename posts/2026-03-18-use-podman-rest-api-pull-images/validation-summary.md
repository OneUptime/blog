# Validation Summary: How to Use the Podman REST API to Pull Images

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Podman REST API (Libpod and Docker-compatible endpoints)
- Container registries
- `curl`
- `jq`
- Python standard library (`http.client`, Unix domain sockets)

## Sources Consulted
- Podman API reference index: https://docs.podman.io/en/latest/Reference.html
- Podman `pull` command documentation: https://docs.podman.io/en/stable/markdown/podman-pull.1.html
- Podman `search` command documentation: https://docs.podman.io/en/stable/markdown/podman-search.1.html
- Podman v4.0 image endpoint registrations: https://raw.githubusercontent.com/containers/podman/v4.0.0/pkg/api/server/register_images.go
- Podman v4.0 Libpod image pull handler: https://raw.githubusercontent.com/containers/podman/v4.0.0/pkg/api/handlers/libpod/images_pull.go
- Podman v4.0 auth header parsing: https://raw.githubusercontent.com/containers/podman/v4.0.0/pkg/auth/auth.go
- Podman v4.0 API version mapping: https://raw.githubusercontent.com/containers/podman/v4.0.0/version/version.go
- Podman v4.0 image search response type: https://raw.githubusercontent.com/containers/podman/v4.0.0/pkg/domain/entities/images.go

## Issues Found
- The Docker-compatible examples used `/v1.41/images/create`, but Podman 4.0 advertises Docker compatibility API version `1.40.0`. I updated both examples to `/v1.40/images/create` to match the official version mapping.
- The `filters` examples passed raw JSON directly in the URL. With `curl`, that is fragile because the JSON should be URL-encoded. I changed those examples to use `-G` with `--data-urlencode` so the requests are formed correctly.
- The auth-header examples used plain `base64` output from the shell. Podman’s auth header parsing uses URL-safe Base64, and wrapped output can also break headers. I updated the shell examples to emit a single-line URL-safe Base64 value, and changed the Python example to `base64.urlsafe_b64encode(...)`.
- The `jq` examples that iterated over `RepoTags` would fail on dangling images where `RepoTags` is `null`. I changed those queries to use `[]?` so they work when untagged images are present.
- The short-ID examples truncated `.Id` directly, which can leave the `sha256:` prefix in the displayed value. I updated those examples to strip the prefix before taking the 12-character short ID.
- The registry search example was labeled as searching Docker Hub, but `term=nginx` searches the configured unqualified registries by default. I corrected the comment to match Podman’s documented search behavior.
- The Python example used `img.get('RepoTags', ['<none>'])`, which still fails when the key exists with a `null` value. I changed it to `img.get('RepoTags') or ['<none>']`.

## Review Notes
- The post is now technically accurate for the versioned endpoints it demonstrates: Libpod `v4.0.0` and Docker-compatible `v1.40`.
- The socket path shown (`$XDG_RUNTIME_DIR/podman/podman.sock`) is appropriate for the common rootless Linux setup. Rootful services commonly use a different socket path.
