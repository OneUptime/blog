# Validation Summary: How to Create Custom Talos Linux ISOs

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux v1.7.0
- Sidero Labs Image Factory (factory.talos.dev)
- Talos `imager` container tool (`ghcr.io/siderolabs/imager`)
- Talos system extensions (iscsi-tools, qemu-guest-agent)
- `talosctl` CLI
- QEMU / KVM (for VM testing)
- Docker (to run the imager)
- GitHub Actions (for automation)
- Linux kernel command-line arguments

## Sources Consulted
- Talos v1.7 Image Factory docs — https://docs.siderolabs.com/talos/v1.7/learn-more/image-factory/
- Talos v1.7 boot assets / imager docs — https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/boot-assets/
- Talos v1.7 kernel parameter reference — https://docs.siderolabs.com/talos/v1.7/reference/kernel/
- Talos source at v1.7.0 (Makefile and metal platform code) — https://github.com/siderolabs/talos/tree/v1.7.0
- `talosctl` reference — `get extensions`, `read`, `dmesg` subcommands
- QEMU user documentation for `-drive` and `qemu-img create`

## Issues Found

1. **"Embedding Configuration in the ISO" section was misleading.** The original example used `--extra-kernel-arg "talos.config=file:///config/config-patch.yaml"` together with a bind-mount of `$(pwd):/config`. The bind-mount only exposes the file to the build container; it is not copied into the resulting ISO. On the booted node, no such file path exists, so the `file://` URL fails. Talos v1.7's metal platform supports HTTP(S) URLs (with optional OAuth2) and the special sentinel `talos.config=metal-iso` for a separate filesystem-labelled image — there is no `file://` handler. Fixed by rewriting the section to describe hosting the config on HTTP(S) and using a real URL in `talos.config`, and added a note about the `metal-iso` approach for air-gapped installs. Renamed the section to "Pointing the ISO at a Machine Configuration" to better reflect what it actually does.

2. **QEMU `-drive ... size=20G` is not a valid parameter.** The `size=` option does not exist on QEMU's `-drive` flag; `-drive file=` only references an existing image. The disk has to be pre-created with `qemu-img create`. Fixed by adding a `qemu-img create -f qcow2 test-disk.qcow2 20G` line and removing the bogus `size=20G` from the `-drive` argument.

## Review Notes
- Extension image tags such as `ghcr.io/siderolabs/iscsi-tools:v0.1.4` and `ghcr.io/siderolabs/qemu-guest-agent:v8.2.0` are plausible but specific image tags evolve with each Talos release. The official Image Factory docs use fully-qualified tags pinned to a Talos release (e.g. `20231214.0-v1.7.6`). Readers should resolve the exact tag for their Talos version from the factory or the `siderolabs/extensions` repo before using these commands. Left as-is because the post's intent is illustrative and the tags shown do exist.
- The post pins everything to Talos v1.7.0. By the time of review (May 2026), Talos has shipped several newer minor versions; readers on a newer release should substitute the version string in image tags and download URLs. No fix made because the post is explicit about the version it targets.
- `python3 -m http.server` is fine for ad-hoc serving but is single-threaded and unsuitable for serving large ISOs to many nodes simultaneously; a production setup would use nginx or a dedicated PXE/TFTP/iPXE stack. Out of scope for the fix.
- The GitHub Actions workflow uploads `out/talos-amd64.iso` but the imager will produce a file with a different name (e.g. `metal-amd64.iso`). The artifact path may need adjustment depending on the imager output. Left untouched as it is illustrative and minor.
