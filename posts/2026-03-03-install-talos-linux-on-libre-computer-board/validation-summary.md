# Validation Summary: How to Install Talos Linux on Libre Computer Board

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Talos Linux (v1.9.0)
- Libre Computer single-board computers (Le Potato AML-S905X-CC, Renegade ROC-RK3328-CC, Sweet Potato AML-S905X-CC-V2)
- Amlogic S905X and Rockchip RK3328 SoCs (ARM64 / Cortex-A53)
- Kubernetes
- talosctl CLI
- kubectl
- Talos Image Factory (factory.talos.dev)
- Talos imager (ghcr.io/siderolabs/imager)
- dd / xz / zstd (image flashing and decompression)

## Sources Consulted
- Talos v1.9.0 GitHub release assets: https://github.com/siderolabs/talos/releases/tag/v1.9.0
- Talos boot assets / imager docs: https://docs.siderolabs.com/talos/v1.9/talos-guides/install/boot-assets/
- Talos Image Factory: https://factory.talos.dev/
- siderolabs/overlays repository (official SBC overlays): https://github.com/siderolabs/overlays
- Libre Computer Sweet Potato (AML-S905X-CC-V2) announcement: https://hub.libre.computer/t/2023-09-01-libre-computer-aml-s905x-cc-v2-sweet-potato-now-available/2831
- Libre Computer Renegade (ROC-RK3328-CC) product info confirming 1/2/4 GB DDR4 variants
- Prior validation of `https://talos.dev/install` shell installer as an official method (Talos docs)

## Issues Found
- **Wrong image filename and decompression command for Talos v1.9.0** — The post downloaded `metal-arm64.raw.xz` and decompressed with `xz -d`. Starting with v1.9, Talos publishes metal images compressed with zstd, so the actual asset is `metal-arm64.raw.zst`. The `wget` URL would 404 and the `xz -d` invocation would fail. Updated the download URL to `metal-arm64.raw.zst` and the decompression command to `zstd -d metal-arm64.raw.zst`.

## Review Notes
- The `https://talos.dev/install` shell installer URL is the documented official install path.
- The `talosctl gen config`, `talosctl apply-config --insecure`, `talosctl bootstrap`, `talosctl health`, `talosctl kubeconfig`, and `talosctl config endpoint/node` commands are all valid v1.9 CLI syntax.
- The imager Docker invocation (`ghcr.io/siderolabs/imager:v1.9.0 metal --arch arm64 --extra-kernel-arg net.ifnames=0`) is correct. The `-t` flag is optional and only affects colored output in interactive use.
- The `kubelet.extraArgs` machine-config snippet (`system-reserved`, `kube-reserved`) is a valid pass-through to the kubelet binary.
- The post recommends the generic `metal-arm64` image first, then steers readers to the Image Factory for board-specific overlays. In practice, generic metal ARM64 images will not boot most Libre Computer boards without the right U-Boot/device-tree assets — readers should expect to use the Image Factory path. The post does call this out ("you may get better results with a board-specific image") so the framing is not technically wrong, just optimistic.
- Official Talos SBC overlay coverage for Libre Computer in `siderolabs/overlays` is limited (only the ALL-H3-CC H5 has an upstream overlay at the time of review). Le Potato, Sweet Potato, and Renegade users typically need community/third-party overlays or to build a custom image. The post's "or compatible model" hedging keeps this technically accurate but readers should be prepared to source an overlay.
- Le Potato RAM is stated as "2GB" — Le Potato ships in both 1GB and 2GB DDR3 SKUs, so "up to 2GB" would be slightly more precise, but the 2GB variant does exist and the statement is not wrong.
- Le Potato power: USB-C is the connector on Sweet Potato; the original Le Potato uses micro-USB. The post's blanket "5V/3A for most models" is a conservative recommendation that holds for both.
- The `nmap -sn 192.168.1.0/24` scan is a fine ARP/ping discovery example for the typical home subnet.
- The `screen /dev/ttyUSB0 115200` serial-console example assumes a USB-to-UART adapter; the baud rate (115200) matches Amlogic/Rockchip U-Boot defaults.
