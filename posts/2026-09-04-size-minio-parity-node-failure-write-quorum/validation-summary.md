# Validation Summary: How to Size MinIO Parity So a Full Node Failure Stays Within Write Quorum

## Status
validated

## Post Type
Technical guide for storage capacity and fault-tolerance planning.

## Technologies Covered
- MinIO and MinIO AIStor
- Reed-Solomon erasure coding and read/write quorum
- AIStor Client (`mc`) administration commands
- Prometheus metrics v3
- Storage parity, capacity planning, and failure domains

## Sources Consulted
- [AIStor Erasure Coding](https://docs.min.io/aistor/operations/core-concepts/erasure-coding/) — object placement, parity limits, and production guidance.
- [AIStor Thresholds and Limits](https://docs.min.io/aistor/reference/aistor-server/thresholds/) — read and write quorum formulas.
- [AIStor Erasure Code Settings](https://docs.min.io/aistor/reference/aistor-server/settings/storage-class/) — parity changes, degraded writes, upgrade budgets, and environment settings.
- [AIStor Metrics v3 Reference](https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v3/) — all five metric names and their pool/set labels.
- [mc admin info](https://docs.min.io/aistor/reference/cli/admin/mc-admin-info/) — alias syntax, server versions, and `--uncached`.
- [mc admin prometheus metrics](https://docs.min.io/aistor/reference/cli/admin/mc-admin-prometheus/mc-admin-prometheus-metrics/) — `cluster` type and `--api-version v3`.
- [mc admin config](https://docs.min.io/aistor/reference/cli/admin/mc-admin-config/) — configuration retrieval syntax and environment overrides.
- [MinIO Availability and Resiliency](https://min.io/docs/minio/container/operations/concepts/availability-and-resiliency.html) — official legacy documentation describing symmetric placement and cycling through nodes.

## Issues Found
1. The degraded-write explanation omitted the current parity-upgrade budget, implying that default upgrade behavior protects every new object throughout an outage. Added the default 1% per-set, per-outage budget and clarified that the share of upgraded writes decreases as it is spent. Other writes use configured parity.
2. The inspection instructions mentioned only `storage_class`, which does not fully identify the current controls. Added explicit checks of the server’s `MINIO_ERASURE_PARITY_FAILURE` and `MINIO_ERASURE_PARITY_UPGRADE_BUDGET` settings. Existing CLI commands remain valid.

## Review Notes
- Independently recomputed both quorum inequalities, all three topology examples, and every capacity-table entry. The half-parity case requires one more acknowledgement than read quorum; the two-node example cannot retain write quorum after losing either node.
- Confirmed the production standard-parity floor and that changing configured parity does not re-encode existing objects.
- The calculations describe ordinary quorum at the stated parity, assuming the other drives are healthy and reachable. Per-object upgraded parity and healing state can affect actual resilience.
- Set width is explicitly assumed to be 16, so support for larger sets in newer AIStor releases does not invalidate the examples. Set geometry is fixed when a pool is initialized; hardware replacement does not itself redistribute existing sets.
- Administrative output and aggregate per-set metrics support checking live state, but do not alone supply a complete node-to-set membership map. The generated layout remains necessary for calculating `d`.
- Current AIStor settings should be checked against the deployed release. The legacy `MINIO_STORAGE_CLASS_OPTIMIZE` setting remains supported; either its capacity mode or the newer failure setting’s ignore mode can disable upgrades.
- Reviewed shell syntax and official command documentation. No MinIO deployment was provided, so commands and failure injection were not executed against a live cluster.
- All four documentation links resolve to the intended official resources. Changes were limited to the degraded-write caveats; the post structure and examples were preserved.
