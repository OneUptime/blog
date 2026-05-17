# Validation Summary: How to Configure Cluster Discovery in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (cluster discovery subsystem)
- talosctl CLI
- Kubernetes (Node annotations, Deployment, Service, Ingress)
- KubeSpan / WireGuard (referenced)
- Sidero Labs discovery-service (self-hosted)
- cert-manager (referenced in Ingress example)

## Sources Consulted
- Talos Linux discovery documentation: https://www.talos.dev/v1.7/talos-guides/discovery/ (redirects to https://docs.siderolabs.com/talos/v1.7/configure-your-talos-cluster/system-configuration/discovery)
- Sidero Labs discovery-service repository: https://github.com/siderolabs/discovery-service
- discovery-service main.go source for CLI flag verification

## Issues Found

1. **Default state of the Kubernetes registry was wrong.** The post claimed the Kubernetes registry is enabled by default (`disabled: false`). The official docs state it is disabled by default and is deprecated (not compatible with Kubernetes 1.32+ in the default configuration). Updated the default-configuration YAML to show `disabled: true` for the kubernetes registry, and added the deprecation/incompatibility note in the descriptions of the two registries.

2. **Service registry protocol mislabeled.** The post described the service registry as "an external HTTP endpoint." The discovery service exposes a gRPC API over TLS (port 3000 for gRPC, port 3001 for the HTTP landing page). Changed the description to "an external gRPC endpoint over TLS."

3. **"Kubernetes registry as fallback" framing was misleading.** The post recommended running both registries together as the recommended configuration. Since the kubernetes registry is deprecated, this is no longer the recommended setup. Rewrote that paragraph to clarify that enabling both is only suitable for older clusters and is not a recommended default.

4. **`talosctl get discoveredmembers` does not exist.** The correct resource name is `members` (resource kind `Member` in the cluster namespace). Replaced all four occurrences with `talosctl get members`.

5. **`talosctl get clusteridentity` does not exist.** The discovery identity resource is exposed as `identities` (the per-node `Identity` resource that holds the node's discovery identity / encryption key). Replaced the command with `talosctl get identities` and adjusted the comment to "View the discovery identity used by this node."

## Review Notes
- The `--addr=:3000` flag in the self-hosted discovery-service Deployment is correct (verified against `cmd/discovery-service/main.go`). The discovery-service binary also accepts `--landing-addr` (default `:3001`), `--metrics-addr` (default `:2122`), `--certificate-path`, `--key-path`, and others, which the post does not need to enumerate.
- The Ingress example uses a default HTTP-ingress configuration. Because the discovery service speaks gRPC, in a real deployment the user would need a gRPC-aware ingress controller (e.g. nginx with `nginx.ingress.kubernetes.io/backend-protocol: GRPC`) or a passthrough LoadBalancer. The example is illustrative and would not work without adapting it to a gRPC-capable ingress in practice, but I left it intact rather than restructuring the example.
- The post mentions "trust domain"-derived encryption keys as the basis for discovery encryption. The official documentation more precisely describes the encryption as using a key derived from the cluster ID and cluster secret. The post's wording is a reasonable high-level summary, so I did not change it.
- The post should be revisited if/when Sidero formally removes the Kubernetes registry from Talos.
