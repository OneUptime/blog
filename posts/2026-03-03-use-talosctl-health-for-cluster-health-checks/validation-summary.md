# Validation Summary: How to Use talosctl health for Cluster Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl
- Kubernetes
- etcd
- Shell scripting
- GitHub Actions

## Sources Consulted
- Sidero Labs Talos CLI reference: https://docs.siderolabs.com/talos/latest/reference/cli
- Sidero Labs Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Sidero Labs Talos Getting Started guide: https://docs.siderolabs.com/talos/v1.10/getting-started/getting-started
- Terraform Provider Talos cluster health data source documentation: https://registry.terraform.io/providers/siderolabs/talos/latest/docs/data-sources/cluster_health

## Issues Found
- The post described the default `talosctl health --wait-timeout` as usually around 10 minutes. The current Talos CLI reference documents the default as `20m0s`, so the timeout note was corrected.
- The etcd troubleshooting example used `talosctl services`, while the current CLI reference documents `talosctl service` for listing or checking services. The command was updated.
- The bootstrap gate example said that after `talosctl health` passes it is safe to install CNI. A full `talosctl health` run checks Kubernetes readiness, CoreDNS, kube-proxy, and node readiness, so required CNI should already be installed or managed by Talos for the check to pass. The comment was narrowed to deploying applications.
- The comprehensive health check script treated the absence of non-running kube-system pods as a failure because `grep` returns non-zero when it finds no matches. The script was updated to set `K8S_OK=0` only when the node and pod commands succeed and no unexpected pod status lines are found.

## Review Notes
The examples assume a configured `talosconfig` and Kubernetes access where applicable. Talos manages Flannel by default; clusters configured with `cluster.network.cni.name: none` need a custom CNI installed before Kubernetes readiness and the full `talosctl health` check can pass.
