# Validation Summary: How to Understand the clean PG State in Ceph

## Status
validated

## Post Type
Reference / Explainer

## Technologies Covered
- Ceph (Placement Groups, OSD recovery, deep scrubbing)
- Rook (Ceph operator for Kubernetes)
- CLI tools: `ceph status`, `ceph pg stat`, `ceph pg query`, `ceph pg ls-by-pool`, `jq`

## Sources Consulted
- Ceph official documentation on Placement Group states: https://docs.ceph.com/en/latest/rados/operations/pg-states/
- Ceph official documentation on monitoring PGs: https://docs.ceph.com/en/latest/rados/operations/monitoring-osd-pg/
- Ceph official documentation on recovery configuration: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/

## Issues Found
- **Incorrect recovery transition state**: The post showed the recovery transition as `active+degraded -> active+recovering -> active+clean`. During recovery, PGs remain in the `degraded` state until recovery completes, so the correct intermediate state is `active+degraded+recovering`. Fixed to: `active+degraded -> active+degraded+recovering -> active+clean`.

## Review Notes
- The `awk '{print $1, $16}'` column reference in the `ceph pg ls-by-pool` example is version-dependent; the state column position may vary across Ceph releases. This is acceptable for an illustrative example but readers should verify for their specific version.
- All other commands (`ceph status`, `ceph pg stat`, `ceph pg query`, `ceph osd pool deep-scrub`) are correct and current.
- The definition of the `clean` state and its four conditions are accurate per Ceph documentation.
- The `osd_recovery_max_active` configuration option is a valid and relevant tunable for recovery performance.
