# How to Migrate PostgreSQL Large Objects Alongside Logical Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Replication, Migration, Database

Description: Inventory PostgreSQL large objects, choose a separate transfer or table-based representation, and validate payloads before logical replication cutover.

An attachment table can look fully synchronized while every attachment download fails on the destination. If its payload column contains a large-object OID, logical replication copies the number stored in the row but does not copy the large object behind that number.

PostgreSQL 18 explicitly excludes large objects from native logical replication. Treat them as a separate migration stream with its own consistency boundary, transfer, and verification. A healthy subscription is not evidence that those bytes arrived. [Logical replication restrictions](https://www.postgresql.org/docs/18/logical-replication-restrictions.html)

## Inventory objects and references

Start with metadata on the publisher:

```sql
SELECT count(*) AS large_object_count
FROM pg_largeobject_metadata;

SELECT oid, pg_get_userbyid(lomowner) AS owner, lomacl
FROM pg_largeobject_metadata
ORDER BY oid;
```

Then inventory application references. Suppose `public.attachments(id, payload_oid)` stores the OIDs:

```sql
SELECT a.id, a.payload_oid
FROM public.attachments AS a
LEFT JOIN pg_largeobject_metadata AS m ON m.oid = a.payload_oid
WHERE a.payload_oid IS NOT NULL
  AND m.oid IS NULL;
```

Run this check before migration and preserve the result. Existing dangling references should not be mistaken for transfer failures. Also identify objects with multiple references, objects with no known reference, and application paths that modify or unlink objects independently of the attachment row.

Searching for `oid` columns helps discovery but is not definitive: applications can store identifiers in domains, integers, or external metadata. Trace the code that creates, writes, reads, and deletes attachments.

## Choose a migration strategy

There are two practical choices for a logical migration:

- Move payloads into ordinary published tables before the migration, updating the application to use the new representation.
- Keep large objects and transfer their final contents separately during a controlled write freeze.

For moderate payloads, a `bytea` column can simplify replication. Large objects support streaming access; converting huge objects into one in-memory value changes application and memory requirements. Do not blindly convert an object population without measuring sizes and checking type limits. [Large object interfaces](https://www.postgresql.org/docs/18/largeobjects.html)

A bounded conversion rehearsal could use:

```sql
ALTER TABLE public.attachments ADD COLUMN payload bytea;

UPDATE public.attachments
SET payload = lo_get(payload_oid)
WHERE id >= 1000 AND id < 2000
  AND payload_oid IS NOT NULL;
```

`lo_get` returns object bytes and requires read access to the object. Before applying this pattern, stop payload writers or implement and test a transactional dual-write strategy. A backfill alone does not capture later modifications made through the large-object API. [Server-side large object functions](https://www.postgresql.org/docs/18/lo-funcs.html)

With writes fenced, validate each converted batch, switch application reads and writes to the new column, and only then resume traffic. Retain the original objects through the rollback window. Removing a table row does not automatically prove its object is unreferenced elsewhere.

## Rehearse a separate large-object transfer

If the application will continue using OIDs, measure a final transfer before scheduling cutover. Use PostgreSQL 18 client tools with PostgreSQL 18 servers in this example. Prepare secure libpq service definitions named `publisher` and `subscriber`.

During the final write freeze, create an archive that excludes table rows but explicitly includes large objects:

```bash
pg_dump --dbname='service=publisher' \
  --format=custom --data-only --large-objects \
  --exclude-table-data='*' --file=lo-cutover.dump

pg_restore --list lo-cutover.dump > lo-cutover.list
```

A data-only dump can include sequence values as well as large objects. Review the list and retain only the large-object creation/content entries and the ownership or ACL entries needed for your transfer. Do not restore unrelated sequence values into the logical target accidentally. The archive list can be edited by commenting out unwanted entries with a semicolon. [pg_dump options](https://www.postgresql.org/docs/18/app-pgdump.html), [selective pg_restore](https://www.postgresql.org/docs/18/app-pgrestore.html)

Inspect the selected output before restoring:

```bash
pg_restore --use-list=lo-cutover.list \
  --file=lo-cutover-review.sql lo-cutover.dump

pg_restore --dbname='service=subscriber' \
  --use-list=lo-cutover.list --exit-on-error \
  --single-transaction lo-cutover.dump
```

Restore into a destination whose large-object namespace has been checked for collisions. Preserve the source OIDs because replicated reference rows contain those identifiers. Do not add `--clean` as a reflex when the destination already contains objects; first determine whether they are disposable and who references them.

## Establish the cutover boundary

Fence all source writers, including upload workers, cleanup jobs, and transactions already in progress. Drain logical replication for the table data, then keep both databases free of application writes while dumping, restoring, and validating large objects. The freeze must cover object creation, modification, and deletion, not just updates to `attachments`.

Compare source and destination OID sets, object ownership, permissions, and referenced payload contents. For small objects, compare byte counts and hashes of `lo_get(payload_oid)`; for large objects, use an application-side streaming checksum to avoid loading each entire object into database memory. Test downloads through the actual destination application role because object permissions are independent of table permissions. [Large object ownership and privileges](https://www.postgresql.org/docs/18/lo-implementation.html)

Abort cutover on a missing object, a checksum mismatch, or a denied read. Keep the source authoritative and resolve the discrepancy while writes remain fenced, or explicitly reopen the source and schedule a fresh final transfer. Once destination writes begin, returning to the source requires reconciliation of those new writes; keeping the old database alive alone does not provide a complete rollback.
