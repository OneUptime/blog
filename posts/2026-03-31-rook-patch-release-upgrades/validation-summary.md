# Validation Summary: How to Perform Patch Release Upgrades in Rook

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Kubernetes storage orchestrator)
- Ceph (distributed storage system)
- Kubernetes (kubectl CLI)
- Helm (Kubernetes package manager)

## Sources Consulted
- Rook official upgrade documentation (https://rook.io/docs/rook/latest/Upgrade/rook-upgrade/)
- Rook GitHub repository manifest structure (https://github.com/rook/rook/tree/master/deploy/examples)
- Ceph CLI reference for `ceph status`, `ceph versions`, `ceph osd stat`, `ceph pg stat`
- Helm CLI documentation for `helm upgrade`, `helm rollback`, `helm search repo`

## Issues Found

1. **Incorrect MGR deployment name** (line 116): The post used `rook-ceph-mgr` as the deployment name in the rollout status command. Rook always appends a daemon ID suffix to the MGR deployment, so the correct name is `rook-ceph-mgr-a`. Fixed to `kubectl -n rook-ceph rollout status deployment rook-ceph-mgr-a`.

2. **Incomplete health check guidance** (line 51): The post only warned against proceeding when the cluster shows `HEALTH_ERR`. The official Rook upgrade documentation recommends starting upgrades with a fully healthy cluster (`HEALTH_OK`). Added `HEALTH_WARN` to the warning so readers know to resolve warnings before upgrading, not just errors.

## Review Notes
- The `helm rollback` command shown is valid Helm syntax, but Rook does not officially document or recommend Helm rollback for Rook upgrades. Ceph daemon downgrades are complex and not officially supported by Ceph itself. The "straightforward" characterization is optimistic but the command is technically correct.
- The `--reuse-values` flag in the Helm upgrade command works but is a known Helm pitfall: it can prevent new default chart values from being applied. The Rook docs do not mention this flag. For production use, explicitly specifying values with `-f values.yaml` is generally safer.
- The CRD diff command in the manifest upgrade section is a rough illustrative check rather than a precise comparison, since the two sides of the diff extract different fields. It serves as a directional guide but readers should review full CRD diffs for production upgrades.
- The raw GitHub URLs for manifests work correctly but the official Rook docs recommend cloning the repo (`git clone --single-branch --depth=1 --branch <version>`) rather than using raw URLs.
