# Validation Summary: How to Deploy NVIDIA GPU Operator on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.6 / system extensions / machine config)
- NVIDIA GPU Operator (Helm chart)
- NVIDIA Container Toolkit
- NVIDIA Open GPU Kernel Modules
- Kubernetes (kubectl, Pods, PrometheusRule)
- containerd CRI plugin configuration
- Helm v3
- DCGM Exporter (Prometheus metrics)
- NVIDIA MIG (Multi-Instance GPU)
- CUDA container images

## Sources Consulted
- Talos NVIDIA GPU (OSS) guide: https://www.talos.dev/v1.6/talos-guides/configuration/nvidia-gpu/
- Talos NVIDIA GPU (proprietary) guide: https://www.talos.dev/v1.6/talos-guides/configuration/nvidia-gpu-proprietary/
- Talos `talosctl` CLI reference: https://www.talos.dev/v1.6/reference/cli/
- Sidero extensions repo: https://github.com/siderolabs/extensions
- GHCR package: `ghcr.io/siderolabs/nvidia-open-gpu-kernel-modules`
- GHCR package: `ghcr.io/siderolabs/nvidia-container-toolkit`
- NVIDIA GPU Operator chart values: https://github.com/NVIDIA/gpu-operator/blob/master/deployments/gpu-operator/values.yaml
- Kubernetes `kubectl wait` documentation (jsonpath conditions, 1.23+)
- NVIDIA DCGM Exporter metrics reference
- Grafana dashboard #12239 (NVIDIA DCGM)

## Issues Found

1. **Wrong containerd config drop-in path.** Original used `/var/cri/conf.d/20-nvidia.toml`. Talos's documented path for CRI plugin overlays is `/etc/cri/conf.d/`, with the standard example using `20-customization.part`. Changed to `/etc/cri/conf.d/20-customization.part`.

2. **Wrong `talosctl` subcommand for patching a running node.** Original used `talosctl apply-config --patch @file.yaml --nodes ...`. `apply-config` requires `--file` (a full machine configuration); `--patch` only modifies that file before sending. The correct command for applying a patch on top of a node's existing configuration is `talosctl patch machineconfig --patch @file.yaml --nodes ...`. Updated accordingly.

3. **`kubectl wait --for=condition=complete` does not work on Pods.** The `complete` condition is a Job condition only. For a Pod with `restartPolicy: OnFailure` that is expected to terminate successfully, the supported approach (Kubernetes 1.23+) is `--for=jsonpath='{.status.phase}'=Succeeded`. Updated the command.

4. **`operator.defaultRuntime` is not a valid key in the current GPU Operator chart.** That field existed in old (1.x) charts but was removed. The closest current setting is `operator.runtimeClass` (defaults to `nvidia`). Replaced `operator.defaultRuntime: containerd` with `operator.runtimeClass: nvidia`.

5. **`validator.driver.env` is not a valid path in the chart values.** The validator subchart exposes `validator.env` (and `validator.plugin.env`); there is no `validator.driver` subkey. Flattened the YAML to use `validator.env`.

6. **NVIDIA container toolkit image tag used the wrong second segment.** The tag pattern for `ghcr.io/siderolabs/nvidia-container-toolkit` is `<driver-version>-<toolkit-version>` (toolkit versions are like `v1.14.x`), not the Talos version. Updated the tag from `535.129.03-v1.6.0` to `535.129.03-v1.14.6`, a real published tag. (The kernel-modules image tag uses `<driver>-<Talos-version>`, so `535.129.03-v1.6.0` is the correct shape for that one and was left as-is.)

## Review Notes
- The blog states "Talos v1.5 or later (for GPU extension support)." System extensions have technically been available since Talos v1.0, but v1.5+ is a reasonable minimum given the imager workflow shown.
- The `GPUMemoryExhausted` alert expression `DCGM_FI_DEV_FB_USED / DCGM_FI_DEV_FB_FREE > 0.95` is dimensionally odd — for a true "95% of total framebuffer used" alert, the denominator should be `(DCGM_FI_DEV_FB_USED + DCGM_FI_DEV_FB_FREE)`. As written it fires once `used` exceeds 95% of `free`, i.e. roughly when memory crosses ~48% utilization. Left as-is to avoid changing alert semantics, but worth tightening in a future revision.
- Driver `535.129.03` is now several releases behind current production NVIDIA drivers. The post will benefit from a refresh to a more recent driver pair (e.g. 550.x or 555.x) within the next ~6 months.
- The `helm repo add nvidia https://helm.ngc.nvidia.com/nvidia` URL is correct.
- The Grafana DCGM dashboard ID (12239) and the listed DCGM metric names are all valid.
