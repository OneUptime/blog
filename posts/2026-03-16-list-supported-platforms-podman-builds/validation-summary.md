# Validation Summary: How to List Supported Platforms for Podman Builds

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Podman
- QEMU user-mode emulation
- Linux binfmt_misc
- systemd-binfmt
- OCI image indexes and manifest lists
- jq
- Bash

## Sources Consulted
- Podman `run` documentation for `--platform`: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `build` documentation for `--platform`, `--manifest`, and multi-architecture builds: https://docs.podman.io/en/v5.1.0/markdown/podman-build.1.html
- Podman `manifest inspect` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-manifest-inspect.1.html
- Podman `info` documentation for Go template formatting: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Linux kernel binfmt_misc documentation: https://www.kernel.org/doc/html/latest/admin-guide/binfmt-misc.html
- systemd-binfmt documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd-binfmt.service.html
- OCI image specification for platform `os`, `architecture`, and `variant` fields: https://github.com/opencontainers/image-spec/blob/main/image-index.md

## Issues Found
- Manifest parsing examples treated every manifest descriptor as a runnable platform. Current registry indexes can include non-platform metadata descriptors such as attestations with `unknown/unknown`, so the `jq` examples could output invalid platform strings and feed them into `podman run --platform`. Added filters requiring real platform fields and excluding `unknown/unknown`.
- The Alpine 3.19 example output omitted the ARM64 variant. Updated `linux/arm64` to `linux/arm64/v8`, matching the variant field commonly present in the manifest descriptor and the OCI platform model.
- The QEMU handler loops assumed `/proc/sys/fs/binfmt_misc/qemu-*` always matched at least one file. Added existence checks so the examples behave correctly when no QEMU handlers are registered.
- The native platform mapping only normalized `x86_64` and `aarch64`. Expanded it to cover common ARM and 32-bit x86 `uname -m` outputs.

## Review Notes
Podman was not installed in the local workspace, so Podman-specific CLI verification was done against official Podman documentation rather than local `--help` output. The manifest-filtering behavior was checked against the current `alpine:3.19` registry manifest using Docker's manifest inspection output.
