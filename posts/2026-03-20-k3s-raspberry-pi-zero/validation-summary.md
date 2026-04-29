# Validation Summary: How to Install K3s on Raspberry Pi Zero

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Raspberry Pi OS
- Raspberry Pi Zero / Zero W
- Linux systemd
- Linux cgroups

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Agent CLI Reference: https://docs.k3s.io/cli/agent
- K3s Token CLI Reference: https://docs.k3s.io/cli/token
- K3s Resource Profiling: https://docs.k3s.io/reference/resource-profiling
- K3s installer script: https://get.k3s.io
- K3s latest release assets: https://api.github.com/repos/k3s-io/k3s/releases/latest
- Raspberry Pi Getting Started / Imager setup: https://www.raspberrypi.com/documentation/computers/getting-started.html
- Raspberry Pi configuration / cmdline editing: https://www.raspberrypi.com/documentation/computers/configuration.html
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/

## Issues Found
- The post assumed `pi` as the SSH username. Current Raspberry Pi Imager setup requires configuring a user account, so the SSH example was changed to `ssh <your-username>@raspberrypi.local` and the imaging step was updated to mention configuring a username.
- The boot parameter path was outdated for current Raspberry Pi OS releases. It was changed from `/boot/cmdline.txt` to `/boot/firmware/cmdline.txt`, with a note that older Raspberry Pi OS releases still use `/boot/cmdline.txt`.
- The cgroup example included `cgroup_enable=cpuset`, but K3s officially documents `cgroup_memory=1 cgroup_enable=memory` as the required Raspberry Pi setting. The example was corrected to match the K3s requirements documentation.
- The K3s config used a vague token placeholder. It was changed to reference the documented server-side agent token location: `/var/lib/rancher/k3s/server/agent-token`.
- The install command placed `INSTALL_K3S_EXEC="agent"` before `sudo sh -`, which can prevent the variable from reaching the installer. It was changed to the documented install-script form using `sh -s -`.
- The post said the installer downloads `k3s-armv6l`, but the current K3s installer and release assets use the 32-bit ARM build name `k3s-armhf`. The explanatory text was corrected.
- The sample joined-node output showed `v1.28.7+k3s1`, which was stale relative to the current release train. The example was updated to `v1.35.4+k3s1` as of 2026-04-29.

## Review Notes
- K3s officially supports `armhf` and documents a minimum agent requirement of 1 CPU core and 512 MB RAM, so using a Pi Zero as an agent is technically plausible but leaves little headroom for real workloads.
- `kubectl top node` assumes the packaged `metrics-server` remains enabled on the K3s server. That is the default in K3s unless explicitly disabled.
- The guide uses `kubelet-arg` entries in `config.yaml`. K3s still supports this, but upstream Kubernetes documents many equivalent kubelet CLI flags as deprecated in favor of kubelet configuration files. K3s supports kubelet config drop-ins on v1.32 and newer.
