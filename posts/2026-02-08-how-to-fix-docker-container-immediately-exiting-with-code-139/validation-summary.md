# Validation Summary: How to Fix Docker Container Immediately Exiting with Code 139

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker Build and Buildx
- Docker Compose
- Linux signals and exit statuses
- Linux core dumps
- Linux seccomp
- Alpine Linux, musl, and glibc compatibility
- gdb, strace, and ldd debugging workflows

## Sources Consulted
- Docker Docs: Run containers and Docker exit status behavior, https://docs.docker.com/engine/containers/run/
- Docker Docs: `docker container run` options including `--ulimit`, `--cap-add`, `--security-opt`, and `--platform`, https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Seccomp security profiles for Docker, https://docs.docker.com/engine/security/seccomp/
- Docker Docs: Buildx `--platform` behavior, https://docs.docker.com/engine/reference/commandline/build
- Docker Docs: Compose services `platform` and `ulimits`, https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose build `platforms`, https://docs.docker.com/reference/compose-file/build/
- Docker Docs: `docker manifest inspect`, https://docs.docker.com/reference/cli/docker/manifest/
- Linux man-pages: `bash(1)` fatal signal exit status convention, https://man7.org/linux/man-pages/man1/bash.1.html
- Linux man-pages: `core(5)` core dump files and `/proc/sys/kernel/core_pattern`, https://man7.org/linux/man-pages/man5/core.5.html
- Alpine Linux Wiki: musl libc usage, https://wiki.alpinelinux.org/wiki/Musl
- Local CLI help: `docker run --help`, `docker build --help`, `docker buildx build --help`, `docker compose config --help`, and `strace -h`

## Issues Found
- Clarified that exit code 139 usually indicates SIGSEGV and that the 128+signal convention is shell-style fatal signal reporting.
- Corrected the segmentation fault definition from only "not allocated" memory to invalid or inaccessible memory.
- Changed the architecture mismatch section to avoid implying every wrong-architecture binary segfaults; completely wrong architectures commonly fail before execution, while emulation and platform mismatches can still crash.
- Corrected the Alpine/glibc section to say glibc-linked binaries on Alpine usually fail with missing loader or library errors, and only sometimes segfault with partial compatibility or incompatible libraries.
- Fixed the `ldd` example for glibc-on-Alpine from a musl library "not found" example to glibc loader or `libc.so.6` missing examples.
- Updated the multi-platform Buildx example to include `--push`, because multi-platform builds generally need an explicit output to create a usable manifest list.
- Simplified the fresh image pull example so it removes the local image before pulling again.
- Clarified Docker ulimit wording to refer to runtime defaults and explicit overrides, rather than saying containers always inherit host ulimits directly.
- Clarified that Docker seccomp denials usually produce permission errors, while application error handling can turn them into crashes.
- Replaced the instruction to write `/proc/sys/kernel/core_pattern` from inside the container with host-level `sysctl` guidance, because changing that sysctl generally requires host root privileges and affects the host.
- Added assumptions to the quick diagnostic script: `/app/myapp`, `sh`, `ldd`, and `strace` must exist in the image.

## Review Notes
The command syntax and Compose snippets validate against current Docker CLI and Compose behavior. The quick diagnostic script is intentionally generic and may need binary path or package adjustments for minimal images.
