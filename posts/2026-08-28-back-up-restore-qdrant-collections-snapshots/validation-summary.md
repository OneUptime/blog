# Validation Summary: How to Back Up and Restore Qdrant Collections with Snapshots

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Qdrant collection snapshots and full storage snapshots
- Qdrant REST API
- Qdrant distributed collections, shards, replicas, and aliases
- curl and multipart file uploads
- Docker snapshot storage
- Backup, restore, and disaster-recovery operations

## Sources Consulted
- Qdrant snapshot operations documentation: https://qdrant.tech/documentation/operations/snapshots/
- Qdrant snapshot backup and restore tutorial: https://qdrant.tech/documentation/tutorials-operations/create-snapshot/
- Qdrant migration and recovery options: https://qdrant.tech/documentation/migration-recovery-options/
- Qdrant distributed deployment documentation: https://qdrant.tech/documentation/operations/distributed_deployment/
- Qdrant collection and alias documentation: https://qdrant.tech/documentation/manage-data/collections/
- Qdrant security documentation: https://qdrant.tech/documentation/security/
- Qdrant Cloud backup documentation: https://qdrant.tech/documentation/cloud/backups/
- Qdrant API reference for creating a collection snapshot: https://api.qdrant.tech/master/api-reference/snapshots/create-snapshot
- Qdrant API reference for listing collection snapshots: https://api.qdrant.tech/master/api-reference/snapshots/list-snapshots
- Qdrant API reference for downloading a collection snapshot: https://api.qdrant.tech/master/api-reference/snapshots/get-snapshot
- Qdrant API reference for recovering from an uploaded snapshot: https://api.qdrant.tech/master/api-reference/snapshots/recover-from-uploaded-snapshot
- Qdrant API reference for exact point counts: https://api.qdrant.tech/api-reference/points/count-points
- curl command-line manual: https://curl.se/docs/manpage.html

## Issues Found

1. **URL recovery was described too broadly.** The post said that the server can recover from an accessible snapshot URL without identifying a deployment limitation. Qdrant Cloud blocks outbound traffic and does not support recovery from a URL. Updated the text to limit URL recovery to a self-hosted node that can reach the URL and to direct Qdrant Cloud users to upload the snapshot file.

2. **The distributed-mode restriction for full storage snapshots was understated.** The post said full storage snapshots were "not the normal choice" for a distributed cluster. Qdrant's documentation states that distributed mode is unsupported because full storage snapshots omit necessary cluster files. Updated the paragraph to state that restriction explicitly.

## Review Notes
- The collection snapshot create, list, download, and multipart upload commands use the current documented REST endpoints, header, form field, and recovery-priority value.
- The `replica`, `snapshot`, and `no_sync` priority descriptions are accurate. Qdrant specifically requires `priority=snapshot` when recovering a new collection so an empty replica does not become the source of truth.
- The stated snapshot compatibility rule is current: the target must use the same minor version with an equal or newer patch, or the next minor version.
- Snapshot restore retains the source shard count. The post's absent-target workflow lets Qdrant create the target from the snapshot; changing shard count requires a migration workflow instead.
- A green collection status alone does not prove replica synchronization, but the post separately instructs operators to verify synchronization and collection health.
- `curl --fail-with-body` is current and valid but requires curl 7.76.0 or newer.
- All five official documentation links in the post resolved to relevant Qdrant pages during review; the distributed-deployment link redirects to its current location.
