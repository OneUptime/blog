# Validation Summary: How to Use Kubernetes Endpoint Discovery in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Node annotations
- Talos cluster discovery registries
- Talos service discovery registry
- Talos Kubernetes discovery registry
- KubeSpan / WireGuard peer discovery
- talosctl
- kubectl
- jq

## Sources Consulted
- Talos v1.13 Discovery Service documentation: https://docs.siderolabs.com/talos/v1.13/configure-your-talos-cluster/system-configuration/discovery
- Talos v1.13 talosctl CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Talos v1.12 MachineConfig reference for `cluster.discovery.registries`: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos v1.12 KubeSpan documentation: https://docs.siderolabs.com/talos/v1.12/networking/kubespan
- Talos configuration patching documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching

## Issues Found
- The post said the Kubernetes registry is enabled by default. Current Talos documentation says the service registry is enabled by default and the Kubernetes registry is disabled by default, so the post now states that explicitly.
- The post did not mention that the Kubernetes registry is deprecated. Added the current Talos caveat that Kubernetes 1.32 and later restrict Node read access via `AuthorizeNodeWithSelectors`, which prevents the Kubernetes registry from functioning in the default configuration.
- The post claimed Kubernetes discovery annotations contain encrypted data that the API server cannot read. Current Talos docs show plain Talos discovery metadata such as `cluster.talos.dev/node-id`, `networking.talos.dev/assigned-prefixes`, and `networking.talos.dev/self-ips`; the encryption claim applies to the external discovery service. Replaced that explanation.
- The post used obsolete or incorrect Talos resource names: `discoveredmembers` and singular `kubespanpeerstatus`. Replaced them with documented resources: `members`, `affiliates --namespace=cluster-raw`, and `kubespanpeerstatuses`.
- The jq annotation examples could fail on nodes without annotations and only matched `cluster.talos.dev` annotations. Updated them to handle missing annotations and include the documented `networking.talos.dev` annotations.
- The monitoring script used an unsupported `talosctl get --no-headers` flag. Replaced it with a table-output count using `awk`.
- The performance section overstated total load as simply O(N). Adjusted it to distinguish request count from the size of full-node reads.
- The troubleshooting RBAC command used a broad `update nodes` check. Changed it to a more targeted `patch node <node-name>` check with the node identity and `system:nodes` group.

## Review Notes
The article is now accurate as a compatibility guide for environments that intentionally enable the deprecated Kubernetes registry. For new Talos clusters, the service registry remains the documented default and recommended discovery registry, especially for KubeSpan.
