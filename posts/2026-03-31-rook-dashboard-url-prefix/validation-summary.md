# Validation Summary: How to Configure Dashboard URL Prefix and Port in Rook

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Dashboard (mgr module)
- Kubernetes (Ingress, Service, Secret, port-forward)
- NGINX Ingress Controller
- CephCluster CRD (ceph.rook.io/v1)

## Sources Consulted
- Rook CephCluster CRD types definition (DashboardSpec struct in `pkg/apis/ceph.rook.io/v1/types.go`) — confirms `urlPrefix`, `port`, `ssl`, `enabled` fields
- Rook official documentation for Ceph Dashboard configuration — https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Rook example manifests for external dashboard services (`deploy/examples/dashboard-external-http.yaml`) — confirms service selectors and `mgr_role: active` label
- Ceph Dashboard documentation — confirms default ports 8443 (HTTPS) and 8080 (HTTP)
- Kubernetes Ingress specification — pathType semantics and standard Ingress resource format
- NGINX Ingress Controller annotations documentation — backend-protocol, rewrite-target, ssl-redirect

## Issues Found

### 1. Ingress rewrite-target conflicts with urlPrefix (Lines 60-87)
**What was wrong:** The Ingress example included a `nginx.ingress.kubernetes.io/rewrite-target: /$2` annotation and a regex path `/ceph-dashboard(/|$)(.*)`. This strips the `/ceph-dashboard` prefix from the request before forwarding to the backend. However, the CephCluster CRD is configured with `urlPrefix: /ceph-dashboard`, which tells the Ceph Dashboard to expect requests WITH the prefix. The rewrite would cause 404 errors because the dashboard would receive requests at `/` instead of `/ceph-dashboard/`.

**What was changed:** Removed the `rewrite-target` annotation and simplified the path to `/ceph-dashboard` with `pathType: Prefix`. This passes the full path including the prefix to the backend, which is what the dashboard expects when `urlPrefix` is set.

**Why:** When using `urlPrefix`, the Ingress must forward the full path (including the prefix) to the backend. No rewrite should occur.

### 2. NodePort service missing mgr_role selector (Lines 139-141)
**What was wrong:** The NodePort Service selector only included `app: rook-ceph-mgr` and `rook_cluster: rook-ceph`, but was missing the `mgr_role: active` label selector.

**What was changed:** Added `mgr_role: active` to the selector.

**Why:** When multiple Ceph manager pods are running (active + standby), traffic must be routed only to the active manager, which is the one running the dashboard. Without this selector, requests could be sent to a standby mgr pod that is not serving the dashboard, resulting in connection failures. The official Rook example manifests for external dashboard services include this selector.

## Review Notes
- The Ceph image `quay.io/ceph/ceph:v19.2.0` (Squid) is valid. Newer patch releases (19.2.1, 19.2.2) are available but this is not an error.
- The `base64 --decode` command syntax is correct for GNU coreutils (Linux). On macOS, `base64 -D` or `base64 --decode` (recent versions) may be needed, but this is standard for Kubernetes-focused tutorials.
- All CephCluster CRD field names (`spec.dashboard.urlPrefix`, `spec.dashboard.port`, `spec.dashboard.ssl`, `spec.dashboard.enabled`) are verified correct against the Rook source code.
- The dashboard password secret name `rook-ceph-dashboard-password` and the jsonpath for extracting the password are correct.
- The default service name `rook-ceph-mgr-dashboard` is correct.
