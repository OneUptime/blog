# Validation Summary: How to Use Machine Configuration Patches in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Talos machine configuration patches
- Strategic merge patches
- JSON Patch / RFC 6902
- Kubernetes node labels and Pod Security Admission

## Sources Consulted
- Talos Linux Configuration Patches documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux MachineConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux configuration reference overview: https://docs.siderolabs.com/talos/v1.12/reference/
- Talos Linux network configuration documents: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/linkconfig, https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/resolverconfig, https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/timesyncconfig
- Talos Linux 1.12 release notes for network configuration changes: https://docs.siderolabs.com/talos/v1.12/getting-started/what%27s-new-in-talos
- Sidero Kubernetes guide for node labels and taints: https://docs.siderolabs.com/kubernetes-guides/advanced-guides/node-labels
- RFC 6902 JSON Patch: https://www.rfc-editor.org/rfc/rfc6902

## Issues Found
- The post used `talosctl apply-config --patch` for patching running nodes. Current `talosctl apply-config` uses `--config-patch` only with a local config file, while live node patching is done with `talosctl patch machineconfig` / `talosctl patch mc`. Updated the live-node examples and inline/file patch examples.
- Several examples used older `machine.network`, `machine.time`, and DNS shapes as current examples. Talos v1.12 introduced multi-document network configuration resources, so the hostname, NTP, static link, route, and resolver examples were updated to `HostnameConfig`, `TimeSyncConfig`, `LinkConfig`, and `ResolverConfig`.
- The node-label example used the wrong path, `machine.kubelet.nodeLabels`, and included labels that Talos documents as restricted by Kubernetes NodeRestriction. Updated it to `machine.nodeLabels` with allowed topology labels.
- The JSON Patch example attempted to add a nested label key directly, which would fail if the parent `nodeLabels` map did not already exist. Updated it to add the `machine.nodeLabels` map.
- The Pod Security Admission example used `pod-security.admission.config.k8s.io/v1`; the Talos v1.12 reference uses `v1alpha1` in its API server admission-control example. Updated the snippet to match the official Talos reference.
- The strategic merge list behavior section described legacy `network.interfaces` merge keys as the main example. Updated it to describe the current multi-document matching behavior by `kind`, `apiVersion`, and `name`.
- The Makefile used `--from-secrets`, which is not the current `talosctl gen config` flag. Updated it to `--with-secrets`.
- The debugging section used `talosctl get machineconfig -o yaml` as though it directly produced a reusable machine configuration file. Updated it to retrieve the `.spec` field using `talosctl get machineconfig v1alpha1 -o jsonpath='{.spec}'`.

## Review Notes
The post remains a valid technical guide after these corrections. Talos configuration is version-sensitive, especially around the v1.12 multi-document network configuration changes, so future updates should call out the Talos version if examples intentionally target older clusters.
