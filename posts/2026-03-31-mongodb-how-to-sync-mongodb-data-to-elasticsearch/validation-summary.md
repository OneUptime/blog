# Validation Summary: How to Sync MongoDB Data to Elasticsearch

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Change Streams, replica sets)
- Elasticsearch (index mappings, bulk API, search DSL)
- Monstache (Go-based MongoDB-to-Elasticsearch sync tool)
- Python (pymongo, elasticsearch-py)
- Node.js (@elastic/elasticsearch client)

## Sources Consulted
- Monstache documentation and GitHub repository (https://github.com/rwynn/monstache)
- Monstache v6.x configuration reference for TOML config options (mongo-url, elasticsearch-urls, direct-read-namespaces, resume, namespace-map, script blocks)
- PyMongo documentation for MongoClient, Change Streams, and watch() API
- elasticsearch-py documentation for Elasticsearch client, index(), delete(), and helpers.bulk() return values and parameters (stats_only, raise_on_error)
- Elasticsearch official documentation for index creation, mappings, and search query DSL (bool, multi_match, highlight)
- @elastic/elasticsearch Node.js client documentation for Client constructor and search API

## Issues Found

1. **Overview/description mismatch with actual content**: The overview and description claimed the post covered "the MongoDB Kafka Connector with an Elasticsearch Sink" as one of three approaches, but no such section existed in the post. Approach 3 was actually "Initial Bulk Sync." Fixed the overview and description to accurately reflect the content covered.

2. **Misleading comment on direct-read-namespaces**: The comment said "Index all collections from these databases" but the `direct-read-namespaces` config specifies individual namespaces (db.collection pairs), not entire databases. Changed to "Direct read these specific namespaces on startup."

3. **Unused import in Change Stream consumer**: `import json` was imported but never used in the Python code. Removed the unused import.

4. **helpers.bulk return value mismatch**: The `helpers.bulk()` call was missing `stats_only=True`. Without it, the second return value is a list of error dicts, not a count — so `print(f"Failed: {failed}")` would print a list instead of a number. Added `stats_only=True` so both return values are integers matching the print statement.

## Review Notes
- The Monstache download URL references version v6.7.11. The exact version tag could not be independently verified, but the URL format and v6.x range are consistent with the project's release patterns.
- The Python Change Stream consumer uses `document=` parameter for `es_client.index()` (elasticsearch-py 8.x style) alongside `ignore=[404]` for `es_client.delete()` (a 7.x convenience pattern). Both work in elasticsearch-py 8.x but readers should be aware of version expectations.
- The Node.js search example uses `body` in `es.search()`, which is deprecated in @elastic/elasticsearch 8.x in favor of top-level query parameters. It still works but may show deprecation warnings.
- The post does not mention that MongoDB Change Streams require a replica set or sharded cluster — the connection strings include `?replicaSet=rs0` but this prerequisite is never explicitly stated for readers who may not be familiar with it.
