# Validation Summary: How to Configure Sub-Failure Domains in Rook Block Pools

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes
- CRUSH map (Ceph's placement algorithm)
- CephBlockPool CRD

## Sources Consulted
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook GitHub source — `pkg/apis/ceph.rook.io/v1/types.go` (ReplicatedSpec struct confirming `subFailureDomain` field)
- Rook GitHub source — `pkg/daemon/ceph/client/crush_rule.go` (CRUSH rule template generation logic)
- Ceph documentation for CRUSH rules and OSD commands: https://docs.ceph.com/en/latest/rados/operations/crush-map/

## Issues Found
No technical issues found.

## Review Notes
- The API group/version (`ceph.rook.io/v1`), field placement (`spec.replicated.subFailureDomain`), and all YAML field names are verified against the Rook CRD Go types.
- The CRUSH rule structure shown in Step 3 (`choose_firstn` for the primary failure domain, `chooseleaf_firstn` for the sub-failure domain) matches the rule template in Rook's source code.
- All Ceph CLI commands (`ceph osd tree`, `ceph osd crush rule dump`, `ceph osd crush add-bucket`, `ceph osd crush move`, `ceph pg map`, `ceph osd find`, `ceph health detail`, `ceph pg stat`, `ceph osd pool ls detail`) use correct syntax.
- The troubleshooting error message is illustrative rather than an exact Ceph error string, which is acceptable in context.
- The first example in Step 4 (rack-level primary with `replicasPerFailureDomain: 1` and `subFailureDomain: host`) is technically valid but represents a case where subFailureDomain has minimal practical impact since there's only one replica per failure domain. It still produces a valid CRUSH rule, so it is not incorrect.
