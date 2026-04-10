# How to Understand Ceph Data Integrity Guarantees

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Data Integrity, BlueStore, Checksum

Description: Understand how Ceph ensures data integrity through checksums, scrubbing, and replication, and how to verify these guarantees are active in your cluster.

---

Data integrity is one of the most critical requirements for any storage system. Ceph provides multiple layers of protection that together ensure data is never silently corrupted.

## Checksums at the BlueStore Layer

BlueStore, Ceph's default object store since Luminous, stores a checksum alongside every piece of data written to disk. Supported algorithms include crc32c (default), xxhash32, xxhash64, crc32c_16, crc32c_8, and none.

```bash
ceph config get osd bluestore_csum_type
```

Expected output:

```text
crc32c
```

Checksums are verified on every read. If a mismatch is detected, Ceph returns an error rather than serving corrupted data.

## Replication and Erasure Coding

Ceph stores data redundantly. With replicated pools, each object is written to multiple OSDs. If one copy becomes corrupted, Ceph can serve the data from another replica.

```bash
ceph osd pool get mypool size
ceph osd pool get mypool min_size
```

Erasure-coded pools split objects into data and parity chunks. Even if some chunks are lost or corrupted, the object can be recovered from the remaining chunks.

## Scrubbing: Periodic Consistency Verification

Ceph scrubs placement groups regularly to detect and repair silent corruption.

- **Light scrubbing** - compares object metadata and size across replicas (daily by default)
- **Deep scrubbing** - reads actual data bytes and verifies checksums (weekly by default)

```bash
ceph pg dump | grep scrub
ceph osd pool set mypool scrub_min_interval 86400
ceph osd pool set mypool deep_scrub_interval 604800
```

## Journaling and Write Safety

BlueStore uses a write-ahead log (WAL) and a separate RocksDB metadata store to ensure that partial writes do not result in data loss. If a node crashes mid-write, the WAL ensures the operation is either fully committed or rolled back on recovery.

## Detecting and Repairing Inconsistencies

When scrubbing finds a problem, the PG is marked inconsistent:

```bash
ceph health detail | grep inconsistent
```

Repair a specific PG:

```bash
ceph pg repair 2.3f
```

Ceph will use healthy replicas to overwrite the corrupted copy.

## Verifying Integrity End-to-End

Write a known object and verify its checksum manually:

```bash
echo "test data" | rados put testobj - -p mypool
rados get testobj /tmp/verify -p mypool
md5sum /tmp/verify
```

You can also use the RADOS bench tool to validate reads under load:

```bash
rados bench -p mypool 30 write --no-cleanup
rados bench -p mypool 30 seq
```

## Summary

Ceph provides layered data integrity protection through BlueStore checksums, replication or erasure coding, periodic scrubbing, and write-ahead logging. Together these mechanisms ensure that corruption is detected immediately and that clean replicas are used to repair any affected data. Regularly monitoring scrub status and health detail output keeps your integrity guarantees active.
