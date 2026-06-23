# Validation Summary: How to Handle Unassigned Shards in Elasticsearch

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Elasticsearch cluster health and shard allocation
- Elasticsearch cat shards, allocation explain, cluster settings, and reroute APIs
- Elasticsearch disk watermarks and allocation awareness
- Python Elasticsearch client
- JavaScript Elasticsearch client

## Sources Consulted
- Elastic Docs: Diagnose unassigned shards - https://www.elastic.co/docs/troubleshoot/elasticsearch/diagnose-unassigned-shards
- Elasticsearch API documentation: Cluster allocation explain API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-allocation-explain
- Elasticsearch API documentation: Cluster reroute API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cluster-reroute
- Elasticsearch API documentation: Cat shards API - https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-cat-shards
- Elastic Reference: Cluster-level shard allocation and routing settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/cluster-level-shard-allocation-routing-settings
- Elastic Docs: Shard allocation awareness - https://www.elastic.co/docs/deploy-manage/distributed-architecture/shard-allocation-relocation-recovery/shard-allocation-awareness
- Elastic Docs: Watermark errors - https://www.elastic.co/docs/troubleshoot/elasticsearch/fix-watermark-errors
- Elastic Python client migration guide - https://www.elastic.co/guide/en/elasticsearch/client/python-api/8.19/migration.html
- Elastic Python client cluster API reference - https://elasticsearch-py.readthedocs.io/en/latest/api/cluster.html
- Elastic JavaScript client API reference - https://www.elastic.co/docs/reference/elasticsearch/clients/javascript/api-reference

## Issues Found
- The Node Left diagnostic snippet used a shell `grep` pipe in a REST-console style request. Changed it to a valid `_cat/shards` request sorted by state so it works in Elasticsearch API Console.
- The disk watermark example used transient cluster settings. Current Elastic documentation recommends persistent settings over transient settings, so the example now uses `persistent` and clarifies that the raised watermarks should be reset after disk pressure is resolved.
- The force merge comment implied force merge generally reclaims disk space. Updated the comment to clarify that it can reclaim deleted-document space after deletes, especially on old read-only indices.
- The Python monitoring script read flattened setting keys from a non-flattened cluster settings response and used the older `body` style for `put_settings`. Updated it to request `flat_settings=True` and pass `persistent=` directly.
- The Python monitoring script attempted to read `unassigned.reason` without requesting that cat shards column. Updated the cat shards call to request `index,shard,prirep,state,unassigned.reason`.
- The JavaScript monitoring script read flattened setting keys from a non-flattened cluster settings response and used `body` for `putSettings`. Updated it to request `flat_settings: true` and pass `persistent` directly.
- The JavaScript monitoring script returned no `totalUnassigned` field for healthy clusters, causing the usage example to print `undefined`. Updated it to return `totalUnassigned: 0` and an empty `details` array.
- The JavaScript monitoring script attempted to read shard details without requesting the `unassigned.reason` cat shards column. Updated the cat shards call to request the required columns.
- The allocation awareness example incorrectly configured `index.routing.allocation.awareness.attributes` as an index setting. Replaced it with the supported cluster-level `cluster.routing.allocation.awareness.attributes` setting in `elasticsearch.yml` and via the cluster settings API.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. The examples are version-neutral for modern Elasticsearch 8.x/9.x APIs, but production use should still validate destructive reroute commands with `dry_run=true` and backups before using `allocate_empty_primary` or `allocate_stale_primary`.
