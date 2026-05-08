# Validation Summary: How to Use .containerignore Files with Podman Build

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Buildah image builds
- Containerfile/Dockerfile build contexts
- `.containerignore` and `.dockerignore` ignore files
- Unix shell glob patterns

## Sources Consulted
- Podman `podman-build` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- `containerignore(5)` man page from `containers-common`: https://manpages.debian.org/testing/golang-github-containers-common/containerignore.5
- Docker Build context and `.dockerignore` documentation: https://docs.docker.com/build/concepts/context/

## Issues Found
- The post described `.containerignore` syntax as similar to `.gitignore`. Podman and containerignore documentation describe it as the same syntax as `.dockerignore`, using newline-separated Unix shell-style globs, `!` exceptions, and the special `**` wildcard. Updated the syntax description accordingly.
- The allowlist examples included directories but did not explicitly include their contents. Updated the examples to include `!src/**` and `!public/**` where directories are allowlisted, making the examples robust for nested files.
- The measurement example said Podman shows the context size during build and piped output through `grep -i "context"`. The official Podman documentation does not guarantee that output. Replaced it with a comparison between a build using an empty ignore file via `--ignorefile /dev/null` and a normal build using `.containerignore`.

## Review Notes
Podman was not installed in the review environment, so CLI behavior was verified against official Podman documentation and the `containerignore(5)` documentation rather than local `podman --help` output.
