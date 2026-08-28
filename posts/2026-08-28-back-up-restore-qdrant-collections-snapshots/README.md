# How to Back Up and Restore Qdrant Collections with Snapshots

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Qdrant, Snapshot, Backup, Restore, Disaster Recovery, Operation

Description: Create consistent Qdrant collection snapshots, move them off-node, restore them with the correct priority, and rehearse recovery without overlooking aliases or cluster shards.

---

Qdrant collection snapshots package a collection's configuration, points, payloads, and built indexes into a file that can be restored later. They are the native unit for collection-level backup and migration, but a snapshot left on the database node is not a complete backup.

A reliable workflow has four parts: create the snapshot, copy it to independent storage, verify and retain it, and regularly restore it into an isolated target. Document aliases and cluster topology separately because a collection snapshot does not capture everything around the collection.

## Know What a Collection Snapshot Covers

A collection snapshot includes:

- collection configuration;
- points and vectors;
- payload data;
- built indexes.

It does **not** include collection aliases. Export the intended alias mapping through your infrastructure configuration or deployment records and recreate aliases after recovery.

In a distributed Qdrant cluster, snapshots are node-local. Create snapshots on every node because each node can hold different local shards. A file from only one peer is not a backup of the entire distributed collection.

## Check Version Compatibility First

Record the exact source version with every backup. Qdrant supports restoring a snapshot into:

- the same minor version, with the target patch version equal to or newer than the source; or
- the next minor version.

For example, a snapshot from `1.18.1` can be restored to `1.18.1` or later `1.18.x`, and to `1.19.x`. Do not assume an arbitrary older or much newer target is compatible. If a disaster-recovery image is upgraded, rehearse the restore again.

## Create a Collection Snapshot

Call the collection snapshot endpoint on the node that owns the data:

```bash
curl --fail-with-body -X POST \
  -H 'api-key: YOUR_API_KEY' \
  http://localhost:6333/collections/documents/snapshots
```

The response contains the generated snapshot name. By default, self-hosted Docker deployments store snapshot files under `/qdrant/snapshots`; the exact host location depends on how that path is mounted.

List available snapshots:

```bash
curl --fail-with-body \
  -H 'api-key: YOUR_API_KEY' \
  http://localhost:6333/collections/documents/snapshots
```

Download the chosen file through Qdrant rather than guessing an internal path:

```bash
curl --fail-with-body \
  -H 'api-key: YOUR_API_KEY' \
  -o documents.snapshot \
  http://localhost:6333/collections/documents/snapshots/SNAPSHOT_NAME
```

Protect snapshot endpoints with authentication and network controls. Snapshots contain the collection's payload and vector data.

## Turn the Snapshot into a Backup

Immediately copy the snapshot outside the Qdrant node and failure domain-for example, to versioned object storage in another account or region. Then:

1. compute and store a checksum;
2. record collection name, source peer, Qdrant version, creation time, size, and encryption details;
3. apply retention and immutability policies appropriate to the data;
4. monitor job completion and off-node copy success separately;
5. test that an operator can retrieve and decrypt the artifact.

A snapshot on the same disk as Qdrant is lost with that disk. A copied file that has never passed a restore drill is only an untested backup candidate.

## Restore by Uploading the Snapshot

Allow temporary disk headroom of roughly twice the collection size during restore. Upload a collection snapshot with multipart form data:

```bash
curl --fail-with-body -X POST \
  -H 'api-key: YOUR_API_KEY' \
  -F 'snapshot=@documents.snapshot' \
  'http://localhost:6333/collections/documents-restored/snapshots/upload?priority=snapshot'
```

If `documents-restored` does not exist, Qdrant creates it from the snapshot. `priority=snapshot` tells Qdrant that snapshot data wins when recovering a new collection. This is important in a distributed deployment: the default `replica` priority can prefer an existing empty replica and propagate that state.

Qdrant exposes three recovery priorities:

- `replica` is the default and prefers existing replica state;
- `snapshot` prefers the uploaded snapshot;
- `no_sync` restores without additional synchronization.

Use `snapshot` for a new recovery collection. Select another mode only when the documented cluster-recovery procedure specifically requires it.

A self-hosted Qdrant node can also recover from a snapshot URL it can reach through the recovery endpoint. Qdrant Cloud does not support URL recovery because it blocks outbound traffic; use an uploaded file there. Upload is often simpler because the operator controls transfer and checksum verification directly.

## Restore Every Required Shard in a Cluster

For distributed collections, follow Qdrant's cluster recovery procedure rather than uploading one arbitrary peer's snapshot and declaring success. Each node snapshot contains the local shard data present on that node. Map snapshot artifacts to peers and shards, restore the required copies, and verify replica synchronization and collection health afterward.

Do not create snapshots simultaneously on every peer if that would overload shared storage or network paths. Stagger work while still producing a complete, labeled backup set.

## Validate the Restored Collection

Do not switch traffic after only receiving HTTP 200. In an isolated environment:

- wait for collection status to become green;
- compare exact point counts where available, not only approximate counters;
- retrieve sampled known point IDs and payloads;
- run representative vector and filtered queries;
- inspect vector dimensions, distance metrics, shard settings, payload schema, and indexes;
- recreate and test aliases;
- review logs for recovery and optimizer errors;
- restart the restored service and repeat critical checks.

Keep the old collection or environment until the restored copy has passed these tests. If you use an alias for cutover, update it atomically only after the application can query the restored collection with the correct embedding model and schema.

## Automate Without Hiding Failures

A scheduled backup job should fail loudly when any required node snapshot, download, checksum, encryption, or upload fails. Useful monitoring includes:

- age of the newest successful off-node backup;
- backup size moving outside an expected range;
- missing peer or shard artifacts;
- object-storage upload and retention failures;
- time since the last successful restore drill.

Use a service credential with only the network and storage access the job needs. Avoid printing API keys or snapshot URLs with credentials into CI logs.

## Collection Snapshots vs Full Storage Snapshots

Qdrant also supports full storage snapshots for single-node deployments. Their restore path is a startup command-line operation, not the collection upload endpoint, and distributed mode is not supported because a full storage snapshot does not contain the necessary cluster files. Collection snapshots are usually easier for granular backup, migration, and isolated restore testing.

Do not substitute a raw live-directory filesystem copy unless the documented storage-snapshot procedure guarantees consistency. Database files can change while they are copied.

## Official Documentation

- [Qdrant snapshots: create, download, recover, and compatibility](https://qdrant.tech/documentation/operations/snapshots/)
- [Qdrant tutorial: create and restore snapshots](https://qdrant.tech/documentation/tutorials-operations/create-snapshot/)
- [Qdrant migration and recovery options](https://qdrant.tech/documentation/migration-recovery-options/)
- [Qdrant Cloud backup documentation](https://qdrant.tech/documentation/cloud/backups/)
- [Qdrant distributed deployment guidance](https://qdrant.tech/documentation/guides/distributed_deployment/)

## Conclusion

Create Qdrant collection snapshots on every node that holds required shards, copy them off-node with metadata and checksums, and restore them regularly in an isolated environment. Use a compatible Qdrant version and `priority=snapshot` for a new recovery collection, validate real data and queries, and recreate aliases separately. Recovery is proven by the restore drill, not by the snapshot file's existence.
