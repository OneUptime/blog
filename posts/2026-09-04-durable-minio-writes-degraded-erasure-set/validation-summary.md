# Validation Summary: How to Keep MinIO Writes Durable While an Erasure Set Is Degraded

## Status
validated

## Post Type
Technical operations guide with CLI examples.

## Technologies Covered
- MinIO AIStor and the `mc` client
- Reed-Solomon erasure coding, quorum, parity, and healing
- S3 storage classes, bucket policies, versioning, and replication
- Prometheus v3 metrics
- Bash, GNU coreutils, and SHA-256
- Linux XFS storage

## Sources Consulted
- MinIO AIStor erasure coding: https://docs.min.io/aistor/operations/core-concepts/erasure-coding/
- MinIO AIStor erasure code settings: https://docs.min.io/aistor/reference/aistor-server/settings/storage-class/
- MinIO AIStor healing: https://docs.min.io/aistor/operations/core-concepts/healing/
- MinIO AIStor drive recovery: https://docs.min.io/aistor/operations/failure-and-recovery/recover-after-drive-failure/
- MinIO AIStor metrics overview: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/
- MinIO AIStor metrics v3 reference: https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/metrics-v3/
- `mc admin info`: https://docs.min.io/aistor/reference/cli/admin/mc-admin-info/
- `mc admin config`: https://docs.min.io/aistor/reference/cli/admin/mc-admin-config/
- `mc admin prometheus metrics`: https://docs.min.io/aistor/reference/cli/admin/mc-admin-prometheus/mc-admin-prometheus-metrics/
- `mc admin object info`: https://docs.min.io/aistor/reference/cli/admin/mc-admin-object-info/
- `mc cp`: https://docs.min.io/aistor/reference/cli/mc-cp/
- `mc cat`: https://docs.min.io/aistor/reference/cli/mc-cat/
- `mc alias set`: https://docs.min.io/aistor/reference/cli/mc-alias/mc-alias-set/
- MinIO AIStor access policies: https://docs.min.io/aistor/administration/iam/access/
- MinIO AIStor object versioning: https://docs.min.io/aistor/administration/objects-and-versioning/versioning/
- Amazon S3 Object API, including ETag semantics: https://docs.aws.amazon.com/AmazonS3/latest/API/API_Object.html

## Issues Found
1. **Incomplete configuration inspection.** The example queried only `storage_class`, although the newer parity controls belong to `erasure`. Added that query for supporting releases and noted environment precedence.
2. **Incomplete explanation of the upgrade budget.** Merely enabling upgrades does not ensure every object receives extra parity. Added the documented gradual reduction in upgraded writes as the budget is consumed and the protection implications for other writes.
3. **Canary endpoint mismatch and missing prerequisites.** Both operations used `production`, contrary to the instruction to read through another endpoint. Changed the download to `production-read` and defined it as a preconfigured authenticated alias for another endpoint of the same deployment. Stated the existing-bucket and GNU coreutils requirements, and clarified that SDK/gateway production paths must replace the example upload when applicable.
4. **Shard inspection scope.** Added the documented `--bitrot` option so readers do not mistake ordinary shard summaries for a content corruption scan.
5. **Replacement drive requirements.** Added the same-drive-type requirement from the official replacement procedure alongside the existing capacity, performance, and XFS requirements.
6. **Recovery completion criteria.** Drive availability and quorum alone do not establish that reconstruction has finished. Added explicit healing completion checks using the healing-drive metric and server logs.

## Review Notes
- Verified the K-shard threshold and K+1 write-quorum exception at half-set parity. Read reconstruction requires enough intact shards for the particular object; a healthy unrelated set does not reconstruct missing shards in the affected set.
- Verified the documented EC:4-to-EC:6 example, legacy optimization mapping, and persistence of upgraded object layouts. These are current AIStor documentation claims, not a guarantee for every historical open-source MinIO release. The post retains its instruction to check the actual server release.
- Verified `--uncached`, `--offline`, `--watch`, `--interval 5s`, the v3 `cluster` metric selector, the metric names, and `pool_id`/`set_id` labels. Health metrics use numeric 1/0 for true/false. Write tolerance measures write availability, not a complete inventory of every object's remaining durable shards.
- Policy documentation supports the storage-class condition on PutObject. Versioning preserves previous versions, while erasure coding by itself does not reverse logical deletion or bad application writes. Independent backups or replication remain appropriate for site loss.
- Confirmed the ETag warning: multipart and some encryption modes prevent treating an ETag as a content MD5.
- All four documentation links in the post resolved to appropriate official resources.
- Reviewed shell syntax locally. No MinIO deployment was supplied, so administrative calls, actual canary transfers, drive replacement, and degraded-state recovery were not executed. GNU coreutils documentation retrieval was attempted but unavailable; the GNU-specific utility syntax was reviewed statically.
- Kept the existing section structure and limited edits to technical corrections and necessary prerequisites.
