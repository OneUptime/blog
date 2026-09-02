# Why Is the `.opensearch-observability` Index Read-Only? Recovering from Flood-Stage Disk Watermarks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Observability, Disk Space, Troubleshooting

Description: Relieve disk pressure, verify flood-stage blocks, and safely restore writes to the OpenSearch observability metadata index without masking the storage problem.

---

With disk thresholds enabled (the default), when a data node crosses the flood-stage disk watermark, OpenSearch applies `index.blocks.read_only_allow_delete` to every index with a shard on that node. A dot-prefixed observability index is not exempt, so notebook or observability metadata writes can fail even though searches still work.

On current OpenSearch defaults, the low, high, and flood-stage watermarks are 85%, 90%, and 95% disk utilization. OpenSearch releases the block after utilization falls below the high watermark. OpenSearch 1.x and 2.x allowed automatic release to be explicitly disabled; OpenSearch 3.0 and later always auto-release it.

## Confirm the cause

Check allocation and disk before changing index settings:

```http
GET _cat/allocation?v&s=disk.percent:desc

GET _cluster/settings?include_defaults=true&flat_settings=true

GET .opensearch-observability/_settings?flat_settings=true&include_defaults=true
```

In current releases, `.opensearch-observability` is a registered system index. When Security system-index protection is enabled, a caller without system-index access can receive `403 Forbidden`, or some read APIs can be scrubbed to look empty, so an empty response does not prove that the index is absent. Perform this diagnosis through the approved super-admin or system-index-permission path and check Security audit logs when access is ambiguous.

Look for:

```text
index.blocks.read_only_allow_delete=true
cluster.routing.allocation.disk.watermark.flood_stage
cluster.routing.allocation.disk.watermark.high
```

Also inspect logs around the first failure. A `cluster_block_exception` that names `TOO_MANY_REQUESTS/12/disk usage exceeded flood-stage watermark, index has read-only-allow-delete block` is different from Security plugin authorization or an application-specific read-only setting.

If the index name is absent after an authorized check, check your version before creating anything. The OpenSearch Dashboards Observability plugin in 3.0 removed support for legacy notebooks previously stored in `.opensearch-observability`; a missing legacy index is not a reason to recreate it manually.

## Relieve disk pressure first

Choose an operationally safe action:

- increase the data volume or add correctly configured data nodes;
- allow replicas/shards to relocate to eligible nodes below the low watermark with enough room for the shard;
- apply or repair ISM retention for time-series data;
- delete only indexes confirmed to be outside retention and recovery requirements;
- snapshot data before deletion when policy requires it.

Find the largest ordinary indexes:

```http
GET _cat/indices?v&s=store.size:desc&h=health,status,index,pri,rep,docs.count,store.size
```

Do not delete `.opensearch-observability`, `.opensearch_dashboards*`, alerting, security, or other component-owned system indexes to make emergency space. Component-owned system indexes contain state and should be managed through their owning feature.

Changing flood-stage from `95%` to `99%`, disabling disk thresholds, or clearing the block while the disk remains full only suppresses the safety mechanism. It can lead to node failure and corrupt operational state.

## Wait for allocation information to update

Disk usage is sampled periodically; the current default cluster info update interval is 30 seconds. After freeing space, verify every affected node is below the **high** watermark, not merely below flood stage:

```http
GET _cat/allocation?v&s=disk.percent:desc
GET _cluster/health?pretty
```

Current OpenSearch should remove the flood-stage block automatically at that point. Confirm the effective index setting again.

## Clear a stale block on the exact index

If disk is safely below the high watermark and the block remains, remove only the block setting from the identified index:

```http
PUT .opensearch-observability/_settings
{
  "index.blocks.read_only_allow_delete": null
}
```

Using `null` restores the default rather than pinning a value. Avoid examples that target `*`; one broad request can make intentionally read-only or restored indexes writable.

When Security system-index protection is enabled, this settings request must be made either by a super admin authenticated with an admin client certificate or, if `plugins.security.system_indices.permission.enabled` is `true`, by a role that grants both `system:admin/system_index` for `.opensearch-observability` and `indices:admin/settings/update`. A broad index role does not bypass system-index protection. Use this elevated path only for the block repair, and continue to manage observability documents through the owning plugin API.

If multiple known application indexes were flood-blocked, enumerate and validate them first, then update that explicit list. Retest the owning Observability operation rather than inserting documents into a plugin index by hand.

## If the block returns

A returning flood-stage block usually means disk pressure persists or shards moved back onto a full node. Investigate:

- unexpected ingestion growth or a failed shipper retry loop;
- ISM policies not attached to new indexes/data-stream generations;
- too many small shards preventing useful allocation;
- replica count exceeding available capacity;
- snapshots or local logs sharing the data volume;
- a byte-based watermark misunderstood as percentage semantics.

Percentage watermarks describe **used** disk, while byte values describe **free** disk. Keep low, high, and flood-stage values internally consistent and validate changes on a test cluster.

## Prevent recurrence

Create alerts with enough lead time at the low/high watermark, monitor ingestion rate and days-to-full, and enforce tested rollover/deletion policies. Capacity planning should include relocation headroom: a cluster that is safe only when every node is 89% full has little room to recover from a node failure.

## Official References

- [OpenSearch disk watermark cluster settings](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/cluster-settings/)
- [OpenSearch CAT allocation API](https://docs.opensearch.org/latest/api-reference/cat/cat-allocation/)
- [OpenSearch ISM policies](https://docs.opensearch.org/latest/im-plugin/ism/policies/)
- [OpenSearch 3.0 breaking changes for legacy notebooks](https://docs.opensearch.org/latest/breaking-changes/)
- [OpenSearch system indexes](https://docs.opensearch.org/latest/security/configuration/system-indices/)
