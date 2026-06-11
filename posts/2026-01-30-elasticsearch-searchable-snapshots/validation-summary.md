# Validation Summary: How to Create Elasticsearch Searchable Snapshots

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Elasticsearch searchable snapshots
- Elasticsearch snapshot repositories
- AWS S3, Google Cloud Storage, and Azure Blob Storage repositories
- Elasticsearch Index Lifecycle Management (ILM)
- Elasticsearch data tiers
- Elasticsearch async search

## Sources Consulted
- Elasticsearch searchable snapshots documentation: https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/searchable-snapshots
- Elasticsearch mount snapshot API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-mount
- Elasticsearch searchable snapshot ILM action documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-searchable-snapshot
- Elasticsearch ILM migrate action documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-migrate
- Elasticsearch ILM allocate action documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-allocate
- Elasticsearch async search API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-async-search-submit
- Elasticsearch searchable snapshot stats API documentation: https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-searchable-snapshots-stats
- Elasticsearch S3 repository documentation: https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/s3-repository
- Elasticsearch GCS repository documentation: https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/google-cloud-storage-repository
- Elasticsearch Azure repository documentation: https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/azure-repository
- Elasticsearch self-managed snapshot repository documentation: https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/self-managed

## Issues Found
- The prerequisites described searchable snapshots as requiring a Platinum or Enterprise license. Current Elastic documentation states that searchable snapshots require an Enterprise license, so the prerequisite was corrected.
- The S3 setup instructed users to install the `repository-s3` plugin. Current Elastic documentation lists S3, GCS, and Azure as built-in self-managed repository types, so the setup text was changed to focus on keystore credentials for explicit S3 keys.
- The ILM warm phase used the `allocate` action with `_tier_preference` under `require`. The allocate action is for custom node attributes, while ILM data-tier migration updates `index.routing.allocation.include._tier_preference`, so the example now uses the `migrate` action.
- The async search example placed `wait_for_completion_timeout` and `keep_alive` in the request body. These are async search query parameters, so they were moved to the request URL.
- The searchable snapshot stats example showed unsupported top-level fields such as `total_hit_count`, `hit_rate`, and `eviction_rate`. The example was replaced with the documented top-level `total` and `stats` response structure.

## Review Notes
- The manual mount examples are technically valid, but Elastic recommends letting ILM manage searchable snapshots and warns against manually mounting ILM-managed snapshots.
- The index template example sets `index.lifecycle.rollover_alias`, but a real rollover setup also needs an initial write index or data stream configuration.
- The cost and latency figures are illustrative and environment-dependent rather than guaranteed Elasticsearch behavior.
