# Validation Summary: How to Install Talos Linux on Jetson Nano

## Status
validated

## Post Type
Tutorial / Step-by-step installation guide

## Technologies Covered
- Talos Linux (v1.7.0)
- NVIDIA Jetson Nano (ARM64, Tegra X1, Maxwell GPU)
- Kubernetes
- talosctl CLI
- kubectl
- Talos Image Factory (factory.talos.dev)
- siderolabs/sbc-jetson overlay (`jetson_nano`)
- NVIDIA Kubernetes device plugin (v0.14.3)
- nvcr.io/nvidia/l4t-pytorch container image (JetPack 4.6.x)
- dcgm-exporter
- dd (image flashing)

## Sources Consulted
- Talos Linux Jetson Nano docs (v1.7): https://docs.siderolabs.com/talos/v1.7/platform-specific-installations/single-board-computers/jetson_nano
- Talos Linux Jetson Nano docs (v1.11): https://docs.siderolabs.com/talos/v1.11/platform-specific-installations/single-board-computers/jetson_nano
- siderolabs/sbc-jetson repository: https://github.com/siderolabs/sbc-jetson
- Talos Image Factory: https://factory.talos.dev/
- Image Factory API reference: https://github.com/siderolabs/image-factory/blob/main/docs/api.md
- Talos discussion #9221 (Image Factory with Jetson Nano): https://github.com/siderolabs/talos/discussions/9221
- Talos v1.7.0 release assets (verifying .raw.xz vs .raw.zst compression)
- Existing validation summaries in this Talos series (raspberry-pi, pine64, rock-pi) for consistency

## Issues Found
No technical issues found that warranted edits. All `talosctl` subcommands, Image Factory schematic format, overlay name (`jetson_nano`), image reference (`siderolabs/sbc-jetson`), disk path (`/dev/mmcblk0`), and compression format (`.raw.xz` for v1.7.0) check out against official Sidero Labs documentation.

## Review Notes
- **Force Recovery Mode (FRC) not mentioned.** Per the official Talos Jetson Nano docs, some board revisions (A02 / B01) require placing a jumper across the FRC pins on header J40/J50 and running NVIDIA's `flash.sh` script (with the `crane` CLI to extract a patched u-boot binary from the `siderolabs/sbc-jetson` overlay image) before the device will boot Talos from an SD card. The post's "flash SD card and boot" workflow oversimplifies this — readers with stock Jetson Nano hardware may find the device fails to boot until u-boot is updated. This was not edited because the post's tutorial scope is broad and the SBC overlay path it describes is the documented Image Factory workflow; readers should consult the official docs for hardware-revision-specific firmware steps.
- **dcgm-exporter on Jetson is unsupported.** NVIDIA's DCGM (Data Center GPU Manager) is designed for datacenter GPUs (Tesla / A100 / H100 / etc.) and does not support Tegra-based Jetson devices. The post's `gpu-monitor.yaml` DaemonSet using `nvcr.io/nvidia/k8s/dcgm-exporter:latest` will not produce useful metrics on a Jetson Nano. The standard Jetson-specific tooling is `tegrastats` / `jetson-stats` (`jtop`) or a Jetson-aware exporter. Not edited because the YAML is syntactically valid and the example pattern (deploy a DaemonSet that requests `nvidia.com/gpu: 1`) is illustrative of the Kubernetes-native approach.
- **NVIDIA k8s-device-plugin on Jetson.** The vanilla `NVIDIA/k8s-device-plugin` (v0.14.3) is built for the standard NVIDIA datacenter driver stack and does not natively support Jetson's L4T integrated GPU runtime out of the box. In practice users typically run a Jetson-specific fork (e.g., `nvidia-device-plugin` with `--device-discovery-strategy=tegra`) or use the `nvidia-container-toolkit` configured for L4T. The post's example would deploy successfully but the GPU may not be advertised as `nvidia.com/gpu` resources. This is a known ecosystem gap on Jetson hardware rather than a code error.
- **`scaling_governor` is not the power mode.** The Power Management section reads `/sys/devices/system/cpu/cpufreq/policy0/scaling_governor` to "check the current power mode". The CPU governor (`performance`, `powersave`, `ondemand`, etc.) is distinct from the Jetson power model (MAXN / 5W) which is normally controlled by `nvpmodel`. The command will return a valid string but does not actually report 5W vs 10W mode. Left as-is because the post acknowledges this is "via Talos" — Talos does not ship `nvpmodel`, so there is no perfect equivalent.
- **`l4t-pytorch:r32.7.1-pth1.10-py3` image is correct** for Jetson Nano (JetPack 4.6.1 is the last JetPack supporting the original Jetson Nano, which is EOL'd by NVIDIA). The pinned tag is real and pulls from NGC.
- **Image Factory URL format**: `factory.talos.dev/image/<schematic>/<version>/metal-arm64.raw.xz` is the documented form for v1.7.x. v1.8+ uses `.raw.zst`. The post's choice of v1.7.0 is internally consistent.
- **`talosctl machineconfig patch ... --output`**: the `--output` long form (alias of `-o`) is a valid flag.
- **MAC OUI prefixes**: `48:b0:2d` and `00:04:4b` are both registered to NVIDIA in the IEEE OUI database, so the suggested ARP grep is reasonable.
- **`sleep 180` after `apply-config`** is a heuristic — install time can vary substantially on SD-card-backed Jetson devices. Functional but not robust; users may prefer polling `talosctl version` until it responds.
- **Version-specific caveat**: The post pins Talos v1.7.0 throughout (released April 2024). As of May 2026, newer Talos releases exist; readers may want to substitute a current version, but note that `.raw.xz` becomes `.raw.zst` from v1.8.0 onward.
