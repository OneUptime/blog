# Validation Summary: How to Disable Build Cache with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Containerfile/Dockerfile builds
- Container image build caching
- Podman prune commands
- apt, apk, pip, and npm package-manager cache handling
- CI/CD shell scripting

## Sources Consulted
- Podman build manual: https://docs.podman.io/en/v5.5.2/markdown/podman-build.1.html
- Podman system prune manual: https://docs.podman.io/en/stable/markdown/podman-system-prune.1.html
- Podman image prune manual: https://docs.podman.io/en/v3.2.0/markdown/podman-image-prune.1.html
- pip caching documentation: https://pip.pypa.io/en/stable/topics/caching.html
- npm cache documentation: https://docs.npmjs.com/cli/v7/commands/npm-cache/
- Alpine Linux package management documentation: https://wiki.alpinelinux.org/wiki/Package_management

## Issues Found
- The post used bare `--pull` and described it as forcing a fresh base-image pull. Current Podman documentation describes pull behavior with explicit policies, including `--pull=always`, so the examples and explanation were updated to use `--pull=always`.
- The manual cache-clearing section said `podman system prune -a -f` removes all build cache, but that command also removes broader unused Podman resources. The description was corrected to say it removes unused resources, including all build cache.
- The same section said `podman image prune -f` removes only build cache. Podman documents this command as removing dangling images, so the comment was corrected.
- The package-manager cache example placed unrelated Python and Node examples in one multi-stage Containerfile. That can make the Python stage unused in modern builds and does not produce one image containing both examples. The snippet was split into separate `Containerfile.python` and `Containerfile.node` examples.

## Review Notes
The core `podman build --no-cache` guidance is technically valid. The examples are illustrative and assume the build context contains an appropriate Containerfile and test command where referenced. Podman was not installed in the local environment, so CLI behavior was validated against official documentation rather than local `--help` output.
