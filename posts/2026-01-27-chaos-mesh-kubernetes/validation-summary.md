# Validation Summary: How to Use Chaos Mesh for Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Chaos Mesh
- Helm
- kubectl
- Chaos Mesh CRDs: PodChaos, NetworkChaos, IOChaos, TimeChaos, Schedule, Workflow
- Prometheus and Prometheus Operator ServiceMonitor
- Grafana
- Kubernetes RBAC
- Alertmanager webhooks

## Sources Consulted
- Chaos Mesh documentation: Install Chaos Mesh using Helm - https://chaos-mesh.org/docs/production-installation-using-helm/
- Chaos Mesh documentation: Simulate Pod Faults - https://chaos-mesh.org/docs/simulate-pod-chaos-on-kubernetes/
- Chaos Mesh documentation: Simulate Network Faults - https://chaos-mesh.org/docs/simulate-network-chaos-on-kubernetes/
- Chaos Mesh documentation: Simulate File I/O Faults - https://chaos-mesh.org/docs/simulate-io-chaos-on-kubernetes/
- Chaos Mesh documentation: Simulate Time Faults - https://chaos-mesh.org/docs/simulate-time-chaos-on-kubernetes/
- Chaos Mesh documentation: Define Scheduling Rules - https://chaos-mesh.org/docs/define-scheduling-rules/
- Chaos Mesh documentation: Create Chaos Mesh Workflow - https://chaos-mesh.org/docs/create-chaos-mesh-workflow/
- Chaos Mesh documentation: Manage User Permissions - https://chaos-mesh.org/docs/manage-user-permissions/
- Chaos Mesh documentation: Configure namespace for Chaos experiments - https://chaos-mesh.org/docs/configure-enabled-namespace/
- Chaos Mesh v2.8.3 CRD manifests - https://github.com/chaos-mesh/chaos-mesh/tree/v2.8.3/config/crd/bases
- Chaos Mesh Helm chart values and templates - https://github.com/chaos-mesh/chaos-mesh/tree/v2.8.3/helm/chaos-mesh
- Chaos Mesh v2.8.3 metrics source - https://github.com/chaos-mesh/chaos-mesh/blob/v2.8.3/pkg/metrics/chaos-controller-manager.go

## Issues Found
- The Pod Kill example used a `scheduler` field inside `PodChaos`, but Chaos Mesh scheduling is represented by a separate `Schedule` CRD. Changed the example to `kind: Schedule` with `spec.schedule`, `type: "PodChaos"`, and nested `podChaos`.
- The IOChaos examples used ambiguous relative path patterns. Updated `path` values to full file path patterns that align with the official IOChaos examples.
- The dashboard ingress values mixed Kubernetes Ingress-style TLS fields with Chaos Mesh Helm chart values. Updated the snippet to use `dashboard.ingress.ingressClassName`, host-level `tls` and `tlsSecret`, and chart-level `paths`.
- The Prometheus examples used non-existent or outdated metric names and labels such as `chaos_mesh_experiments`, `status`, and `result`. Updated them to use current Chaos Mesh controller metrics such as `chaos_controller_manager_chaos_experiments{phase="Running"}` and the actual `chaos_mesh_injections_total` labels.
- The safety annotation example claimed `chaos-mesh.org/inject: "false"` protects an individual pod. Current Chaos Mesh namespace filtering uses `chaos-mesh.org/inject=enabled` on namespaces when `controllerManager.enableFilterNamespace` is enabled. Updated the example to show the supported namespace annotation.
- The RBAC example said Kubernetes RBAC can explicitly deny resources. Kubernetes RBAC is allow-only, so the comment now says to omit IOChaos and TimeChaos from the role.

## Review Notes
- Helm and kubectl were not installed in the local workspace, so CLI validation was performed against official documentation and upstream Chaos Mesh Helm chart/CRD source instead of local `--help` or server-side dry-run.
- YAML and JSON fenced examples in the post were parsed locally after edits.
