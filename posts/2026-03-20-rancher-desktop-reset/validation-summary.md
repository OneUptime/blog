# Validation Summary: How to Reset Rancher Desktop to Factory Settings

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Desktop
- `rdctl`
- Kubernetes
- `kubectl`
- Helm
- `nerdctl`
- Docker / Moby

## Sources Consulted
- Rancher Desktop Introduction: https://docs.rancherdesktop.io/
- Rancher Desktop Installation: https://docs.rancherdesktop.io/getting-started/installation/
- Rancher Desktop Kubernetes Preferences: https://docs.rancherdesktop.io/ui/preferences/kubernetes/
- Rancher Desktop Virtual Machine Hardware Preferences: https://docs.rancherdesktop.io/ui/preferences/virtual-machine/hardware/
- Rancher Desktop Troubleshooting: https://docs.rancherdesktop.io/ui/troubleshooting/
- Rancher Desktop `rdctl` command reference: https://docs.rancherdesktop.io/references/rdctl-command-reference/
- Rancher Desktop release notes: https://github.com/rancher-sandbox/rancher-desktop/releases
- Rancher Desktop source for deprecated `rdctl factory-reset`: https://github.com/rancher-sandbox/rancher-desktop/blob/main/src/go/rdctl/cmd/factoryReset.go
- Rancher Desktop source for current `rdctl reset` command: https://github.com/rancher-sandbox/rancher-desktop/blob/main/src/go/rdctl/cmd/reset.go
- Rancher Desktop source for platform log paths: https://github.com/rancher-sandbox/rancher-desktop/blob/main/pkg/rancher-desktop/utils/__tests__/paths.spec.ts

## Issues Found
- The prerequisites overstated the documented resource guidance and implied admin privileges were always required. I changed them to a supported system with Rancher Desktop installed plus the documented recommended resources of 8 GB RAM and 4 CPU.
- The Virtual Machine preferences description claimed GUI disk allocation support. Current Rancher Desktop UI documentation only documents CPU and memory there, so I removed the disk-allocation claim.
- The `rdctl set --kubernetes-version` examples used old hard-coded versions with a `v` prefix. I updated them to a current documented Kubernetes version format without the `v` prefix.
- The post used `rdctl factory-reset` for current reset workflows. That command is still supported for backward compatibility but is deprecated and hidden; I replaced it with `rdctl reset --factory` and used `rdctl reset --k8s` for Kubernetes workload reset.
- The post used `rdctl status`, which is not a current documented `rdctl` command. I replaced it with `rdctl info`.
- The post claimed `rdctl list-settings | grep kubernetesVersion` lists available Kubernetes versions. `rdctl list-settings` shows current active settings instead, so I corrected the description and command to match actual behavior.
- The troubleshooting log paths were inaccurate and malformed. I corrected the macOS path to `~/Library/Logs/rancher-desktop/`, preserved the Windows and Linux log directories, and fixed the missing line break.
- The final troubleshooting command claimed to show VM status via `rdctl list-settings | grep -i vm`, which does not provide runtime VM status. I replaced it with `rdctl info`, which reports Rancher Desktop information including the VM IP.

## Review Notes
- `rdctl set` examples in the official docs still show legacy flag aliases such as `--kubernetes-version` and `--container-engine`, even though current help output also exposes dotted flag names. The post now uses the still-documented legacy style.
- The exact Kubernetes versions available in Rancher Desktop vary by Rancher Desktop release. The post was validated on April 23, 2026 against the then-current documentation and release materials.
