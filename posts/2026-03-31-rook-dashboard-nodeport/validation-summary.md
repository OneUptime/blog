# Validation Summary: How to Expose the Ceph Dashboard via NodePort in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Dashboard (mgr module)
- Kubernetes Services (ClusterIP, NodePort)
- kubectl CLI
- CephCluster CRD (ceph.rook.io/v1)
- Linux firewall (iptables, firewalld)

## Sources Consulted
- Rook official documentation: Dashboard section — https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Rook CephCluster CRD specification — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Rook source code: `pkg/operator/ceph/cluster/mgr/dashboard.go` — service name (`rook-ceph-mgr-dashboard`), port constants (`dashboardPortHTTPS = 8443`), secret name (`rook-ceph-dashboard-password`), username (`admin`)
- Rook source code: `pkg/operator/k8sutil/service.go` — `CreateOrUpdateService` reconciliation behavior (confirms operator reverts manual service patches)
- Rook GitHub issue #10535 (closed as wontfix) — confirms no native NodePort support in `spec.dashboard`

## Issues Found

### 1. Option 1 (Patch Existing Service) — Missing reconciliation warning
- **What was wrong:** The post presented `kubectl patch` to change the dashboard service to NodePort as a viable approach, without mentioning that the Rook operator reconciles this service and will revert the type back to ClusterIP on the next reconciliation loop.
- **What was changed:** Added a note after the patch section warning that the operator will revert the change, and that this approach is only suitable for quick testing. Directs readers to Option 2 for a persistent solution.
- **Why:** The Rook operator's `CreateOrUpdateService` function overwrites the service spec on each reconciliation cycle. Without this warning, readers would apply the patch and find their dashboard inaccessible after the next reconcile, with no understanding of why.

### 2. Option 2 (Dedicated NodePort Service) — Missing `mgr_role: active` selector label
- **What was wrong:** The service selector only included `app: rook-ceph-mgr` and `rook_cluster: rook-ceph`, missing the `mgr_role: active` label. The Rook operator dynamically labels the active mgr pod with `mgr_role: active`. Without this selector, the service would route traffic to both active and standby mgr pods in multi-mgr deployments. Only the active mgr serves the dashboard, so requests hitting the standby would fail.
- **What was changed:** Added `mgr_role: active` to the service selector, matching the pattern used in Rook's official documentation examples.
- **Why:** This ensures the NodePort service only targets the mgr pod that is actually serving the dashboard, which is critical for correctness in clusters with more than one mgr replica.

## Review Notes
- Option 3 (CephCluster CRD) correctly notes that the CRD does not support NodePort natively. The YAML shown is valid CephCluster configuration for enabling the dashboard with SSL, but it does not itself achieve NodePort exposure. The section serves as useful context for why a separate Service manifest is needed.
- The `spec.dashboard` CRD fields are limited to `enabled`, `urlPrefix`, `port`, and `ssl`. A feature request to add service type configuration (rook/rook#10535) was closed as "wontfix."
- The password retrieval command, secret name (`rook-ceph-dashboard-password`), jsonpath syntax, and default username (`admin`) are all correct per the Rook source code.
- The firewall commands (iptables and firewalld) are syntactically correct, though readers should be aware these are basic examples — production environments may require more specific rules.
