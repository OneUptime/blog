# Validation Summary: How to Set Up Multi-Cluster Rook-Ceph with Submariner

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Submariner (cross-cluster networking for Kubernetes)
- Rook-Ceph (CephBlockPool, RBD mirroring)
- Kubernetes Multi-Cluster Services API (ServiceExport)
- Ceph RBD mirroring (bootstrap tokens, failover/promote)

## Sources Consulted
- Submariner deployment docs: https://submariner.io/operations/deployment/
- Submariner subctl reference: https://submariner.io/operations/deployment/subctl/
- Rook RBD mirroring docs: https://rook.io/docs/rook/latest/Storage-Configuration/Block-Storage-RBD/rbd-mirroring/
- Ceph RBD mirroring docs: https://docs.ceph.com/en/latest/rbd/rbd-mirroring/
- Kubernetes MCS API (mcs-api): https://github.com/kubernetes-sigs/mcs-api
- MCS API ServiceExport reference: https://multicluster.sigs.k8s.io/api-types/service-export/

## Issues Found
1. **Bootstrap token import file path bug (critical):** The original `rbd mirror pool peer bootstrap import` command passed `/tmp/cluster1-token.txt` as a file path argument to `rbd` running inside the toolbox container. However, the token file was written to the *local machine* (via shell `>` redirect in the create step), so the file does not exist inside the container. Fixed by using stdin piping: changed the token-path argument to `-` (read from stdin), added `-i` flag to `kubectl exec`, and piped the local file via `< /tmp/cluster1-token.txt`.

## Review Notes
- The ServiceExport resource uses `multicluster.x-k8s.io/v1alpha1`. The MCS API now has `v1beta1` as the storage version, though `v1alpha1` is still served. Since the post is specifically about Submariner (whose Lighthouse component may still reference `v1alpha1`), this was left as-is, but readers targeting newer MCS controller implementations may want to use `v1beta1`.
- The CephBlockPool YAML, Submariner CLI commands (`deploy-broker`, `join`, `show connections`, `verify`), and RBD mirror commands (`pool status`, `image promote --force`) are all syntactically correct and match official documentation.
- The `rbd mirror image promote --force` command correctly uses the `--force` flag, which is necessary when the primary site is unreachable (disaster scenario).
