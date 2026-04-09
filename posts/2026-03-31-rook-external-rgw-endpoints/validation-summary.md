# Validation Summary: How to Set External RGW Endpoints in Rook

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RGW (RADOS Gateway / Object Storage)
- Kubernetes Services (LoadBalancer type)
- Kubernetes Ingress (networking.k8s.io/v1)
- NGINX Ingress Controller
- AWS CLI (S3-compatible endpoint testing)
- radosgw-admin CLI

## Sources Consulted
- Rook CephObjectStore CRD documentation (https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/)
- Rook object store examples and gateway service spec fields
- Kubernetes Ingress API reference (networking.k8s.io/v1)
- NGINX Ingress Controller annotations documentation (https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/)
- Ceph radosgw-admin CLI reference (https://docs.ceph.com/en/latest/radosgw/admin/)
- Cross-referenced with other validated Rook blog posts in this repository covering the same CRD fields

## Issues Found
1. **Missing `service.type: LoadBalancer` in Option 1 YAML** — The text stated "Set `service.annotations` and `service.type` in the gateway spec" but the YAML example only included `service.annotations` without `type: LoadBalancer`. Without explicitly setting the service type to LoadBalancer, the RGW service remains ClusterIP and the cloud provider annotations have no effect. Added `type: LoadBalancer` to the gateway service spec.

## Review Notes
- The `gateway.service.type: LoadBalancer` field may not be supported in older Rook versions. Users on older Rook versions may need to create a separate LoadBalancer Service manually instead of relying on the CRD field.
- The `hosting.advertiseEndpoint` feature (with `dnsName`, `port`, `useTls` subfields) is a newer Rook feature and may not be available in all versions.
- The Ingress resource YAML is correct for `networking.k8s.io/v1` and uses appropriate NGINX annotations for S3/object storage workloads.
- The `radosgw-admin zone modify` and `period update --commit` commands are correct for manually registering external endpoints in multisite configurations.
- The `--no-verify-ssl` flag in the AWS CLI test command is appropriate when TLS is not configured or when using self-signed certificates, but the post could note that this should not be used in production.
