# Validation Summary: How to Build Images with Podman

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Podman
- Buildah
- OCI container images
- Containerfile / Dockerfile syntax
- Multi-stage container builds
- Build arguments and build secrets
- Node.js and npm
- Go
- Alpine Linux
- Container image caching and multi-architecture builds

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/stable/markdown/podman-build.1.html
- Podman inspect documentation: https://docs.podman.io/en/stable/markdown/podman-inspect.1.html
- Podman image inspect documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Podman manifest inspect documentation: https://docs.podman.io/en/stable/markdown/podman-manifest-inspect.1.html
- Podman overview documentation: https://docs.podman.io/
- Buildah config documentation: https://man.archlinux.org/man/buildah-config.1.en
- npm ci documentation: https://docs.npmjs.com/cli/v8/commands/npm-ci/
- Node.js release schedule: https://nodejs.org/en/about/previous-releases
- Go release policy: https://go.dev/doc/devel/release
- Alpine Linux release branches: https://alpinelinux.org/releases/
- Docker official Node image tags: https://github.com/docker-library/official-images/blob/master/library/node

## Issues Found
- Several examples used older base images or toolchain versions (`alpine:3.19`, `golang:1.22-alpine`, `node:20-*`) that are no longer the best current choices as of the validation date. Updated examples to supported/current versions (`alpine:3.24`, `golang:1.26-alpine`, and `node:24-*`) while preserving the structure of the post.
- The Buildah script used `npm ci --omit=dev` after copying only `package.json`. `npm ci` requires a lockfile, so the example now also copies `package-lock.json`.
- The complete Node.js pipeline used `npm ci --frozen-lockfile`. `--frozen-lockfile` is not the npm `ci` mechanism; `npm ci` already fails when `package.json` and the lockfile are out of sync. Replaced it with `npm ci` and corrected the comment.
- The cache export example used Docker BuildKit-style `--cache-to=type=registry,ref=...` syntax. Podman's documented syntax is `--cache-to=<image>` and remote cache usage requires layers, so the example now uses `--layers --cache-to=registry.example.com/myapp:cache`.
- The cache import example omitted the documented `--layers` requirement for `--cache-from`. Added `--layers`.
- The single-image manifest inspection example used `podman manifest inspect`, which is documented for manifest lists and image indexes. Replaced it with `podman image inspect --format '{{.ManifestType}} {{.Digest}}'`.
- The multi-stage build diagram still referenced `golang:1.22-alpine` after the Dockerfile example was updated. Updated the diagram label to `golang:1.26-alpine`.
- The QEMU troubleshooting command was presented as generally applicable. Clarified that the `podman machine ssh -- sudo rpm-ostree ...` command applies to Podman machine/Fedora CoreOS hosts.

## Review Notes
The local environment did not have `podman` or `buildah` installed, so CLI verification was performed against official documentation rather than local `--help` output. The post is technically relevant and code-heavy, and after the corrections above it is suitable to validate.
