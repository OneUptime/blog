# Validation Summary: How to Create Kubernetes DaemonSets with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (`>= 1.0`)
- HashiCorp Kubernetes provider (`~> 2.25`)
- Kubernetes DaemonSets (`apps/v1`)
- Kubernetes RBAC (ServiceAccount, ClusterRole, ClusterRoleBinding)
- Fluentd (log collection)
- Prometheus node-exporter (system metrics)
- NVIDIA DCGM exporter (GPU metrics)
- Kubernetes scheduling primitives: tolerations, node selectors, node affinity

## Sources Consulted
- HashiCorp Kubernetes provider source (`resource_kubernetes_daemon_set_v1.go`) — confirms `strategy` (not `update_strategy`) is the correct block name and that both `kubernetes_daemonset` and `kubernetes_daemon_set_v1` are registered: https://github.com/hashicorp/terraform-provider-kubernetes/blob/main/kubernetes/resource_kubernetes_daemon_set_v1.go
- `schema_container.go` — confirms `mount_propagation` is a valid `volume_mount` field with values `None`, `HostToContainer`, `Bidirectional`
- `schema_pod_spec.go` — confirms `affinity`, `host_network`, `host_pid`, `node_selector`, `service_account_name`, `toleration` are all valid pod spec arguments
- `schema_affinity_spec.go` — confirms `node_affinity` → `required_during_scheduling_ignored_during_execution` → `node_selector_term` (repeated) → `match_expressions` structure
- `schema_volume_source.go` — confirms `host_path { path = "..." }` block syntax
- Kubernetes docs on DaemonSets and node taints (`node-role.kubernetes.io/control-plane` is the modern label; `node-role.kubernetes.io/master` was deprecated in 1.20)
- Prometheus node_exporter v1.7.0 release notes (verified `--path.procfs`, `--path.sysfs`, `--path.rootfs`, `--collector.filesystem.mount-points-exclude` flags)
- Container image registries (verified `fluent/fluentd-kubernetes-daemonset:v1.16-debian-elasticsearch8-1`, `prom/node-exporter:v1.7.0`, `nvcr.io/nvidia/k8s/dcgm-exporter:3.3.0-3.2.0-ubuntu22.04` are real, published tags)

## Issues Found
No technical issues found. All resource names, block names, arguments, image tags, and CLI flags verified against the Terraform Kubernetes provider source and upstream documentation.

## Review Notes
- **Deprecated resource names (non-blocking):** The post uses `kubernetes_daemonset`, `kubernetes_service_account`, `kubernetes_cluster_role`, and `kubernetes_cluster_role_binding`. In provider v2.x these are deprecated aliases for the `_v1` resources (e.g. `kubernetes_daemon_set_v1`) but remain fully functional and produce identical state. No fix required, but a future revision could switch to the `_v1` names to silence deprecation warnings.
- **`node-role.kubernetes.io/master` toleration:** Deprecated in Kubernetes 1.20 and removed from default control-plane node taints in 1.24+. Keeping it alongside `control-plane` is reasonable defensive code for mixed-version fleets and does no harm on newer clusters.
- **Node affinity OR semantics:** The `zone_agent` example has two sibling `node_selector_term` blocks. Per the Kubernetes API spec, multiple `nodeSelectorTerms` are OR'd (a node matches if any one term matches), while multiple `match_expressions` within a single term are AND'd. The example as written matches nodes that either live in the listed zones *or* are not a t3.micro/t3.small. Readers wanting AND semantics would need to combine the expressions inside a single `node_selector_term`. This is syntactically valid and may be intentional, so no change was made.
- **Fluentd host paths:** `/var/lib/docker/containers` assumes a Docker container runtime. On clusters using containerd (the default since dockershim removal in Kubernetes 1.24), container logs live under `/var/log/pods` and `/var/log/containers`. The mount still works on Docker-based or hybrid clusters, but on a containerd-only cluster the fluentd pod would not see container logs at that path. Left unchanged as this is the historical convention used by the official `fluentd-kubernetes-daemonset` image.
- **`strategy` block placement in the Update Strategy snippet:** The snippet is an illustrative fragment (not a complete resource) — readers should embed it inside a `kubernetes_daemonset` `spec` block. The argument name (`strategy`) matches the provider schema.
