# Validation Summary: How to Access the Rook-Ceph Dashboard from Outside the Cluster

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Rook-Ceph (storage operator for Kubernetes)
- Ceph Dashboard (MGR module)
- Kubernetes Services (ClusterIP, NodePort, LoadBalancer)
- Kubernetes Ingress (networking.k8s.io/v1)
- NGINX Ingress Controller
- MetalLB (referenced for bare-metal LoadBalancer)
- kubectl CLI

## Sources Consulted
- Rook Ceph Dashboard documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook dashboard-external-http.yaml example: https://github.com/rook/rook/blob/master/deploy/examples/dashboard-external-http.yaml
- Rook operator source (dashboard.go): https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/mgr/dashboard.go
- Ceph Dashboard access control source: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/dashboard/services/access_control.py
- Ceph PR #38832 (password input via -i): https://github.com/ceph/ceph/pull/38832
- NGINX Ingress Controller annotations documentation: https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- Kubernetes Service and Ingress API reference (networking.k8s.io/v1)

## Issues Found

1. **Intro paragraph listed three methods instead of four.** The text said "three methods" but the post describes four (port-forward, NodePort, LoadBalancer, Ingress). LoadBalancer was omitted from the intro. Fixed to list all four methods.

2. **Missing `mgr_role: active` label selector in NodePort and LoadBalancer services.** Ceph runs active/standby MGR daemons, and only the active MGR serves the dashboard. Without the `mgr_role: active` selector, traffic could be routed to a standby MGR that isn't serving the dashboard. Added `mgr_role: active` to both service definitions, matching the official Rook example (`dashboard-external-http.yaml`).

3. **Incorrect `ac-user-set-password` command syntax.** The blog used `ceph dashboard ac-user-set-password admin --force-password 'StrongPassword!2026'`, passing the password as a positional argument. Since Ceph Pacific (16.x), passwords must be provided via `-i <file>` (input file/stdin), not as positional arguments. The `--force-password` flag is a boolean that bypasses complexity checks, not a value flag. Fixed to use `echo -n '...' | ceph dashboard ac-user-set-password admin -i - --force-password`.

4. **Incorrect `ac-user-create` command syntax.** The blog passed the password after `--force-password` as if it were a value argument, and piped an empty string to `-i /dev/stdin`. This would create the user with an empty password while misinterpreting the password string as a role name. Fixed to use `echo -n '...' | ceph dashboard ac-user-create readonly-viewer -i - read-only --force-password`, which correctly provides the password via stdin and assigns the `read-only` role in one command.

5. **Redundant annotations in SSL passthrough Ingress config.** The Option A config included `backend-protocol: "HTTPS"` and `ssl-redirect: "true"` alongside `ssl-passthrough: "true"`. Per NGINX Ingress Controller docs, SSL passthrough operates at layer 4 (TCP) and invalidates all other annotations. Removed the redundant annotations. Also removed the `tls` block with `secretName` since the Ingress doesn't terminate TLS in passthrough mode — the Ceph dashboard's own certificate is used end-to-end.

## Review Notes
- The MetalLB annotation `metallb.universe.tf/address-pool` is the legacy approach. Newer MetalLB versions (v0.13+) prefer IPAddressPool CRDs with `metallb.universe.tf/loadBalancerIPs` annotations. The legacy annotation still works but may be deprecated in future MetalLB releases.
- The Rook documentation's recommended Ingress approach uses `backend-protocol: "HTTPS"` (HTTPS backend without passthrough) combined with a `server-snippet` annotation for `proxy_ssl_verify off;`, rather than SSL passthrough. This is an alternative approach worth noting for readers who encounter certificate verification issues.
- The port-forward command for HTTP (port 7000) only works if the dashboard has been reconfigured with SSL disabled. The blog correctly labels this as "For HTTP (non-SSL dashboard)" which implies prior configuration, but a reader might try it without having disabled SSL first.
