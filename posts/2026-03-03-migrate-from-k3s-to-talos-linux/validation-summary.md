# Validation Summary: How to Migrate from k3s to Talos Linux

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Talos Linux (v1.9)
- k3s (lightweight Kubernetes distribution)
- Kubernetes
- kubectl
- Helm
- Velero (backup/restore)
- Traefik (ingress controller)
- Longhorn (CSI storage)
- MetalLB (bare-metal load balancer)
- Flannel / Cilium (CNI)
- ServiceLB / Klipper (k3s LB)
- local-path-provisioner
- metrics-server
- etcd / SQLite

## Sources Consulted
- Talos Linux Getting Started Guide (v1.9): https://docs.siderolabs.com/talos/v1.9/getting-started/getting-started
- Talos Configuration Reference (v1alpha1): https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos CLI Reference (`talosctl gen secrets`): https://docs.siderolabs.com/talos/v1.9/reference/cli/
- Talos install script: https://www.talos.dev/install
- k3s etcd-snapshot documentation: https://docs.k3s.io/cli/etcd-snapshot

## Issues Found
No technical issues found. All technical claims, commands, configuration snippets, and URLs in the post were verified against official sources:

- `curl -sL https://talos.dev/install | sh` — confirmed as a valid official install script that auto-detects OS/arch and downloads talosctl from the latest GitHub release.
- `talosctl gen secrets -o secrets.yaml` — `-o`/`--output-file` is a valid flag (default is even "secrets.yaml").
- `talosctl gen config <name> <endpoint> --with-secrets --output-dir` — correct syntax.
- `talosctl apply-config --insecure --nodes --file` — correct.
- `talosctl bootstrap` / `talosctl kubeconfig` — correct.
- `k3s etcd-snapshot save --name pre-migration-backup` — `--name` is a valid flag for this command.
- k3s file paths (`/var/lib/rancher/k3s/server/db/state.db`, `/var/lib/rancher/k3s/server/manifests/`, `/var/lib/rancher/k3s/storage/`, `/etc/rancher/k3s/registries.yaml`) are all correct.
- Talos installer image `ghcr.io/siderolabs/installer:v1.9.0` is a valid release.
- Talos config structures (`machine.kubelet.extraArgs` as map[string]string, `machine.install.{disk,image}`, `machine.registries.mirrors.<host>.endpoints`, `cluster.network.cni.name`, `cluster.proxy.disabled`) all match the official v1alpha1 schema.
- Helm chart repositories (Traefik, Longhorn, MetalLB) and manifest URLs (local-path-provisioner, metrics-server) all point to the correct upstream sources.
- Architectural comparisons (k3s default SQLite datastore, bundled Traefik, bundled local-path-provisioner, default Flannel CNI, ServiceLB/Klipper) are factually correct.

## Review Notes
- The post pins `ghcr.io/siderolabs/installer:v1.9.0`. Talos releases regularly; readers should consider using a newer minor version if available at migration time. The configuration shown is generally schema-compatible across recent v1.x releases, but the installer image tag should be matched to the desired Talos version.
- The `cluster.network.cni.name: flannel` value matches Talos's built-in default. If users opt to switch to Cilium, they would set `name: none` and install Cilium via Helm — this is mentioned implicitly in the proxy-disabled comment but not fully detailed.
- The `system-reserved`/`kube-reserved` kubelet args use the correct comma-separated `key=value` format expected by kubelet.
- The example HelmChart CRD conversion preserves the essential fields (`chart`, `repo`, `valuesContent`) accurately.
- The blog mentions running both clusters in parallel during transition — this is sound advice given that workload migration (especially stateful) carries data integrity risk.
