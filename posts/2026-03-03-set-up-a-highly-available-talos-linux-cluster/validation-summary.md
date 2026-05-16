# Validation Summary: How to Set Up a Highly Available Talos Linux Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.6)
- Kubernetes
- talosctl CLI
- etcd
- HAProxy
- Talos Virtual IP (VIP)
- Longhorn (distributed storage)
- kube-prometheus-stack / Prometheus
- Helm

## Sources Consulted
- Talos Linux v1.6 configuration reference (release-1.6 branch): `website/content/v1.6/reference/configuration/v1alpha1/config.md`
- Talos Linux v1.6 VIP networking docs: https://www.talos.dev/v1.6/talos-guides/network/vip/
- Talos `talosctl` CLI source: `cmd/talosctl/cmd/mgmt/gen/config.go` (release-1.6)
- siderolabs/talos GitHub releases (verified `ghcr.io/siderolabs/installer:v1.6.0` tag exists)
- HAProxy configuration manual (TCP mode directives)

## Issues Found
1. **Deprecated `--output-dir` flag in `talosctl gen config`** — The post used `--output-dir _out`. In Talos v1.6, this flag is hidden and kept only for backwards compatibility; the current/official flag is `--output` (`-o`). Updated the example to use `--output _out`.

## Review Notes
- The VIP YAML configuration (`machine.network.interfaces[].vip.ip`) matches the official v1.6 schema.
- `cluster.etcd.advertisedSubnets` is the documented canonical location for this field (the same `EtcdConfig` struct also appears under `machine.etcd` in some examples, but `cluster.etcd` is the standard top-level location for control-plane etcd settings).
- `machine.certSANs` is correctly used to add SANs to the Talos machine API certificate; the Kubernetes API server SANs are handled automatically by `talosctl gen config` from the supplied cluster endpoint.
- All `talosctl` subcommands referenced (`gen config`, `apply-config`, `bootstrap`, `etcd members`, `health`, `kubeconfig`, `reboot`) exist in v1.6 with the flags shown (`--nodes`, `--endpoints`, `--talosconfig`, `--insecure`, `--config-patch @file`).
- `ghcr.io/siderolabs/installer:v1.6.0` is a real, published image tag.
- HAProxy snippet is syntactically valid (`mode tcp`, `balance roundrobin`, server `check fall N rise N` are all real directives).
- Helm install commands for Longhorn and kube-prometheus-stack reference the correct, current chart repositories.
- Minor stylistic observation (not corrected per scope): the `talosctl etcd members` example in the "Verifying High Availability" section omits `--talosconfig`/`--endpoints` flags used elsewhere in the post; it works if the talosconfig context is set as default, but is inconsistent with surrounding examples.
