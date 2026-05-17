# Validation Summary: How to Build Custom Talos Linux Images from Source

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.7)
- Talos build system (Make + Docker / `docker buildx`)
- `talosctl` CLI
- `siderolabs/talos` GitHub repository
- `siderolabs/pkgs` repository (for kernel/package modifications)
- QEMU / `qemu-user-static` for cross-arch builds
- GitHub Actions (CI/CD example)

## Sources Consulted
- Talos developing-Talos docs: https://docs.siderolabs.com/talos/v1.7/build-and-extend-talos/custom-images-and-development/developing-talos
- Talos v1.7 Makefile: https://github.com/siderolabs/talos/blob/v1.7.0/Makefile
- Talos CLI reference (v1.7): https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos install script: https://www.talos.dev/install
- `siderolabs/pkgs` repository: https://github.com/siderolabs/pkgs

## Issues Found
1. **Incorrect `talosctl cluster create` flag (`--nodes 3`).** The `--nodes` flag is not valid for `talosctl cluster create`; the documented flags are `--controlplanes` and `--workers`. Replaced `--nodes 3` with `--controlplanes 1 --workers 2`.
2. **Misleading installer tag claim.** The post stated `make installer` produces `ghcr.io/siderolabs/installer:latest`, but the `TAG` variable defaults to `git describe --tag --always --dirty`, not `latest`. Reworded the comment to reflect the actual default.
3. **Incorrect ISO filename.** The post claimed the ISO is written to `_out/talos-amd64.iso`. The Talos imager produces `metal-amd64.iso` for the metal platform under `_out/`. Updated the path accordingly.
4. **Kernel patching procedure was inaccurate.** The post implied that creating `patches/kernel/` in the main `talos` repo and running `make kernel` would auto-apply patches. The kernel actually lives in the separate [`siderolabs/pkgs`](https://github.com/siderolabs/pkgs) repository, with patches placed in `kernel/build/patches/`. Rewrote that section to describe the real workflow.

## Review Notes
- Talos v1.7.0 is used as the worked example; current Talos releases have advanced well past v1.7, so the reader should adjust the checkout tag to a version that matches their environment.
- The Makefile in v1.7.0 pins `GO_VERSION=1.22`. The post still recommends "Go 1.21 or later", which is acceptable because the build runs inside containers (`docker buildx`); the host Go is only needed for `make talosctl`. No edit made, but readers building against newer Talos releases should match the Go version pinned in the Makefile of the tag they check out.
- The `make installer ARCH=arm64` form does work, but for newer Talos versions the recommended pattern for non-native builds is `make installer PLATFORM=linux/arm64` (via `docker buildx`). Both still work in v1.7; nothing changed here.
- The Image Factory / Imager (separate from this from-source build) is now the officially-recommended way to produce custom Talos images for most users. The from-source workflow described here remains valid for contributors and deep customizations.
- Custom kernel modules generally need to be built as system extensions and signed via the Talos kernel build, since module loading requires keys only available during the kernel build. Worth being aware of if a reader is trying to load an out-of-tree driver at runtime.
