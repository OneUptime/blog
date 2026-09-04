# How to Keep MinIO Writes Durable While an Erasure Set Is Degraded

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MinIO, Erasure Coding, Durability, Quorum, Fault Tolerance

Description: Preserve MinIO write durability during a drive or node outage by enforcing per-set quorum, retaining parity, limiting risk, and verifying newly written objects.

---

MinIO can accept writes while an erasure set is degraded only while that set still has write quorum. The fact that another pool or set is healthy is irrelevant to an object mapped to the affected set. Durable incident handling therefore begins with per-set math and live metrics, not with retrying failed PUT requests.

For an erasure set of `N = K + M` drives, MinIO needs at least `K` drives for ordinary reads and writes. At maximum parity, where `M = N/2`, it raises write quorum to `K + 1` so two isolated halves cannot both accept a write.

## Measure the Remaining Failure Budget

Capture fresh administrative state and v3 erasure-set metrics:

```bash
mc admin info --uncached production
mc admin info --offline --uncached production

mc admin prometheus metrics production cluster --api-version v3 |
  grep -E 'minio_cluster_erasure_set_(online_drives_count|write_quorum|write_tolerance|write_health)'
```

Filter by the affected `pool_id` and `set_id`. Treat these states differently:

| State | Operational decision |
| --- | --- |
| Write health is false | Stop or redirect writes; client retries cannot create quorum |
| Write health is true, tolerance is zero | Writes may succeed, but one more loss stops them; repair urgently |
| Write health is true, tolerance is positive | Continue only within a documented degraded-mode budget |

Do not take another drive or node down for routine maintenance while any affected set is degraded.

## Preserve the Configured Parity Behavior

Inspect storage-class configuration and the running server release before an incident:

```bash
mc admin info production
mc admin config get production storage_class
```

Current MinIO AIStor documentation defaults to parity upgrade when a set is degraded but still writable. If a 16-drive set normally writes `EC:4` and two drives are offline, a new object can be written with `EC:6`, preserving the same number of additional failures it could tolerate in a healthy set. The object's metadata records that higher parity.

This behavior is release- and configuration-sensitive. `MINIO_ERASURE_PARITY_FAILURE=upgrade` is the current availability-oriented setting; `ignore` favors capacity and leaves objects written during the outage with less remaining protection. The legacy `MINIO_STORAGE_CLASS_OPTIMIZE=availability` maps to the availability behavior. Either capacity-oriented setting can prevent an upgrade.

Do not change parity behavior reactively in the middle of an outage without testing it against the exact server release. Current releases also enforce a per-erasure-set parity-upgrade capacity budget. Upgraded objects retain their higher parity after healing, so a long write-heavy outage consumes extra space permanently.

## Reject Reduced-Redundancy Writes

The S3 `x-amz-storage-class` header can select the reduced-redundancy class when it is configured. During degraded operation, audit gateways, SDK configuration, and batch jobs so critical data cannot silently request lower parity.

Use a dedicated bucket policy and application configuration for critical writes. Separate reproducible cache data from authoritative records instead of allowing all writers to make a storage-class choice.

Parity settings apply when an object is written. Increasing the configured standard parity later affects only new objects, not existing ones. Rewriting an object is required to change its stored layout.

## Put Guardrails Around Continued Writes

If the business accepts degraded writes, bound the exposure:

1. Freeze nonessential batch ingest and multipart producers.
2. Maintain headroom for parity upgrades and healing.
3. Rate-limit producers so repair traffic and foreground reads keep their SLO.
4. Keep bucket versioning enabled where overwrites must be recoverable.
5. Replicate or back up authoritative objects to an independent failure domain.
6. Alert on any fall in per-set write tolerance or rise in heal errors.

Do not confuse erasure coding with backup. A valid quorum cannot recover an object deleted by an authorized client, overwritten with bad bytes, or lost with the whole site.

## Verify New Writes End to End

For a canary, create a local digest, upload through the same client path as production, then retrieve through a different endpoint:

```bash
dd if=/dev/urandom of=/tmp/degraded-write-canary.bin \
  bs=1M count=64 status=progress
sha256sum /tmp/degraded-write-canary.bin \
  >/tmp/degraded-write-canary.sha256

mc cp /tmp/degraded-write-canary.bin \
  production/durability-canaries/incident-2026-09-04.bin

mc cat production/durability-canaries/incident-2026-09-04.bin |
  sha256sum
```

Compare the result with the trusted local manifest. An ETag is not a general content MD5 for multipart or encrypted objects.

Inspect the object's on-disk shard summary through the supported admin API rather than examining backend files:

```bash
mc admin object info \
  production/durability-canaries/incident-2026-09-04.bin
```

Current documentation describes this command as reporting object parts, including missing or damaged shards. Keep it in the evidence record along with the server version and storage-class configuration.

## Restore Full Protection Quickly

Replace a failed drive with an empty XFS device of equal or greater capacity and performance at the same configured mount. MinIO detects and aggressively heals a correct replacement. Do not use `rsync` or filesystem tools to populate the backend.

Monitor until online drives, write tolerance, and set health return to their designed values:

```bash
mc admin info --watch --interval 5s production
mc admin prometheus metrics production cluster --api-version v3 |
  grep 'minio_cluster_erasure_set_'
```

MinIO healing restores missing shards. Confirm the release-specific behavior of objects that received upgraded parity; current AIStor documentation says their higher parity remains for the object's lifetime.

## Conclusion

Degraded writes are safe only inside a quantified per-erasure-set failure budget. Require live write health, preserve availability-oriented parity behavior, reserve capacity for upgrades and healing, and independently protect authoritative data. Validate canaries through the S3 API and repair the failed member before maintenance or another fault consumes the last tolerance.

## Official Documentation

- [MinIO AIStor: Erasure Coding](https://docs.min.io/aistor/operations/core-concepts/erasure-coding/)
- [MinIO AIStor: Erasure Code Settings](https://docs.min.io/aistor/reference/aistor-server/settings/storage-class/)
- [MinIO AIStor: Metrics and Alerts](https://docs.min.io/aistor/operations/monitoring/metrics-and-alerts/)
- [MinIO AIStor: Healing](https://docs.min.io/aistor/operations/core-concepts/healing/)
