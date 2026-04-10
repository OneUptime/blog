# Validation Summary: How to Understand Ceph Erasure Coding (K+M Chunks)

## Status
validated

## Post Type
Tutorial / Explainer

## Technologies Covered
- Ceph (erasure coding, OSD pools, erasure code profiles)
- Rook (CephBlockPool CRD, Kubernetes operator for Ceph)
- Kubernetes (kubectl, CRD management)
- Erasure coding plugins: jerasure, ISA, Clay

## Sources Consulted
- Ceph official documentation on erasure coding: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph erasure code profiles documentation: https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/
- Ceph erasure code plugins (jerasure, ISA, Clay): https://docs.ceph.com/en/latest/rados/operations/erasure-code-jerasure/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
No technical issues found.

## Review Notes
- The `kubectl exec -it rook-ceph-tools -n rook-ceph -- bash` command uses a simplified pod name. In modern Rook deployments (1.3+), the toolbox runs as a Deployment, so `kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash` would be more precise. The simplified form is a common blog convention and readers are expected to substitute their actual pod name.
- The first YAML example uses `spec.parameters.compression_mode: none` which works but the more idiomatic Rook approach is `spec.compressionMode: none` as a top-level spec field.
- The second YAML example for "RBD with an EC data pool" shows only the EC pool definition but doesn't show the companion replicated metadata pool configuration. The post correctly mentions the requirement in the text, so this is a completeness note rather than an error.
- All storage overhead calculations in the table are mathematically correct.
- All three EC plugins (jerasure, isa, clay) and their described characteristics are accurate.
