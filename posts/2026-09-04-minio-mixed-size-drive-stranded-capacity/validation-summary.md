# Validation Summary: How to Estimate Stranded Capacity When Erasure Coding Uses Mixed-Size Drives

## Status
validated

## Post Type
Guide — storage capacity planning with worked calculations and administrative CLI examples.

## Technologies Covered
- MinIO and MinIO AIStor server pools and erasure sets
- Reed-Solomon erasure coding and storage-class parity
- Prometheus metrics v3 and the MinIO Client (`mc`)
- Linux util-linux (`lsblk`, `findmnt`) and XFS
- S3 object versioning, retention, and multipart uploads

## Sources Consulted
- [AIStor drive recovery](https://docs.min.io/aistor/operations/failure-and-recovery/recover-after-drive-failure/) — replacement requirements and pool-wide smallest-drive ceiling.
- [AIStor erasure coding](https://docs.min.io/aistor/operations/core-concepts/erasure-coding/) — set sizes, data/parity shards, immutable initialized layouts, and quorum.
- [AIStor erasure code settings](https://docs.min.io/aistor/reference/aistor-server/settings/storage-class/) — storage classes, historical parity, degraded-write upgrades, and upgrade budgets.
- [AIStor scaling](https://docs.min.io/aistor/operations/scaling/) — advance capacity planning, utilization guidance, and pool decommissioning.
- [Expand Available Storage](https://docs.min.io/aistor/operations/scaling/expansion/) — new pools, mixed stripe sizes, and restrictions on adding drives to existing nodes.
- [MinIO Erasure Code Calculator](https://min.io/product/erasure-code-calculator) — verified the vendor landing page resolves; it links to the data resilience calculator.
- [mc admin info](https://docs.min.io/aistor/reference/cli/admin/mc-admin-info/) — alias syntax, pool/set information, and `--uncached`.
- [mc admin prometheus metrics](https://docs.min.io/aistor/reference/cli/admin/mc-admin-prometheus/mc-admin-prometheus-metrics/) — `cluster`, `system`, and `--api-version v3` syntax.
- [mc admin config](https://docs.min.io/aistor/reference/cli/admin/mc-admin-config/) — configuration retrieval syntax and environment-variable precedence.
- [Metrics v3 Reference](https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v3/) — raw/usable capacity metrics and drive labels identifying pools and sets.
- [Object Versioning](https://docs.min.io/aistor/administration/objects-and-versioning/versioning/) — separate versions and namespace behavior.
- [Object Locking and Immutability](https://docs.min.io/aistor/administration/object-locking-and-immutability/) — retention protects existing object versions from deletion.
- [Troubleshoot System Path Growth](https://docs.min.io/aistor/operations/troubleshoot-system-path-growth/) — documented backend `du` diagnostics, temporary state, multipart state, and differences between raw files and erasure-coded system objects.
- [AIStor core settings](https://docs.min.io/aistor/reference/aistor-server/settings/core/) — drive utilization thresholds and write rejection.
- [lsblk(8), upstream util-linux manual](https://man7.org/linux/man-pages/man8/lsblk.8.html) — bytes, nodeps, and explicit output columns.
- [findmnt(8), upstream util-linux manual](https://man7.org/linux/man-pages/man8/findmnt.8.html) — filesystem type filtering and output columns.

## Issues Found
1. **Pool size was conflated with erasure-set size in the example.** A 16-drive pool need not imply a single 16-drive set. Defined `N` as the per-set drive count, explicitly made the example a single set, and qualified the 75% efficiency statement. `EC:4` specifies four parity shards, not a fixed efficiency independently of set size.
2. **The backend `du` prohibition was too broad.** Current AIStor troubleshooting documentation explicitly permits read-only inspection of particular system paths. Replaced the blanket prohibition with the distinction between backend disk usage and logical S3 usage, retaining the instruction to follow documented procedures and avoid backend modifications.
3. **Retention was described as multiplying versions.** Retention protects versions from deletion; it does not create extra copies. Corrected the explanation while preserving the requirement to count all retained logical versions before calculating storage overhead.
4. **The hardware-transition sentence implied that replacing limiting drives was an established expansion procedure.** The cited documentation supports adding pools and retiring old pools through decommissioning, while explicitly stating that larger replacement drives do not expand capacity. Replaced the ambiguous alternative with the documented pool migration/decommissioning approach.
5. **The expansion reference pointed to the broader scaling overview.** Updated it to the dedicated Expand Available Storage page matching the link title.

## Review Notes
- Confirmed the documented pool-wide smallest-drive ceiling. The size-stranding formulas and all numerical results are correct: 160 TiB installed, 128 TiB effective raw, 32 TiB stranded, 96 TiB logical, 32 TiB parity, and 60% installed efficiency. A single 8-to-16 TiB replacement adds 8 TiB to stranded capacity while smaller drives remain.
- Cohort formulas are ideal fully populated/healed shard estimates. The `K=10, M=6` cohort is supported by the documented two-offline-drive upgrade example for a 16-drive set originally using `EC:4`.
- Current AIStor documentation describes a per-outage parity-upgrade budget and configuration that can disable upgrades. The post correctly says upgrades can occur rather than implying every degraded write is upgraded. Historical objects retain their assigned parity after healing.
- The examples assume a configured `production` alias, administrative credentials, Linux inventory tools, and client/server support for metrics v3. Reviewed commands against documentation and checked shell syntax; no live production cluster was accessed or commands executed against it.
- `lsblk -d` inventories whole devices without child devices; partitioned deployments may need additional mapping, and serial availability depends on hardware. Physical device bytes and filesystem capacity need not match; the post correctly reserves filesystem and operational overhead.
- Metrics expose aggregate capacity and drive-level pool/set labels, but aggregate totals do not establish the parity distribution of historical objects. Retain the measured-cohort approach and avoid double-counting versions already included in logical-byte totals.
- Reviewed against current AIStor documentation. Older open-source MinIO releases may differ in flags, metric availability, and parity controls; the review does not establish compatibility with every historical release.
- Existing section order and tone were preserved; edits were limited to technical corrections and the documentation target.
