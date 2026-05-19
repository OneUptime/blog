# Validation Summary: How to Monitor GPU Usage with nvidia-smi on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nvidia-smi (NVIDIA System Management Interface)
- NVIDIA GPU drivers / CUDA
- nvidia-smi `dmon` (device monitoring)
- nvidia-smi `pmon` (process monitoring)
- nvidia-smi `--query-gpu` / `--query-compute-apps`
- Persistence mode, power limit, clock locking, ECC controls
- `nvidia_gpu_exporter` for Prometheus
- Prometheus scrape configuration
- `nvtop` interactive monitor
- systemd unit files, cron, bash scripting

## Sources Consulted
- Official NVIDIA System Management Interface documentation: https://docs.nvidia.com/deploy/nvidia-smi/index.html
- NVIDIA Useful nvidia-smi Queries article (`--query-compute-apps` fields): https://nvidia.custhelp.com/app/answers/detail/a_id/3751/
- NVIDIA Driver Persistence docs: https://docs.nvidia.com/deploy/driver-persistence/index.html
- NVIDIA GPU Memory Error Management (ECC recovery flags): https://docs.nvidia.com/deploy/a100-gpu-mem-error-mgmt/error-recovery-and-response-flags.html
- Ubuntu nvidia-smi(1) manpage: https://manpages.ubuntu.com/manpages/jammy/man1/nvidia-smi.1.html
- `nvidia_gpu_exporter` project: https://github.com/utkuozdemir/nvidia_gpu_exporter

## Issues Found

1. **Incorrect `nvidia-smi dmon -s` flag descriptions.** The post claimed `v=vram` and `t=temp`. Per the official `nvidia-smi` manpage, the correct meanings are:
   - `p` = Power Usage **and** Temperature
   - `u` = Utilization
   - `c` = Proc and Mem Clocks
   - `v` = **Power and Thermal Violations** (not VRAM)
   - `m` = FB and Bar1 Memory (this is what corresponds to VRAM usage)
   - `e` = ECC errors and PCIe Replay errors
   - `t` = **PCIe Rx and Tx Throughput** (not temperature — temperature is reported under `p`)

   Rewrote the comment block with the correct meanings. Also changed the example log command from `-s putm` to `-s pum` since temperature is already covered by `p` and `t` would log PCIe throughput, not temperature as the original code implied.

2. **`sudo nvidia-smi -r` does not reset ECC counters.** The post listed `nvidia-smi -r` as the command to "reset accumulated ECC counts". `-r` (`--gpu-reset`) performs a full GPU reset (secondary bus reset), not an ECC counter reset. The correct flag is `-p` (`--reset-ecc-errors=`), which accepts `0` for volatile counters or `1` for aggregate counters. Replaced the line with `sudo nvidia-smi -p 0` and clarified the 0/1 semantics in the comment. Also fixed the misleading section comment that conflated enabling ECC with resetting ECC counts.

## Review Notes
- `nvidia-smi --query-compute-apps=...,used_gpu_memory` and `...,used_memory` both work — `used_gpu_memory` is a valid alias for `used_memory`. Left as-is.
- The reset-to-default-power-limit one-liner pipes `power.default_limit` through `tr -d ' MiB W'`. The `MiB` removal is unnecessary (power values are in watts) but harmless. Not a correctness issue.
- `CUDA_VISIBLE_DEVICES=0` prefix on the kill one-liner is misleading — `CUDA_VISIBLE_DEVICES` does not affect `nvidia-smi` output; the `--id=0` flag does the actual filtering. Works as intended but the env var is decorative. Left as-is to preserve author voice.
- `--auto-boost-default` is largely a legacy control for pre-Pascal GPUs and may be a no-op on modern (Turing/Ampere/Hopper/Ada) cards, but the flag still exists in `nvidia-smi`. Not corrected.
- `--lock-gpu-clocks=<single-value>` is documented as accepting either a single value or a `min,max` pair, so the example is valid.
- Example output header shows driver `545.23.06` and CUDA `12.3`. As of mid-2026 these are older releases; the output format is unchanged in current drivers, so this is fine for illustration.
