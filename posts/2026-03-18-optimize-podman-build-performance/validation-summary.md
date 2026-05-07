# Validation Summary: How to Optimize Podman Build Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- Buildah
- Containerfile/Dockerfile builds
- OCI container images
- Build layer caching
- Cache mounts
- Registry-based build cache
- GitHub Actions CI/CD
- containers/storage configuration

## Sources Consulted
- Podman build documentation: https://docs.podman.io/en/v4.8.0/markdown/podman-build.1.html
- Podman build documentation for cache, jobs, and memory flags: https://docs.podman.io/en/v4.3/markdown/podman-build.1.html
- Buildah build documentation: https://github.com/containers/buildah/blob/main/docs/buildah-build.1.md
- Buildah run documentation for `RUN --mount=type=cache`: https://raw.githubusercontent.com/containers/buildah/main/docs/buildah-run.1.md
- containers/storage `storage.conf` documentation: https://sources.debian.org/src/golang-github-containers-storage/1.59.1%2Bds1-3/docs/containers-storage.conf.5.md
- Dockerfile reference for Dockerfile syntax and `CMD` behavior: https://docs.docker.com/reference/builder

## Issues Found
- The remote caching example said to pull and push a normal `:cache` image tag as the cache source. Podman/Buildah's distributed cache uses cache repositories populated with `--cache-to` and consumed with `--cache-from`, with `--layers` required. I removed the `podman pull` step, added `--cache-to=your-registry.com/app:cache`, and changed the push step to push the final image.
- The GitHub Actions example used `--cache-from` but did not populate the remote cache with `--cache-to`, and it tagged/pushed `${{ github.repository }}` without the `ghcr.io/` registry prefix used by the cache source. I added `--cache-to=ghcr.io/${{ github.repository }}:cache`, made the image tag registry-qualified, and changed the final push to push that image tag.
- The GitHub Actions example cached `/var/lib/containers` with `actions/cache`. That path is a rootful system storage location and is not the documented registry cache mechanism shown in the post. I removed that step so the example relies on Podman/Buildah's registry cache options.

## Review Notes
Podman and Buildah were not installed in the local review environment, so CLI behavior was validated against official upstream documentation rather than local `--help` output. The post's cache mount examples are technically valid for current Buildah documentation, but cache mount options differ from Docker BuildKit in some details across versions, so future edits should avoid implying complete BuildKit option parity.
