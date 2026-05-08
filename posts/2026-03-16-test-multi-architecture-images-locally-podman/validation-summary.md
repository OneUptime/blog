# Validation Summary: How to Test Multi-Architecture Images Locally with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container images
- Multi-architecture image manifests
- QEMU user-mode emulation
- Linux binfmt_misc
- Bash
- jq

## Sources Consulted
- Podman `run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `manifest inspect` documentation: https://docs.podman.io/en/v5.2.5/markdown/podman-manifest-inspect.1.html
- Podman `image inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-image-inspect.1.html
- Debian `qemu-user` package documentation: https://packages.debian.org/unstable/qemu-user
- Fedora `qemu-user-binfmt` package documentation: https://packages.fedoraproject.org/pkgs/qemu/qemu-user-binfmt/

## Issues Found
- The ARMv7 example used `--platform linux/arm/v7`. Podman documents platform selection as `OS/ARCH` and provides `--variant` for ARM variants, so the example now uses `--platform linux/arm --variant v7`.
- The manifest verification script built platform strings that included variants and passed them directly to `--platform`. It now keeps `OS/ARCH` and `variant` separate and passes `--variant` only when the manifest entry has one.
- The manifest verification script used `podman inspect --format '{{.Architecture}}' "${MANIFEST}"` inside a per-platform loop. That inspect command is not platform-scoped in the example and could report misleading metadata, so it was removed in favor of the actual `uname -m` runtime check.
- The automated test script used `((FAILURES++))` with `set -euo pipefail`. In Bash, the first post-increment evaluates to zero and can terminate the script under `set -e`; the increments now use `((FAILURES+=1))`.
- The benchmark command used double quotes around the `sh -c` script, causing `$(seq 1 1000)` to be expanded by the host shell before `podman run`. It now uses single quotes so the loop is evaluated inside the container.

## Review Notes
Podman was not installed in the local environment, so command behavior was verified against official Podman documentation rather than local `--help` output. The examples remain application-dependent where they reference `myapp:latest`, `/usr/local/bin/app`, and an expected `Running` output.
