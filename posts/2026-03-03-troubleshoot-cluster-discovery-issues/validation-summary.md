# Validation Summary: How to Troubleshoot Cluster Discovery Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Talos Linux
- Talos cluster discovery
- KubeSpan
- Kubernetes Node annotations and API health checks
- DNS, TLS, NTP, and proxy configuration

## Sources Consulted
- Talos Linux Discovery Service documentation: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/discovery
- Talos Linux machine configuration reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/v1alpha1/config
- Talos Linux machine configuration editing guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/editing-machine-configuration
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux Host DNS documentation: https://docs.siderolabs.com/talos/v1.12/networking/host-dns/
- Talos Linux TimeSyncConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/network/timesyncconfig
- Talos Linux TrustedRootsConfig reference: https://docs.siderolabs.com/talos/v1.12/reference/configuration/security/trustedrootsconfig
- Kubernetes API health endpoints documentation: https://kubernetes.io/docs/reference/using-api/health-checks/

## Issues Found
- The post used `talosctl get discoveredmembers`, but current Talos discovery documentation exposes `affiliates` and `members` for discovery and cluster membership inspection. Updated discovery checks and the monitoring example to use `talosctl get affiliates`.
- The post used `talosctl get clusteridentity`, which is not documented in the current Talos CLI/discovery references. Replaced it with reading `.spec.cluster.id` from the `machineconfig v1alpha1` resource using `jsonpath`.
- The post recommended enabling the Kubernetes discovery registry as a general redundancy mechanism. Current Talos documentation says the Kubernetes registry is deprecated, disabled by default, and incompatible with Kubernetes 1.32+ default `AuthorizeNodeWithSelectors` behavior. Updated the configuration and guidance to prefer the service registry.
- The Kubernetes health check used `kubectl get componentstatus`, which relies on the deprecated ComponentStatus API. Replaced it with `kubectl get --raw='/readyz?verbose'`, matching Kubernetes API health endpoint guidance.
- The NTP example used the older `machine.time.servers` shape. Updated it to the current `TimeSyncConfig` document format.
- The private CA note referred generically to the node trust store. Updated it to point at Talos `TrustedRootsConfig`.
- The opening paragraph described possible cluster "split-brain" during a network partition. Reworded it to "inconsistent membership views" to avoid implying that discovery failure bypasses Kubernetes/etcd quorum behavior.
- The DNS verification command grepped controller logs for `nameserver`, which is not a reliable Talos DNS health check. Replaced it with `talosctl get dnsupstream` for host DNS upstream health.

## Review Notes
The post is technically relevant and useful after the corrections. Self-hosted discovery service health endpoints and deployment labels can vary by installation, so those examples remain illustrative rather than universal.
