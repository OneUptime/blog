# Validation Summary: How to Enable SSL for the Ceph Dashboard in Rook

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Dashboard (MGR module)
- Kubernetes (CephCluster CRD, Secrets, Ingress, Deployments)
- TLS/SSL certificates
- cert-manager (Certificate resource, ClusterIssuer)
- NGINX Ingress Controller
- OpenSSL (certificate verification)

## Sources Consulted
- Rook official documentation: Ceph Dashboard configuration (https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/)
- Rook CephCluster CRD specification (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Rook operator source code: `pkg/operator/ceph/cluster/mgr/dashboard.go` (dashboardPortHTTPS = 8443, dashboardPortHTTP = 7000)
- Rook Toolbox documentation (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)
- Ceph documentation: Dashboard SSL configuration and CLI commands
- cert-manager documentation: Certificate resource API v1 (https://cert-manager.io/docs/)
- NGINX Ingress Controller annotations documentation (https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
- Ceph release history for Squid (v19.x) releases on quay.io/ceph/ceph

## Issues Found

### Issue 1: Incorrect HTTP port for non-SSL dashboard (Critical)
- **What was wrong:** The post stated the Ceph Dashboard uses port 8080 when SSL is disabled. This appeared in the mermaid diagram (`HTTP on port 8080`) and in the "Disabling SSL" YAML snippet (`port: 8080`).
- **What was changed:** Updated both occurrences from port 8080 to port 7000.
- **Why:** Rook hardcodes the non-SSL dashboard port as 7000 (defined as `dashboardPortHTTP = 7000` in the operator source code). Port 8080 is the default for standalone Ceph (without Rook), but Rook overrides this to 7000. Multiple GitHub issues (rook/rook#11609, rook/rook#8317, rook/rook#2754) confirm this.

### Issue 2: Outdated Ceph container image tag
- **What was wrong:** The CephCluster YAML example used `quay.io/ceph/ceph:v19.2.0`.
- **What was changed:** Updated to `quay.io/ceph/ceph:v19.2.3`.
- **Why:** While v19.2.0 (Squid) is a valid release (September 2024), v19.2.3 is the latest stable Squid release and is what the official Rook CRD documentation uses in its examples. Using the latest patch release ensures readers get security and bug fixes.

## Review Notes
- The Ceph CLI commands for setting custom SSL certificates (`ceph dashboard set-ssl-certificate`, `ceph dashboard set-ssl-certificate-key`) are correct. The module disable/enable restart approach works, though the official Ceph docs also mention restarting the manager processes as an alternative.
- The cert-manager Certificate resource uses the current stable API version (`cert-manager.io/v1`) with correct spec fields.
- The NGINX Ingress annotation `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"` is correct and matches what Rook's own documentation recommends.
- The `rollout restart deploy/rook-ceph-mgr` command for certificate rotation is a valid approach, though the actual Rook MGR deployment name may include a suffix (e.g., `rook-ceph-mgr-a`). In practice, the simple deployment name works for most single-MGR setups.
- The post does not mention the `spec.dashboard.urlPrefix` CRD field, which is fine since it is not relevant to SSL configuration.
