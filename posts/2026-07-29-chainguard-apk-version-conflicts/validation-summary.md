# Validation Summary: Avoid APK Version Conflicts in Rebuilt Chainguard Images

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Chainguard Containers and Production Containers
- Chainguard Custom Assembly
- Wolfi APK repositories
- Alpine Package Keeper (`apk`)
- Dockerfiles, multi-stage builds, image tags, and image digests
- Docker build caching and base-image pulling
- SBOM generation and vulnerability scanning
- Automated dependency and digest updates with Renovate and Dependabot

## Sources Consulted

- [Custom Assembly FAQs](https://edu.chainguard.dev/chainguard/chainguard-images/features/ca-docs/faq/)
- [Overview of Chainguard Custom Assembly](https://edu.chainguard.dev/chainguard/chainguard-images/features/ca-docs/custom-assembly/)
- [Considerations for Keeping Containers Up to Date](https://edu.chainguard.dev/chainguard/chainguard-images/staying-secure/updating-images/considerations-for-image-updates/)
- [Overview of Chainguard's Package Repositories](https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/package-model/)
- [Chainguard Containers Product Release Lifecycle](https://edu.chainguard.dev/chainguard/chainguard-images/about/versions/)
- [Chainguard's Container Variants](https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/)
- [Python Container Image Versions](https://images.chainguard.dev/directory/image/python/versions)
- [Wolfi FAQs](https://edu.chainguard.dev/open-source/wolfi/faq/)
- [Wolfi `apk-tools` Package Definition](https://github.com/wolfi-dev/os/blob/main/apk-tools.yaml)
- [apk-tools 2.14.10 `apk(8)` Manual Source](https://github.com/alpinelinux/apk-tools/blob/v2.14.10/doc/apk.8.scd)
- [apk-tools 2.14.10 `apk-info(8)` Manual Source](https://github.com/alpinelinux/apk-tools/blob/v2.14.10/doc/apk-info.8.scd)
- [apk-tools 2.14.10 `apk-upgrade(8)` Manual Source](https://github.com/alpinelinux/apk-tools/blob/v2.14.10/doc/apk-upgrade.8.scd)
- [Docker Build Best Practices](https://docs.docker.com/build/building/best-practices/)
- [Docker Image Inspect CLI Reference](https://docs.docker.com/reference/cli/docker/image/inspect/)
- [Docker CLI Output Formatting](https://docs.docker.com/engine/cli/formatting/)
- [Dockerfile Reference](https://docs.docker.com/reference/dockerfile/)
- [Docker Engine API Image Inspection Reference](https://docs.docker.com/reference/api/engine/version/v1.46/)
- [Renovate Docker Digest Documentation](https://docs.renovatebot.com/docker/)
- [GitHub Dependabot Version Update Configuration](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/secure-your-dependencies/configuring-dependabot-version-updates)
- [Dependabot Core Docker Digest Update Fix](https://github.com/dependabot/dependabot-core/pull/6150)

## Issues Found

- The initial evidence-gathering snippet mixed a host-side `docker image inspect` command with `cat` and `apk` commands that must run inside the Chainguard development image. On hosts without APK, the snippet would fail or inspect the host instead of the image. The APK commands now run in a disposable root container created from `$BASE_IMAGE`.
- The original image-inspection template selected only element zero of `RepoDigests`. An image can have multiple repository digests, and assuming the first entry is the relevant one can discard useful evidence. The command now emits the complete `RepoDigests` array as JSON.
- `apk info` without increased verbosity lists installed package names but does not include their versions. It was changed to `apk info -v` so the captured evidence contains exact installed versions.
- The retry section called the refreshed inputs a "coherent pair" and applied its advice to any `-dev` variant. Docker's `--pull` only advances floating image references; it cannot advance a digest-pinned `FROM`, and refreshing a floating tag does not make the base and rolling repository an atomic snapshot. The heading and introductory sentence now limit the advice to floating `-dev` tags without claiming guaranteed coherence.
- The descriptions of `--force-overwrite` and `--allow-untrusted` were imprecise. They now follow apk-tools terminology: the former overwrites files owned by other packages, while the latter permits packages with an untrusted signature or no signature.

## Review Notes

- The placeholders `ORGANIZATION`, `OLDER_DIGEST`, `REVIEWED_DIGEST`, and `package-name` are intentionally schematic and must be replaced with real values.
- The `python:3.13` and `python:3.13-dev` streams exist, but versioned tags require access to Chainguard Production Containers, as the post states.
- Wolfi currently packages apk-tools 2.14.10, and the documented `--no-cache`, `--simulate`, `--force-overwrite`, `--allow-untrusted`, and `upgrade --available` options are valid for that version.
- Package-retention windows are policy-controlled and can change. The post correctly avoids promising a fixed retention duration and recommends retaining artifacts or an internal snapshot for reproducible builds.
- All links in the post were reachable and pointed to the intended official resources at review time.
