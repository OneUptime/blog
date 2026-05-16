# Validation Summary: How to Migrate from MicroK8s to Talos Linux

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- MicroK8s (Canonical's snap-based Kubernetes distribution)
- Talos Linux (immutable Kubernetes OS by Sidero Labs)
- talosctl CLI
- Kubernetes (kubectl, manifests, CRDs)
- Helm (v3)
- Velero (backup/restore, node-agent file-system backup)
- Longhorn (storage)
- ingress-nginx
- MetalLB (IPAddressPool, L2Advertisement)
- cert-manager
- kube-prometheus-stack (Prometheus + Grafana)
- Kubernetes Dashboard
- Docker Registry (twuni Helm chart)
- containerd (container runtime)
- CoreDNS
- yq (mikefarah v4)

## Sources Consulted
- MicroK8s documentation: https://microk8s.io/docs
- MicroK8s addon defaults (pod CIDR 10.1.0.0/16, service CIDR 10.152.183.0/24)
- Talos Linux documentation: https://www.talos.dev/v1.9/
- talosctl reference: https://www.talos.dev/v1.9/reference/cli/
- Sidero installer image registry: https://github.com/siderolabs/talos/pkgs/container/installer
- Velero documentation: https://velero.io/docs/
- Velero AWS plugin compatibility matrix: https://github.com/vmware-tanzu/velero-plugin-for-aws
- Longhorn Helm chart: https://charts.longhorn.io
- ingress-nginx Helm chart: https://kubernetes.github.io/ingress-nginx
- MetalLB Helm chart and CRDs (metallb.io/v1beta1): https://metallb.io
- cert-manager Helm chart (v1.15+ `crds.enabled` flag): https://cert-manager.io/docs/installation/helm/
- prometheus-community charts: https://github.com/prometheus-community/helm-charts
- Kubernetes Dashboard Helm chart: https://kubernetes.github.io/dashboard
- twuni Docker Registry Helm chart: https://helm.twun.io

## Issues Found
No technical issues found.

## Review Notes
- The Velero AWS plugin pinned to `v1.10.0` corresponds to Velero v1.14. By early 2026 newer Velero/plugin pairs are available (e.g., v1.11.x for Velero v1.15), but the pinned version still works; readers may want to bump to the latest compatible pair.
- The Talos installer image tag `v1.9.0` is valid; Talos has continued to release subsequent minor versions (v1.10+) so readers may prefer a newer release.
- `talosctl machineconfig patch` is the modern subcommand and is correct; equivalent alternatives include passing `--config-patch` directly to `talosctl gen config`.
- The cert-manager Helm flag `crds.enabled=true` is the post-v1.15 syntax. Older versions used `installCRDs=true`; for older cert-manager releases the legacy flag would be required.
- Setting the Talos service subnet to MicroK8s's default `10.152.183.0/24` (instead of Talos's default `10.96.0.0/12`) is unusual but intentional here for service-IP continuity during migration — worth flagging only because it's atypical, not because it's wrong.
- The MicroK8s containerd compatibility claim is accurate; MicroK8s switched from Dockershim to containerd well before this guide's timeframe.
- `microk8s status | grep -i cluster` is a loose check for clustering state — it works but is not the cleanest way to inspect HA status (`microk8s status` plainly shows `high-availability`).
