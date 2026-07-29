# Validation Summary: How to Migrate an `apt`-Based Dockerfile to Chainguard and `apk`

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- Chainguard Containers
- Wolfi
- Chainguard OS
- APK
- Docker and Docker Buildx
- Debian and Ubuntu APT
- Python virtual environments and pip
- Multi-stage and distroless container builds

## Sources Consulted

- [Migrating Dockerfiles to Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migrating-to-chainguard-images/)
- [Package and Image Name Mappings](https://edu.chainguard.dev/chainguard/chainguard-images/about/package-name-mappings/)
- [Overview of Chainguard's Package Repositories](https://edu.chainguard.dev/chainguard/chainguard-images/features/packages/package-model/)
- [Chainguard Python container overview](https://images.chainguard.dev/directory/image/python/overview)
- [Chainguard's container variants](https://edu.chainguard.dev/chainguard/chainguard-images/about/differences-development-production/)
- [Installing APK packages in distroless variants](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/install-apks-in-distroless-variants/)
- [Tips for migrating to Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migration-tips/)
- [Alpine Compatibility](https://edu.chainguard.dev/chainguard/migration/compatibility/alpine-compatibility/)
- [glibc vs. musl](https://edu.chainguard.dev/chainguard/chainguard-images/about/images-compiled-programs/glibc-vs-musl/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker: Running containers and overriding image defaults](https://docs.docker.com/engine/containers/run/)
- [Docker multi-platform builds](https://docs.docker.com/build/building/multi-platform/)
- [docker buildx build CLI reference](https://docs.docker.com/reference/cli/docker/buildx/build/)
- [Alpine Linux package management: `apk search`](https://wiki.alpinelinux.org/wiki/Alpine_Linux_package_management)
- [Current public Chainguard APK index](https://apk.cgr.dev/chainguard/x86_64/APKINDEX.tar.gz)

## Issues Found

- The post stated that all Chainguard Containers are based on Wolfi. Current Chainguard documentation says containers can be built with packages from Wolfi or Chainguard OS. The text now states this distinction and clarifies that the public images used in the guide are Wolfi-based.
- The original-image inventory commands passed `id` and `env` as positional commands. Positional commands replace `CMD`, not an image's `ENTRYPOINT`; an exec-form entrypoint receives them as arguments. The utilities therefore would not reliably execute in images with an application entrypoint. Both commands now use `--entrypoint` to run the intended utility directly.

## Review Notes

- The package mappings, APK search forms, Python `latest-dev`/distroless multi-stage pattern, nonroot UID guidance, shell caveats, runtime shared-library warning, and Buildx flags were verified as current.
- The current public Chainguard Python `latest` and `latest-dev` image configurations use UID `65532` and `/usr/bin/python` as their entrypoint, matching the example and its warning to verify each image rather than generalizing.
- The multi-platform Buildx command is valid, but whether its result is loaded locally or retained only in the build cache depends on the selected builder and image store. A registry-bound production workflow would normally add `--push`; this does not affect the command's use here as a cross-platform build check.
- The local Docker CLI was available, but the Docker daemon was not. Verification therefore used current official documentation, local CLI help, public registry image configurations, and the live public APK index rather than an end-to-end image build.
