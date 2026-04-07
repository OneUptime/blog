# Validation Summary: How to Configure Hosting Settings (advertiseEndpoint, dnsNames) in Rook

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph RGW (RADOS Gateway)
- CephObjectStore CRD
- S3-compatible object storage
- Virtual-host-style bucket access
- Kubernetes

## Sources Consulted
- Rook CephObjectStore CRD specification (https://rook.io/docs/rook/latest/CRDs/Object-Storage/ceph-object-store-crd/)
- Rook CRD definitions from source (https://github.com/rook/rook/blob/master/deploy/examples/crds.yaml)

## Issues Found

### 1. `hosting` incorrectly nested under `spec.gateway` (all YAML examples)
- **What was wrong:** All three YAML configuration examples placed the `hosting` block as a child of `spec.gateway`. According to the Rook CRD definition, `hosting` is a top-level field under `spec`, a sibling of `gateway`, `metadataPool`, and `dataPool`.
- **What was changed:** Moved `hosting` out from under `gateway` to the correct position under `spec` in all three YAML snippets.
- **Why:** Using the incorrect nesting would cause the `hosting` configuration to be silently ignored by Rook, as it would not match the CRD schema.

### 2. Introductory text described hosting as part of "gateway configuration"
- **What was wrong:** The opening paragraph said "The `hosting` section of the `CephObjectStore` gateway configuration" and the summary said "Rook's CephObjectStore `gateway` spec".
- **What was changed:** Updated to say "The `hosting` section of the `CephObjectStore` spec" and "Rook's CephObjectStore spec" respectively.
- **Why:** Consistent with the corrected YAML structure — `hosting` is not part of the gateway spec.

## Review Notes
- The `advertiseEndpoint` subfields (`dnsName`, `port`, `useTls`) are all required per the CRD schema. The post correctly includes all three in every example.
- The `sslCertificateRef` field is correctly placed under `spec.gateway` in the TLS example.
- The `radosgw-admin` commands and `aws s3` CLI usage are correct.
- The explanation of virtual-host-style bucket access and wildcard TLS SANs is accurate.
