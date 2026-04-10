# Validation Summary: How to Configure Multi-Manager High Availability in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Manager (MGR) daemon
- Ceph Dashboard
- Kubernetes (pod anti-affinity, Services, Ingress)
- NGINX Ingress Controller

## Sources Consulted
- Rook CephCluster CRD documentation (https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/)
- Ceph Manager daemon documentation (https://docs.ceph.com/en/latest/mgr/)
- Ceph Manager module documentation (https://docs.ceph.com/en/latest/mgr/administrator/)
- Kubernetes Ingress documentation (https://kubernetes.io/docs/concepts/services-networking/ingress/)
- NGINX Ingress Controller annotations reference (https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)

## Issues Found
No technical issues found.

## Review Notes
- The Ingress example uses both `nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"` and `nginx.ingress.kubernetes.io/ssl-passthrough: "true"` together. When SSL passthrough is enabled, traffic is forwarded at the TCP level (L4), making the `backend-protocol` annotation redundant since the ingress controller never inspects or re-encrypts the traffic. This is not an error (it won't cause failures), but readers should be aware that `ssl-passthrough` alone is sufficient. Additionally, SSL passthrough must be explicitly enabled on the NGINX ingress controller with the `--enable-ssl-passthrough` flag, which is disabled by default.
- The `ceph mgr fail` command without arguments fails the currently active manager, which is the correct usage for triggering a failover test. Readers should be aware that specifying a manager name (e.g., `ceph mgr fail a`) is also supported if targeting a specific instance.
- The post correctly notes that active manager memory usage scales with cluster size. For very large clusters (thousands of OSDs), memory requirements can be significantly higher than the 2Gi limit shown in the example.
