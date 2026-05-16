# Validation Summary: How to Migrate from kubeadm to Talos Linux

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Talos Linux (v1.9.0)
- Kubernetes
- kubeadm
- talosctl CLI
- kubectl
- etcd / etcdctl
- Cilium (CNI)
- Velero (backup/restore)
- Helm
- ArgoCD/Flux (GitOps, mentioned)
- VMware (mentioned for OVA provisioning)
- Talos Image Factory

## Sources Consulted
- [Talos v1.9 CLI reference](https://docs.siderolabs.com/talos/v1.9/reference/cli/)
- [Talos GitHub releases (v1.9.0 assets)](https://github.com/siderolabs/talos/releases/tag/v1.9.0)
- [Talos Image Factory](https://factory.talos.dev/)
- [Sidero Labs documentation on `--insecure` flag](https://www.talos.dev/v1.11/talos-guides/configuration/insecure/)
- [Cilium GitHub repository (verified that `main` no longer hosts `install/kubernetes/quick-install.yaml`; `v1.9` still does)](https://github.com/cilium/cilium)
- `gh release view v1.9.0 --repo siderolabs/talos` to enumerate actual asset filenames

## Issues Found

1. **Wrong Talos ISO filename (404 link).** The post linked to `https://github.com/siderolabs/talos/releases/download/v1.9.0/talos-amd64.iso`, but the v1.9.0 release asset is named `metal-amd64.iso`. The original URL returns 404. Updated the `wget` command to use `metal-amd64.iso`.

2. **Non-existent Talos OVA asset.** The post linked to `talos-amd64.ova` as a GitHub release asset, but Talos does not publish OVA files on GitHub releases at all. VMware OVAs are produced by the Talos Image Factory (`https://factory.talos.dev`). Replaced the broken `wget` line with the Image Factory URL pattern using the default (empty) schematic ID, plus a short comment explaining where OVAs come from. Verified the new URL returns HTTP 200.

3. **Broken Cilium CNI manifest URL.** The example patch referenced `https://raw.githubusercontent.com/cilium/cilium/main/install/kubernetes/quick-install.yaml`, which 404s — Cilium removed that file from the `main` branch and switched to a Helm-only install flow. Pinned the URL to the `v1.9` tag, which still hosts `install/kubernetes/quick-install.yaml`, so the `cni.urls` example remains a working illustration of Talos' `name: custom` CNI configuration.

## Review Notes

- The talosctl command surface used in the post (`gen secrets -o`, `gen config ... --with-secrets ... --output-dir`, `machineconfig patch ... --patch @file --output`, `apply-config --insecure --nodes --file`, `bootstrap`, `kubeconfig`) all match the v1.9 CLI reference.
- The `etcdctl snapshot save` invocation, `kubectl drain --ignore-daemonsets --delete-emptydir-data`, and Velero backup/restore commands are correct.
- The post uses Talos v1.9.0 throughout. As of 2026-05-16, the latest stable Talos release is v1.13.2; readers following this guide today should consider pinning to a more current version, but the v1.9.0 examples are still valid for that release line.
- The Cilium `quick-install.yaml` approach is itself a legacy installation method — newer Cilium versions are installed via Helm or the Cilium CLI. The pinned `v1.9` URL keeps the example working without restructuring, but a future revision could swap in an inline Helm-rendered manifest hosted by the author for a more modern illustration.
- The `cni.urls` example references a manifest that does not contain Talos-specific patches (RBAC, security context constraints). In a real deployment, additional Cilium configuration is typically required when running on Talos (e.g., disabling kube-proxy replacement options, mounting the correct kubelet socket). This is outside the scope of a migration overview but worth noting.
