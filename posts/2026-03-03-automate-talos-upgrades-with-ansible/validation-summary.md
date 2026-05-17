# Validation Summary: How to Automate Talos Upgrades with Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl CLI, upgrade workflow, etcd snapshots)
- Ansible (playbooks, inventory, ansible.builtin.command/debug/fail/pause modules, serial execution)
- Kubernetes (kubectl drain/uncordon/get nodes, node readiness checks)
- YAML inventory format

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.8/reference/cli/
- Upgrading Talos Linux: https://docs.siderolabs.com/talos/v1.8/configure-your-talos-cluster/lifecycle-management/upgrading-talos
- Upgrading Kubernetes (Sidero): https://docs.siderolabs.com/kubernetes-guides/advanced-guides/upgrading-kubernetes
- Talos source for `version` command (v1.8.0): https://github.com/siderolabs/talos/blob/v1.8.0/cmd/talosctl/cmd/talos/version.go
- kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Removal of `kubectl version --short`: https://github.com/kubernetes/kubernetes/issues/115130
- Ansible builtin modules: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/

## Issues Found
- **`kubectl version --short` is removed in kubectl 1.28+.** The post targets Kubernetes 1.30 but used `kubectl version --short` in two tasks of `playbooks/upgrade-kubernetes.yml`. The `--short` flag was deprecated in v1.26 and removed in v1.28, so running it against a 1.30 cluster fails with `unknown flag: --short`. Replaced both occurrences with plain `kubectl version`, which now produces the same concise output that `--short` used to provide.

## Review Notes
- `talosctl upgrade --preserve` is used on both control plane and worker nodes. The flag is primarily meaningful on control plane nodes (it preserves the EPHEMERAL partition and keeps etcd data intact, which protects quorum). On workers it is harmless but has no real effect since workers don't run etcd. The flag is currently undocumented in `talosctl upgrade --help` (see siderolabs/talos#10172) but is functional.
- `talosctl upgrade-k8s --to 1.30.0` correctly omits the leading `v` — Talos expects the bare version string for `--to`.
- The post uses the standard `ghcr.io/siderolabs/installer:<version>` image. If readers have customized their nodes with system extensions, they should use the schematic-specific image at `factory.talos.dev/installer/<schematic-id>:<version>` instead, but that's outside the scope of this guide.
- `current_talos_version` is declared as a variable in the inventory but never referenced in any of the playbooks shown. Not technically incorrect, just unused.
- `connection: local` on the upgrade plays is appropriate since `talosctl` runs from the Ansible controller against the API endpoint, not over SSH to the Talos node (Talos has no SSH).
