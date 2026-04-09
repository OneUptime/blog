# Validation Summary: How to Set Up External Access to Rook-Ceph RGW

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (CephObjectStore CRD, RADOS Gateway)
- Kubernetes (Services: LoadBalancer, NodePort, Ingress)
- Ceph RGW (S3-compatible object storage)
- AWS CLI (S3 operations against RGW endpoint)
- NGINX Ingress Controller
- radosgw-admin CLI

## Sources Consulted
- Rook-Ceph CephObjectStore CRD documentation (https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/)
- Ceph RADOS Gateway administration documentation (https://docs.ceph.com/en/latest/radosgw/admin/)
- Kubernetes Service types documentation (https://kubernetes.io/docs/concepts/services-networking/service/#publishing-services-service-types)
- Kubernetes Ingress documentation (https://kubernetes.io/docs/concepts/services-networking/ingress/)
- AWS CLI S3 endpoint configuration documentation (https://docs.aws.amazon.com/cli/latest/reference/s3/)
- Previously validated blog posts in this repository for Rook RGW label and port conventions

## Issues Found
1. **Incorrect NodePort selector label**: The NodePort Service in Option 2 used `rgw: my-store` as a selector label. Rook labels RGW pods with `rook_object_store: my-store`, not `rgw: my-store`. Using the wrong label would result in the Service selecting no pods, so no traffic would be routed. Changed to `rook_object_store: my-store`.

2. **Incorrect NodePort targetPort**: The NodePort Service used `targetPort: 7480`. The port 7480 is the default for standalone (non-Rook-managed) Ceph RGW. Rook-managed RGW containers listen on port 8080. Changed `targetPort: 7480` to `targetPort: 8080`.

## Review Notes
- The `gateway.service.type: LoadBalancer` field in Option 1's CephObjectStore CRD may not be supported in all Rook versions. Older versions only support `annotations` under `gateway.service`. Users on older Rook versions may need to create a separate LoadBalancer Service instead.
- The `--no-verify-ssl` flag in the LoadBalancer test command is unnecessary for HTTP endpoints (only relevant for HTTPS). It won't cause errors but is misleading in that context.
- The Ingress annotations for proxy timeouts and body size are appropriate for large S3 object uploads via NGINX Ingress Controller.
- The `radosgw-admin user create` command with explicit `--access-key` and `--secret-key` works but in production, letting radosgw-admin auto-generate credentials is more secure.
