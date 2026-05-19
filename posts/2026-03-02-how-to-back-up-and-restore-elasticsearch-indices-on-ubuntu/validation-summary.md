# Validation Summary: How to Back Up and Restore Elasticsearch Indices on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Elasticsearch snapshot and restore APIs
- Elasticsearch filesystem snapshot repositories
- Elasticsearch S3 snapshot repositories
- Elasticsearch Snapshot Lifecycle Management (SLM)
- Bash scripting
- cron
- curl

## Sources Consulted
- Elastic Docs: Snapshot and restore - https://www.elastic.co/guide/en/elasticsearch/reference/current/snapshot-restore.html
- Elastic Docs: Create a snapshot API - https://www.elastic.co/guide/en/elasticsearch/reference/current/create-snapshot-api.html
- Elastic Docs: Restore snapshot API - https://www.elastic.co/guide/en/elasticsearch/reference/current/restore-snapshot-api.html
- Elastic Docs: Shared file system repository settings - https://www.elastic.co/docs/reference/elasticsearch/configuration-reference/fs-repository-settings
- Elastic Docs: Create or update a snapshot repository API - https://www.elastic.co/guide/en/elasticsearch/reference/current/put-snapshot-repo-api.html
- Elastic Docs: S3 repository - https://www.elastic.co/guide/en/elasticsearch/reference/current/repository-s3.html
- Elastic Docs: Snapshot/restore repository plugins - https://www.elastic.co/guide/en/elasticsearch/plugins/current/repository.html
- Elastic Docs: Create, monitor and delete snapshots with SLM - https://www.elastic.co/guide/en/elasticsearch/reference/master/getting-started-snapshot-lifecycle-management.html

## Issues Found
- The filesystem repository setup described the repository as a local backup without noting the multi-node requirement. Updated it to state that a local directory is appropriate for a single-node cluster, while multi-node clusters need a shared filesystem mounted at the same path on every master and data node.
- The S3 section instructed readers to install the `repository-s3` plugin. Current Elasticsearch releases bundle S3 repository support by default, so the plugin installation command was removed and the text now states that S3 support is bundled.
- The restore instructions said to close an existing index before restoring it. Updated the comment to clarify that in-place restore also requires the existing index to have the same number of primary shards as the index in the snapshot.

## Review Notes
The API examples, repository settings, SLM policy shape, keystore credential commands, snapshot monitoring commands, restore parameters, and cron entry were otherwise consistent with current Elasticsearch documentation. For production use, readers should also verify snapshot and cluster version compatibility before cross-cluster restores.
