# Validation Summary: How to Configure Ceph RadosGW for S3 API in Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook-Ceph (CephObjectStore CRD)
- Ceph RadosGW (RGW) / RADOSGW
- Kubernetes (StorageClass, Service, ConfigMap, Secret)
- Object Bucket Claim (OBC) / lib-bucket-provisioner
- radosgw-admin CLI
- AWS CLI (S3-compatible access)

## Sources Consulted
- https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/
- https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/ceph-object-bucket-claim/
- https://pkg.go.dev/github.com/kube-object-storage/lib-bucket-provisioner/pkg/apis/objectbucket.io/v1alpha1
- https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- https://github.com/rook/rook/issues/11097 (exposing RGW externally via separate Service)

## Issues Found

**Issue: Incorrect use of `externalRgwEndpoints` for external LoadBalancer exposure**

- **What was wrong:** The "Exposing RGW Externally" section showed a `CephObjectStore` YAML using `externalRgwEndpoints` as the method to "change the Service type to LoadBalancer." This is incorrect. `externalRgwEndpoints` is for external-mode Ceph clusters only — it tells Rook about pre-existing RGW instances on an external Ceph cluster and does not create or modify any Kubernetes Service. Using it on a standard (non-external) cluster would have no effect on external exposure.
- **What was changed:** Replaced the incorrect `CephObjectStore` YAML snippet with the correct approach: a separate Kubernetes `Service` resource with `type: LoadBalancer` and the correct label selectors (`app: rook-ceph-rgw`, `rook_object_store: my-store`) targeting port 8080 (the RGW container port). The `kubectl patch` command that followed was already correct and was retained unchanged.
- **Why:** Creating a separate Service with `type: LoadBalancer` is the documented way to expose Rook-managed RGW pods externally. The `externalRgwEndpoints` field serves a completely different purpose.

## Review Notes
- The `CephObjectStore` spec includes empty fields `sslCertificateRef:` and `securePort:` in the Step 1 example. These are syntactically valid (null/empty values) and are commonly shown in Rook docs to signal optional TLS configuration. No change needed.
- The OBC API version `objectbucket.io/v1alpha1` remains alpha as of current Rook releases; the post does not claim otherwise, so no caveat is needed.
- `radosgw-admin quota set --max-size=10G` uses a human-readable size string which is supported by radosgw-admin. Verified correct.
