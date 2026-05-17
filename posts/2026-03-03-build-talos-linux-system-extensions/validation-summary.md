# Validation Summary: How to Build Talos Linux System Extensions

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Talos Linux (v1.7.x context)
- Talos system extensions (OCI image format)
- Sidero Labs `bldr` build tool and `Pkgfile` format
- Sidero Labs `extensions` repository
- `imager` and Image Factory (factory.talos.dev)
- Docker / OCI images for packaging
- `talosctl` CLI
- Linux kernel modules and firmware packaging
- `crane` (go-containerregistry) for image inspection
- GitHub Actions for CI

## Sources Consulted
- Talos Linux v1.7 system extensions docs: https://docs.siderolabs.com/talos/v1.7/talos-guides/configuration/system-extensions/
- Sidero Labs extensions repository: https://github.com/siderolabs/extensions
- Sidero Labs `bldr` repository: https://github.com/siderolabs/bldr
- Sidero Labs Image Factory: https://github.com/siderolabs/image-factory
- Talos issue 9224 documenting `.machine.install.extensions` deprecation: https://github.com/siderolabs/talos/issues/9224
- Sidero Labs blog: "How to build a Talos system extension"
- Example pkg.yaml from extensions repo (`storage/iscsi-tools/pkg.yaml`)

## Issues Found

1. **Incorrect rootfs paths for kernel modules and firmware.** The original "Extension Structure" tree placed modules under `rootfs/lib/modules/` and firmware under `rootfs/lib/firmware/`. Per the official extensions README, the permitted paths are `/usr/lib/modules/` and `/usr/lib/firmware/`. Updated the tree diagram and the two `COPY` instructions in the kernel-module and firmware Dockerfile examples to write into `/rootfs/usr/lib/modules/` and `/rootfs/usr/lib/firmware/` respectively. Also added the `/etc/cri/conf.d/` permitted path to the tree for completeness.

2. **Incorrect `bldr` install path.** The post used `go install github.com/siderolabs/bldr@latest`, but `bldr`'s `main` package lives in `cmd/bldr`. Updated the command to `go install github.com/siderolabs/bldr/cmd/bldr@latest`.

3. **Deprecated extension installation method.** The "Testing Your Extension" section recommended adding extensions under `machine.install.extensions` in the machine configuration. This field has been deprecated since Talos v1.5.0 (extensions are now baked into the installer image), and Talos v1.7+ emits a warning when it is used. Rewrote the section to recommend Image Factory and the `imager` tool, and updated the machine configuration snippet to set `machine.install.image` to a factory-built installer reference instead.

## Review Notes
- The `manifest.yaml` schema shown in the post matches the format documented in the official extensions repository (version `v1alpha1` with `metadata.name`, `metadata.version`, `metadata.author`, `metadata.description`, and `metadata.compatibility.talos.version`).
- The simple multi-stage Dockerfile approach for building extensions is unofficial. The Sidero Labs–supported workflow is `bldr` + `Pkgfile` inside the `extensions` repo (which the post does also show). The Dockerfile examples remain valid as illustrative starting points, especially after the `/usr/lib/...` path fix.
- The `ghcr.io/siderolabs/tools` image tag scheme does not align with Talos release tags (e.g., `v1.7.0`); in practice the `tools` image is pinned to its own version (such as `v1.7.0-alpha.0-…`). The hypothetical tag is left in place because the example is illustrative and not meant to be a literal working command, but readers should consult the `tools` image tag list before copying it.
- The `Pkgfile` snippets are minimalist examples; real extensions in the `siderolabs/extensions` repo include additional fields (sources, build, install, test, finalize stages with checksums). The simplified examples are fine for a getting-started guide.
- Kernel modules placed under `/usr/lib/modules/` should generally live under a `<kernel-version>/` subdirectory and be referenced by `modules.dep` for `modprobe` to find them; the post's `cp *.ko /rootfs/usr/lib/modules/` is illustrative only.
