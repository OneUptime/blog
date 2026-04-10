# Validation Summary: How to Configure Multiple RGW Instances Behind a Load Balancer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RADOS Gateway (RGW)
- Kubernetes CephObjectStore CRD
- Kubernetes Services (ClusterIP, LoadBalancer)
- Kubernetes Ingress (NGINX Ingress Controller)
- Kubernetes Pod Anti-Affinity scheduling
- Prometheus (Ceph RGW metrics)
- radosgw-admin CLI tool

## Sources Consulted
- Rook CephObjectStore CRD documentation: https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- Rook source code `GatewaySpec` struct in `pkg/apis/ceph.rook.io/v1/types.go`
- Rook example object store manifest: `deploy/examples/object.yaml`
- Rook Toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Kubernetes Ingress API reference: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Pod Anti-Affinity documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/#affinity-and-anti-affinity

## Issues Found

### Issue 1: Invalid `type: s3` field in CephObjectStore gateway spec
- **What was wrong:** The CephObjectStore YAML included `type: s3` under `spec.gateway`. This field does not exist in the Rook CephObjectStore CRD. The `GatewaySpec` struct in Rook's source code has no `Type` field. RGW inherently provides S3 (and Swift) APIs without a protocol selector.
- **What was changed:** Removed the `type: s3` line from the gateway configuration.
- **Why:** Applying a CephObjectStore manifest with an unknown field would either be silently ignored or cause a validation error depending on the Kubernetes API server configuration. Removing it ensures the example works correctly and avoids confusion.

### Issue 2: Wrong pod target for `radosgw-admin` command
- **What was wrong:** The `radosgw-admin` command was executed against `deploy/rook-ceph-operator`. The Rook operator container does not include Ceph CLI tools like `radosgw-admin`; it only contains the `rook` binary.
- **What was changed:** Changed `deploy/rook-ceph-operator` to `deploy/rook-ceph-tools` (the Rook toolbox deployment).
- **Why:** The Rook toolbox pod uses the full Ceph container image (`quay.io/ceph/ceph`) which includes all Ceph administration tools including `radosgw-admin`. Running the command against the operator pod would fail with a "command not found" error.

## Review Notes
- The Prometheus metric `ceph_rgw_req` is correct and is exposed by the Ceph MGR Prometheus module. For per-instance breakdown, users may want to add `by (instance)` to the PromQL query (e.g., `rate(ceph_rgw_req[5m]) by (instance)`), but the current query is valid as written.
- The pod label selector `app=rook-ceph-rgw` is correct for listing all RGW pods regardless of object store name. To filter by a specific store, users could add `-l rook_object_store=my-store`.
- The Ingress example does not include a `tls` section. For production S3 endpoints, TLS termination would typically be configured, but this is outside the scope of the tutorial and not an error.
