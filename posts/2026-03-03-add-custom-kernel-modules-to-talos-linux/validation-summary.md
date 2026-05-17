# Validation Summary: How to Add Custom Kernel Modules to Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (v1.7.x)
- Linux kernel modules
- Talos system extensions (OCI image format)
- `talosctl` CLI
- Talos machine configuration (`v1alpha1`)
- Talos Image Factory (`factory.talos.dev`)
- Siderolabs `bldr` build tool / `siderolabs/extensions` repo
- Docker multi-stage builds

## Sources Consulted
- Talos system extensions guide: https://docs.siderolabs.com/talos/v1.7/talos-guides/configuration/system-extensions/
- Talos v1alpha1 configuration reference (machine.kernel.modules): https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Siderolabs extensions repository: https://github.com/siderolabs/extensions
- Siderolabs extensions iscsi-tools directory layout: https://github.com/siderolabs/extensions/tree/main/storage/iscsi-tools
- Talos Image Factory API reference: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Siderolabs `bldr` build tool: https://github.com/siderolabs/bldr

## Issues Found

1. **Incorrect file listing for `storage/iscsi-tools/`.** The post claimed the directory contained `Dockerfile  README.md  manifest.yaml  vars.yaml`. The actual directory contains `README.md  iscsid.yaml  manifest.yaml.tmpl  patches  pkg.yaml  vars.yaml` — there is no `Dockerfile`, and the manifest is templated. Updated the `ls` output and the "key files" list to match reality, and added a short sentence explaining that official extensions are built with `bldr` (via `pkg.yaml`) rather than a plain Dockerfile, while noting that a Dockerfile approach is still valid as long as it produces the expected OCI layout (`manifest.yaml` at the root and contents under `rootfs/`).

2. **First Dockerfile used `apt-get` on `ghcr.io/siderolabs/tools`.** The Siderolabs `tools` image is a minimal cross-compilation toolchain, not a Debian/Ubuntu base; `apt-get` does not exist on it and the `RUN apt-get update && apt-get install -y ...` block would fail immediately. Additionally, `linux-headers-$(uname -r)` would resolve against the build host's kernel, not the Talos kernel, so even on a Debian base it would pull the wrong headers. Replaced the broken stage with a stage that copies kernel headers/source from `ghcr.io/siderolabs/kernel:v1.7.0` into the build stage, which is how Talos out-of-tree modules are actually compiled.

3. **Incorrect output paths for the extension OCI image.** Both Dockerfile examples copied the compiled `.ko` files into `/lib/modules/...` in the final `scratch` stage. Talos extension OCI images require contents to live under a `rootfs/` directory at the image root (with `manifest.yaml` at the root). Updated both examples to copy modules into `/rootfs/usr/lib/modules/...` so the resulting image actually matches the Talos extension format.

## Review Notes

- The `manifest.yaml` example matches the v1alpha1 schema documented in the siderolabs/extensions README (name, version, author, description, compatibility.talos.version). The official convention for `version` is `<package version>-<extensions repo version>`, but a plain semver value like `1.0.0` is accepted, so no change was made.
- The `machine.kernel.modules` configuration block (name + parameters list) matches the v1alpha1 reference exactly.
- The Image Factory schematic example (`POST https://factory.talos.dev/schematics`) matches the documented API contract; the response (a schematic ID used to build an installer URL of the form `factory.talos.dev/installer/<id>:<talos-version>`) is not shown in the post, but the request itself is correct.
- All `talosctl` subcommands used (`version`, `read`, `get extensions`, `dmesg`, `ls`, `patch machineconfig`, `upgrade --image`) are valid in v1.7.
- The "Method 3" custom-installer Dockerfile uses `--build-arg INSTALLER=...` and `--build-arg EXTENSION=...` as a generic illustration; the referenced `Dockerfile.installer` isn't shown. The conventional Siderolabs approach is to use the `imager` tool or the Image Factory; the Dockerfile pattern shown is plausible but readers should treat it as a sketch rather than a turnkey recipe.
- The post is pinned to Talos v1.7.0 throughout. The same APIs and schemas hold for later v1.7.x releases; readers on newer Talos majors should bump the tag in the `ghcr.io/siderolabs/{kernel,tools,installer}` images and the `talosctl` versions to match their cluster.
