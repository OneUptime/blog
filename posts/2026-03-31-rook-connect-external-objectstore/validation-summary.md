# Validation Summary: How to Connect to an External Object Store in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph Object Gateway (RGW)
- Kubernetes (Services, Secrets, StorageClasses)
- ObjectBucketClaim (OBC) via the objectbucket.io API
- S3-compatible object storage
- radosgw-admin CLI

## Sources Consulted
- Rook official CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook official Object Storage guide: https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook GitHub repository example `deploy/examples/object-external.yaml`
- Rook Go source code `pkg/apis/ceph.rook.io/v1/types.go` for CRD field definitions
- Other validated Rook blog posts in this repository for consistency

## Issues Found

### 1. Multiple external RGW endpoints listed without caveat
- **What was wrong:** The CephObjectStore YAML example listed two external RGW endpoint IPs (`192.168.10.50` and `192.168.10.51`). The official Rook documentation states that "Only the first endpoint in the list will be advertised to any consuming resources like ObjectBucketClaims" and recommends using a single load balancer endpoint for stability.
- **What was changed:** Reduced the example to a single endpoint IP and added a note explaining that multiple endpoints can be listed but only the first is advertised, recommending a load balancer for high availability.
- **Why:** Following the blog as-is would give users a false sense of redundancy, when in practice only the first endpoint is used by OBCs.

### 2. Missing admin ops user for ObjectBucketClaim provisioning
- **What was wrong:** The blog showed creating an application user (`k8s-user`) but omitted the required `rgw-admin-ops-user` with admin capabilities. This user is required by the Rook operator to provision and manage buckets via ObjectBucketClaims. Without it, the OBC section of the blog would not work.
- **What was changed:** Added steps to create the `rgw-admin-ops-user` on the external cluster with `--caps="buckets=*;users=*;usage=read;metadata=read;zone=read"`, and to store its credentials as a `kubernetes.io/rook` typed secret in the Rook namespace.
- **Why:** The official Rook documentation explicitly requires this admin ops user for external object store setups that use OBCs. Omitting it would cause bucket provisioning to fail.

## Review Notes
- The `instances: 0` setting is structurally correct (it is a valid field under `spec.gateway`), though the official Rook example (`object-external.yaml`) omits this field entirely. Setting it to 0 explicitly is a reasonable and clear approach to prevent RGW pod deployment.
- The provisioner name `rook-ceph.ceph.rook.io/bucket` includes the operator namespace (`rook-ceph`) as a prefix. If the Rook operator is deployed in a different namespace, the prefix must match that namespace.
- The port `80` used in the examples is valid but depends on the actual RGW configuration. The official Rook examples sometimes use port `8080`. Users should verify against their own RGW setup.
- The `radosgw-admin user create` command with `--access-key` and `--secret-key` flags is correct syntax for setting explicit keys during user creation.
