# Validation Summary: How to Install Talos Linux on Pine64

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux (v1.9.0)
- Pine64 single-board computers (ROCKPro64, Quartz64, Pine A64)
- Kubernetes
- ARM64 architecture
- `talosctl` CLI
- `kubectl` CLI
- Talos Image Factory
- Rockchip RK3399 SoC

## Sources Consulted
- Talos Linux v1.9 official documentation: https://docs.siderolabs.com/talos/v1.9/
- Talos `talosctl` install guide: https://docs.siderolabs.com/talos/v1.9/getting-started/talosctl
- Talos Linux v1.9.0 GitHub release assets: https://github.com/siderolabs/talos/releases/tag/v1.9.0
- Talos Image Factory: https://factory.talos.dev
- Talos single-board computers documentation (Pine64 page): https://github.com/siderolabs/talos/blob/v1.9.0/website/content/v1.9/talos-guides/install/single-board-computers/pine64.md
- Sidero Rockchip SBC overlay repository: https://github.com/siderolabs/sbc-rockchip

## Issues Found
- **Incorrect image file extension and decompression tool** (Step 1): The post instructed downloading `metal-arm64.raw.xz` from the Talos v1.9.0 GitHub release and extracting with `xz -d`. The actual release asset for v1.9.x (and v1.8+ generally) is `metal-arm64.raw.zst` (zstd-compressed), not xz. I verified this by listing the v1.9.0 release assets directly via `gh release view`. Updated the `wget` URL to `metal-arm64.raw.zst` and the extraction command to `zstd -d metal-arm64.raw.zst` so the commands will actually succeed.

## Review Notes
- The `curl -sL https://talos.dev/install | sh` installer script is the official method documented by Sidero Labs.
- All `talosctl` subcommands shown (`gen config`, `apply-config --insecure`, `config endpoint`, `config node`, `bootstrap`, `health`, `kubeconfig`, `version --client`) are valid in v1.9.
- The machine config YAML examples (install disk, installer image `ghcr.io/siderolabs/installer:v1.9.0`, static network interface configuration) match the current Talos machine config schema.
- The ROCKPro64 hardware claims are accurate: RK3399 SoC (hexa-core: 2× Cortex-A72 + 4× Cortex-A53), up to 4 GB LPDDR4, PCIe slot for NVMe, and the 1500000 baud serial console rate is correct for Rockchip RK3399 boards.
- The post correctly notes that boards using Rockchip platforms (ROCKPro64) generally need a board-specific image from the Talos Image Factory with the appropriate overlay, since the vanilla generic ARM64 metal image does not include the required u-boot bootloader and device tree for these boards. Readers should be aware that the generic metal-arm64 image alone is unlikely to boot a ROCKPro64 successfully; the Image Factory path is the practical route.
- Quartz64 support in Talos depends on the Image Factory overlay availability — readers should confirm their specific Pine64 board model is listed in the Image Factory's single-board computer options before proceeding.
- Talos v1.9.0 was released in late 2024. As of May 2026, newer Talos releases exist; readers may wish to use a more recent version, though the workflow described remains valid.
