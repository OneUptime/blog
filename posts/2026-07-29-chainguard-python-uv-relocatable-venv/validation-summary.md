# Validation Summary: Build a Chainguard Python Runtime with uv and No pip

## Status

validated

## Post Type

Technical deployment tutorial

## Technologies Covered

- Chainguard Python development and minimal runtime containers
- Python virtual environments
- Astral uv 0.11.32
- Requirements-style lock files and hash checking
- Docker multi-stage and multi-platform builds
- BuildKit cache mounts
- Python wheels, native extensions, CPython ABIs, CPU architectures, and glibc compatibility
- Chainguard Custom Assembly and distroless image extension

## Sources Consulted

- [Chainguard Python Image Overview](https://images.chainguard.dev/directory/image/python/overview)
- [Migrating to Python Chainguard Containers](https://edu.chainguard.dev/get-started/migration/migration-guides/migrating-python/)
- [Getting Started with the Python Chainguard Container](https://edu.chainguard.dev/chainguard/chainguard-images/getting-started/python/)
- [Installing APK Packages in Distroless Variants](https://edu.chainguard.dev/chainguard/chainguard-images/how-to-use/install-apks-in-distroless-variants/)
- [uv 0.11.32 Release](https://github.com/astral-sh/uv/releases/tag/0.11.32)
- [uv CLI Reference](https://docs.astral.sh/uv/reference/cli/)
- [Using uv in Docker](https://docs.astral.sh/uv/guides/integration/docker/)
- [uv Locking Environments](https://docs.astral.sh/uv/pip/compile/)
- [uv Pip Interface](https://docs.astral.sh/uv/pip/)
- [uv Environment Variables](https://docs.astral.sh/uv/configuration/environment/)
- [uv Project Configuration](https://docs.astral.sh/uv/concepts/projects/config/)
- [Python `venv` Documentation](https://docs.python.org/3/library/venv.html)
- [Python Packaging Platform Compatibility Tags](https://packaging.python.org/en/latest/specifications/platform-compatibility-tags/)
- [Python Package Formats](https://packaging.python.org/en/latest/discussions/package-formats/)
- [Dockerfile Reference](https://docs.docker.com/reference/dockerfile/)
- [Docker Multi-platform Builds](https://docs.docker.com/build/building/multi-platform/)
- [Docker `buildx build` Reference](https://docs.docker.com/reference/cli/docker/buildx/build/)

## Issues Found

- The lock-generation command used the development host's default Python and platform even though one lock file was later reused for Linux AMD64 and ARM64 images. This can omit dependencies selected by Linux or architecture-specific markers. Added `--universal` and an explicit `--python-version`, plus guidance to match the pinned runtime minor version or generate separate target-specific lock files.
- The lock-generation command emitted hashes, but the synchronization commands did not require every requirement to have one. uv verifies hashes that are present by default but accepts unhashed requirements unless `--require-hashes` is enabled. Added `--require-hashes` to both synchronization examples and documented uv's restrictions for hash-checking mode.
- The explanation of `UV_LINK_MODE=copy` incorrectly treated hardlinks and symlinks alike as dependencies on the uv cache. Hardlinks do not have symlink-style path coupling. Reworded the explanation to state that copy mode copies package files into the environment, avoids symlink mode's tight cache coupling, and avoids cross-filesystem link warnings with cache mounts.
- The cache example ran as UID 65532 but used a BuildKit cache mount with its default ownership of UID/GID 0, so a newly created mount would not be writable by the build user. Added `uid=65532,gid=65532` to the cache-mount options and updated the explanation.
- The `pip` verification claimed `None` unconditionally even though an application lock file can explicitly include `pip`. Clarified that the expected result assumes `requirements.lock` does not include `pip`.

## Review Notes

- The uv 0.11.32 binary was tested directly: it accepted `requirements.lock`, generated a universal Python 3.14 resolution, enforced hashes, created a relocatable virtual environment, installed a sample dependency, and left `pip` absent.
- Registry metadata for the current ARM64 Chainguard `python:latest` and `python:latest-dev` images was inspected. Both contained Python 3.14.6-r4; the images use UID 65532 and `/usr/bin/python`, and the development image contains `/usr/bin/install`.
- The Docker CLI and Buildx registry inspection were available, but the local Docker daemon was not running, so a complete container build was not executed.
- The post correctly warns that uv's relocatable option addresses virtual-environment paths, not Python ABI, operating-system, CPU-architecture, glibc, or shared-library compatibility.
- All documentation links in the post were reachable and pointed to the intended official resources at review time.
- The Chainguard `latest` tags are moving references. The post correctly recommends replacing them with reviewed digests for production use.
