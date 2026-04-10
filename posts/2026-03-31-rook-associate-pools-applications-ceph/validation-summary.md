# Validation Summary: How to Associate Pools with Applications in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (RADOS, OSD pool management)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec into toolbox)
- Ceph CLI (ceph osd pool application subcommands)

## Sources Consulted
- Ceph man page (mankier.com/8/ceph) — verified all `ceph osd pool application` subcommand syntax
- Ceph man page (Ubuntu manpages, focal) — cross-referenced command signatures
- Ceph Health Checks documentation (docs.ceph.com/en/reef/rados/operations/health-checks/) — confirmed `POOL_APP_NOT_ENABLED` warning name and behavior
- Ceph PR #15763 (github.com/ceph/ceph/pull/15763) — original pool application metadata feature, confirms one-app-per-pool recommendation, metadata-only nature of tags, and 4-app-per-pool internal limit
- Ceph Tracker issues #62482, #62504, #63192 — confirmed `POOL_APP_NOT_ENABLED` health check naming
- Ceph test suite (github.com/ceph/ceph/blob/main/qa/workunits/cephtool/test.sh) — verified command behavior

## Issues Found
- **"Every pool should have exactly one application tag set"**: This was stated as an absolute rule, but Ceph actually allows multiple application tags per pool (up to an internal limit of 4). When adding a second tag, Ceph warns and requires the `--yes-i-really-mean-it` flag. The original feature developer noted that one app per pool is the only tested configuration. Fixed by softening the language to say "typically" one tag and explaining that Ceph warns if a second tag is added.

## Review Notes
- All CLI commands (`ceph osd pool application enable/disable/get`, `ceph osd pool ls detail`, `ceph health detail`, `ceph -s`) are syntactically correct and use current syntax.
- The three built-in application names (`rbd`, `rgw`, `cephfs`) are correct.
- The `--yes-i-really-mean-it` flag on the disable command is correctly documented.
- The claim that custom tags do not enable special Ceph features is accurate — they are purely informational metadata.
- The claim that disabling/re-enabling tags does not affect data is accurate.
- The Rook section correctly describes automatic tagging behavior for CephBlockPool, object store, and filesystem pools.
- The kubectl command to access the Ceph toolbox in a Rook cluster uses the correct namespace and deployment name.
