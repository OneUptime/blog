# Validation Summary: How to Set preservePoolsOnDelete for Rook Object Store

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- CephObjectStore CRD (Custom Resource Definition)
- Kubernetes (container orchestration)
- ArgoCD / Flux (GitOps tools)
- Ceph RGW (RADOS Gateway / Object Store)

## Sources Consulted
- Rook GitHub repository source code (`pkg/apis/ceph.rook.io/v1/types.go`) — confirms `PreservePoolsOnDelete` field exists as a top-level bool in `ObjectStoreSpec`
- Rook official example (`deploy/examples/object.yaml`) — confirms YAML structure and field placement
- Rook operator source (`pkg/operator/ceph/object/objectstore.go`) — confirms pool deletion behavior when `preservePoolsOnDelete` is false and idempotent pool reconnection when re-applying
- Rook pool management source (`pkg/operator/ceph/pool/pool.go`) — confirms `ceph osd pool delete` syntax with double pool name and `--yes-i-really-really-mean-it` flag
- Rook CRD documentation — confirms default value is `false` and describes pool preservation behavior
- ArgoCD official documentation — confirms `argocd.argoproj.io/sync-options: Delete=false` annotation syntax

## Issues Found
No technical issues found.

## Review Notes
- The `ceph osd lspools` command used in the verification step is valid but is a legacy alias. The more modern equivalent is `ceph osd pool ls`. Both work correctly, and `lspools` remains supported, so this is not an error.
- The post mentions pool names like `my-store.rgw.buckets.data`, `my-store.rgw.buckets.index`, and `my-store.rgw.meta`. These are accurate examples from the full set of RGW pools, which also includes `rgw.control`, `rgw.log`, `rgw.buckets.non-ec`, `rgw.otp`, and the shared `.rgw.root` pool. The post's use of "etc." appropriately signals additional pools exist.
- The manual pool cleanup section correctly shows deleting one pool at a time. In practice, users would need to repeat the `ceph osd pool delete` command for each pool (data, index, meta, control, log, etc.), which is implied but not explicitly stated.
