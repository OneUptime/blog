# Validation Summary: How to Plan for Ceph Cluster Growth and Expansion

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Kubernetes (kubectl CLI)
- CRUSH maps (Ceph placement algorithm)
- Prometheus (monitoring and alerting)
- Grafana (dashboards)
- bc (bash calculator)

## Sources Consulted
- Ceph official documentation: CRUSH rule creation (`ceph osd crush rule create-replicated` syntax — `<name> <root> <type> [<class>]` where class must be a device class like hdd/ssd/nvme) — https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Rook CephBlockPool CRD documentation (spec.failureDomain, spec.crushRoot, spec.deviceClass fields) — https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook CephCluster CRD documentation (storage.nodes spec for adding OSDs) — https://rook.io/docs/rook/latest/CRDs/Cluster/ceph-cluster-crd/
- Ceph documentation on backfill tuning (osd_max_backfills, set-backfillfull-ratio) — https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/
- Prometheus predict_linear function documentation — https://prometheus.io/docs/prometheus/latest/querying/functions/#predict_linear

## Issues Found
1. **Incorrect device class in CRUSH rule command (Step 4):** The command `ceph osd crush rule create-replicated replicated_rule default rack host` passed `host` as the fourth argument. In this command, the fourth argument is the device class (e.g., `hdd`, `ssd`, `nvme`), not a CRUSH bucket type. `host` is not a valid device class. Removed the erroneous `host` argument so the command reads `ceph osd crush rule create-replicated replicated_rule default rack`.

2. **Missing failureDomain in CephBlockPool YAML (Step 4):** The surrounding text instructs the reader to "start with `rack` as the failure domain now," but the CephBlockPool YAML spec did not include `failureDomain: rack`. Without this field, Rook defaults to `host`-level failure domain, contradicting the guidance. Added `failureDomain: rack` to the spec.

## Review Notes
- The capacity math in Step 3 (raw_tb and usable_tb calculations with 3x replication) is correct throughout all expansion phases.
- The Prometheus `predict_linear` alert rule in Step 7 is syntactically correct and uses the right metric names for the Ceph Prometheus exporter.
- The backfill throttling commands in Step 6 are valid but aggressive (`osd_max_backfills 1`). This is fine as a recommendation for minimizing client impact, though it will significantly slow rebalancing. The post correctly frames this as a trade-off.
- The post uses `ceph osd set-backfillfull-ratio` which is the older CLI form; the newer equivalent is `ceph osd set-backfillfull-ratio` (same command, still supported). No change needed.
