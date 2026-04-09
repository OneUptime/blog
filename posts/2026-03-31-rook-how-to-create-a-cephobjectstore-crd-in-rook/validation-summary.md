# Validation Summary: How to Create a CephObjectStore CRD in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph RADOS Gateway (RGW)
- CephObjectStore CRD
- CephObjectStoreUser CRD
- Kubernetes (kubectl, Services, Secrets)
- AWS CLI (S3-compatible endpoint usage)

## Sources Consulted
- Rook official documentation: Object Storage (RGW) — https://rook.io/docs/rook/latest/Storage-Configuration/Object-Storage-RGW/object-storage/
- Rook example CephObjectStore manifest — https://github.com/rook/rook/blob/master/deploy/examples/object.yaml

## Issues Found
1. **Incorrect use of `externalRgwEndpoints` in the "Accessing the Object Store" section.**
   - **What was wrong:** The snippet included `externalRgwEndpoints` with an IP address, presented as a way to expose the RGW service externally (LoadBalancer/NodePort). In reality, `externalRgwEndpoints` is used to connect Rook to an existing RGW instance running *outside* the Kubernetes cluster (external cluster mode). It is not a mechanism for exposing an internally managed RGW service to external clients.
   - **What was changed:** Removed `externalRgwEndpoints` from the YAML snippet. Kept the `gateway.service.annotations` approach for cloud load balancer configuration. Added an alternative `kubectl patch` command showing how to change the service type to NodePort directly.
   - **Why:** Using `externalRgwEndpoints` as shown would cause Rook to attempt to connect to an external RGW at the specified IP rather than exposing the internal RGW. This would confuse readers and potentially break their object store configuration.

## Review Notes
- The rest of the post is technically accurate: CRD API version (`ceph.rook.io/v1`), pool configuration fields, gateway spec, CephObjectStoreUser capabilities, secret naming convention (`rook-ceph-object-user-<store>-<user>`), secret key names (`AccessKey`/`SecretKey`), pod label selector (`app=rook-ceph-rgw`), service naming (`rook-ceph-rgw-<store>`), and the `kubectl patch` scaling command are all correct.
- The AWS CLI usage examples are correct for interacting with an S3-compatible endpoint.
- The `preservePoolsOnDelete: true` setting is a good practice recommendation for production use.
