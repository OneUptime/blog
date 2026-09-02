# Validation Summary: Why Is the `.opensearch-observability` Index Read-Only? Recovering from Flood-Stage Disk Watermarks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenSearch
- OpenSearch Dashboards Observability
- OpenSearch Security system indexes
- OpenSearch Index State Management (ISM)
- OpenSearch disk-based shard allocation

## Sources Consulted
- [OpenSearch cluster settings: disk-based shard allocation and cluster information](https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/cluster-settings/)
- [OpenSearch CAT allocation API](https://docs.opensearch.org/latest/api-reference/cat/cat-allocation/)
- [OpenSearch CAT indices API](https://docs.opensearch.org/latest/api-reference/cat/cat-indices/)
- [OpenSearch Get settings API](https://docs.opensearch.org/latest/api-reference/index-apis/get-settings/)
- [OpenSearch Update settings API](https://docs.opensearch.org/latest/api-reference/index-apis/update-settings/)
- [OpenSearch Security system indexes](https://docs.opensearch.org/latest/security/configuration/system-indices/)
- [OpenSearch Security permissions](https://docs.opensearch.org/latest/security/access-control/permissions/)
- [OpenSearch Index State Management policies](https://docs.opensearch.org/latest/im-plugin/ism/policies/)
- [OpenSearch breaking changes: removal of legacy notebook support in 3.0](https://docs.opensearch.org/latest/breaking-changes/)
- [OpenSearch 2.19 `DiskThresholdSettings` source](https://github.com/opensearch-project/OpenSearch/blob/2.19/server/src/main/java/org/opensearch/cluster/routing/allocation/DiskThresholdSettings.java)
- [OpenSearch 3.0 `DiskThresholdSettings` source](https://github.com/opensearch-project/OpenSearch/blob/3.0/server/src/main/java/org/opensearch/cluster/routing/allocation/DiskThresholdSettings.java)

## Issues Found
No technical issues found.

## Review Notes
The post correctly treats `.opensearch-observability` as component-owned state and limits direct index-settings access to recovery of the flood-stage block. The version distinction for automatic block release is accurate: OpenSearch 1.x and 2.x retained the `opensearch.disk.auto_release_flood_stage_block` system-property escape hatch, while OpenSearch 3.0 rejects that removed property and unconditionally performs the normal automatic release. The linked official references were reachable when reviewed.
