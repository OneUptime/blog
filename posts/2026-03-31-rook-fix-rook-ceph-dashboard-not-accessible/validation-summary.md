# Validation Summary: How to Fix Rook-Ceph Dashboard Not Accessible

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system, specifically the MGR dashboard)
- Kubernetes (Services, Pods, Secrets, Ingress, port-forwarding)
- NGINX Ingress Controller

## Sources Consulted
- Rook official documentation: CephCluster CRD specification (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook official documentation: Ceph Dashboard (https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/)
- Ceph official documentation: Dashboard module (https://docs.ceph.com/en/latest/mgr/dashboard/)
- Kubernetes documentation: Ingress resource (https://kubernetes.io/docs/concepts/services-networking/ingress/)
- NGINX Ingress Controller annotations reference (https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)

## Issues Found

1. **Step 1 - Wrong mechanism to enable dashboard**: The post used `spec.mgr.modules` with `name: dashboard` to enable the dashboard. While the dashboard is technically an MGR module, the Rook operator uses `spec.dashboard.enabled` to control dashboard service creation. Using `spec.mgr.modules` alone would not re-enable a dashboard that was disabled via `spec.dashboard.enabled: false`. Fixed by replacing the YAML to use the canonical `spec.dashboard.enabled: true` approach.

2. **Step 3 - Incorrect expected service ports**: The expected output showed `7000/TCP,8443/TCP`, but by default Rook enables SSL for the dashboard and only exposes port `8443/TCP`. Port 7000 is only used when SSL is explicitly disabled via `spec.dashboard.ssl: false`. Fixed the expected output to show `8443/TCP` with a comment noting SSL is enabled by default.

3. **Step 4 - HTTP port-forward shown as primary option**: The post showed port-forwarding to HTTP port 7000 as the first option and suggested opening `http://localhost:7000`. Since SSL is enabled by default, the service only has port 8443 and port-forwarding to 7000 would fail. Fixed by removing the HTTP port-forward option and changing the browser URL to `https://localhost:8443`.

4. **Step 7 - Conflicting and incorrect Ingress annotations**: The Ingress config had both `backend-protocol: "HTTPS"` and `ssl-passthrough: "true"`, which are contradictory. SSL passthrough routes traffic at the TCP level (L4) without terminating TLS, making `backend-protocol` irrelevant and path-based routing non-functional. The post description said "TLS termination" which contradicts ssl-passthrough behavior. Fixed by removing `ssl-passthrough`, keeping `backend-protocol: "HTTPS"` (needed because Ceph dashboard serves HTTPS), and adding a proper `tls` section with host and secretName for correct TLS termination at the ingress.

## Review Notes
- The `ceph dashboard ac-user-set-password` command in Step 8 uses `NewPassword123!` with an exclamation mark inside double quotes, which could trigger bash history expansion if pasted into an interactive terminal. This is a minor usability concern but not a technical error.
- The post could mention that `spec.dashboard.ssl: false` can be set to disable SSL if HTTP access is preferred, but this is an enhancement rather than a correction.
- The NodePort selector `app: rook-ceph-mgr` in Step 6 is correct for selecting MGR pods.
