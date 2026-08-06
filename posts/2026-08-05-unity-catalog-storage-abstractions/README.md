# Choose Unity Catalog Storage: Tables, Volumes, or Locations

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Unity Catalog, Managed Tables, Volumes, External Locations, Cloud Storage, Data Governance

Description: Choose the correct Unity Catalog object for tabular data, governed files, and cloud storage administration.

---

Managed tables, volumes, and external locations are not three interchangeable ways to name an S3 directory. They operate at different layers:

- A table is the governed interface to tabular data.
- A volume is the governed interface to a collection of non-tabular files.
- An external location is an administrative trust boundary that combines a cloud path with a storage credential.

Most application code should consume a table name or volume path. Platform administrators use external locations to authorize where external tables and external volumes can be created and, in narrower cases, to govern direct cloud-URI access.

Starting with that separation prevents brittle path-based tables, overlapping storage roots, and privileges granted at a much broader scope than the workload needs.

## The Default Decision

Use this decision order:

1. Does the data have rows and columns that consumers query? Create a Unity Catalog managed table by default.
2. Does the workload need files by name or POSIX-like path, such as documents, images, wheels, checkpoints, or landing files? Create a managed volume by default.
3. Must the files remain at a customer-controlled cloud path or share a lifecycle with a non-Databricks system? Create an external table or external volume under an external location.
4. Does a principal truly need direct cloud-URI access to files that are not registered as a table or volume? Grant narrowly scoped file privileges at the external-location layer only after confirming the requirement.

The word "managed" answers who owns location and lifecycle. The word "table" or "volume" answers whether the governed resource is tabular or file-oriented.

## Managed Tables for Production Tabular Data

Unity Catalog managed tables are the default and recommended table type. Unity Catalog chooses the storage path, manages the data lifecycle and layout, and can apply automatic maintenance and optimization. Current managed tables are backed by Delta Lake or Apache Iceberg.

Create one without a `LOCATION` clause:

```sql
CREATE TABLE prod.sales.orders (
  order_id BIGINT NOT NULL,
  customer_id BIGINT,
  ordered_at TIMESTAMP,
  amount DECIMAL(18, 2)
);
```

Read and write it by name:

```python
orders = spark.table("prod.sales.orders")
orders.write.mode("append").saveAsTable("prod.analytics.order_facts")
```

Do not discover and hard-code the generated cloud directory of a managed table. Path-based access to Unity Catalog managed tables is not supported. The stable contract is `catalog.schema.table`.

A managed table is usually the right choice when:

- Databricks is the primary writer or query engine;
- the dataset should receive managed maintenance and platform improvements;
- consumers need table privileges, lineage, schema, constraints, and transactional semantics;
- direct file access is not a hard requirement.

Dropping a managed table removes its metadata and deletes its underlying data according to the managed object lifecycle. Treat `DROP TABLE` as a destructive data operation, not just deregistration.

## External Tables When the Data Lifecycle Must Stay External

An external table registers tabular files at a cloud path that you manage. Unity Catalog governs access to the table but does not own the storage lifecycle, file layout, or full optimization lifecycle. Dropping the external table removes metadata and leaves the files.

Use an external table for a concrete reason, such as:

- registering an existing data estate without copying it;
- allowing a non-Databricks system to manage or directly access the same files;
- supporting a format or ownership model that does not fit a managed table.

An external table is created at a subdirectory covered by an external location:

```sql
CREATE TABLE prod.exchange.partner_orders
USING DELTA
LOCATION 's3://company-exchange/partner-a/orders';
```

Prefer Delta for external tables when possible because non-transactional file formats lack Delta's transaction guarantees and performance features. Even for an external table, application queries should normally use the table name instead of its URI.

External does not mean ungoverned. Once files are registered as an external table, privileges on that object govern access through Unity Catalog. It does mean your team must own retention, layout, optimization, backups, and coordination with external writers.

## Volumes for Non-Tabular Files and Workload Artifacts

A volume is a Unity Catalog object for files that users or libraries need to address by path. Databricks recommends volumes for non-tabular data and workload support files, including:

- CSV, JSON, or Parquet landing files before ingestion;
- images, audio, PDFs, model artifacts, and documents;
- Python wheels, JARs, init scripts, and build artifacts;
- exports intended for another system;
- configuration and reference files;
- Structured Streaming checkpoint directories.

Create a managed volume by omitting a location:

```sql
CREATE VOLUME prod.ingest.orders_landing;
```

Work with files through its governed path:

```text
/Volumes/prod/ingest/orders_landing/incoming/2026-08-05/orders.json
```

```python
raw_orders = (
    spark.read
    .format("json")
    .load("/Volumes/prod/ingest/orders_landing/incoming/")
)
```

Volume management commands use the three-level object name, but file operations use `/Volumes/<catalog>/<schema>/<volume>/...`. The Databricks CLI is a special case and expects the `dbfs:/Volumes/...` scheme for its filesystem commands.

Do not use a volume as a hidden table directory. Databricks states that volumes are for non-tabular data, and Unity Catalog will not let you register a table over files inside a volume. Ingest the files and write the resulting records to a table.

Managed volumes are the default. Unity Catalog selects their storage directory, and dropping one marks its files for deletion. Use one when the volume object should own the file lifecycle.

## External Volumes for Existing or Shared File Paths

An external volume exposes a customer-controlled subdirectory through the same `/Volumes` interface:

```sql
CREATE EXTERNAL VOLUME prod.exchange.partner_drop
LOCATION 's3://company-exchange/partner-a/drop';
```

Use it when:

- files must stay at an existing path;
- a partner or external tool owns the file lifecycle;
- non-Databricks systems must access the files directly;
- deleting the Unity Catalog registration must not delete the files.

Dropping an external volume leaves its cloud files. Cloud-URI access beneath the volume is governed by volume privileges rather than by the broader external-location privileges.

Even when external systems know the cloud URI, Databricks workloads should prefer the `/Volumes` path. That keeps code portable and permission checks aligned with the volume object.

Volumes support many POSIX-oriented tools, but they are not local disks. Direct append, random writes, and sparse files are not supported. Generate formats such as Excel or ZIP on `/local_disk0` when they require random access, close the file, and then copy the completed artifact to the volume.

## External Locations Are Administrative Boundaries

An external location binds a cloud URI to a Unity Catalog storage credential. For AWS, the credential typically represents an IAM role, and the external location names the S3 prefix that role can access.

Conceptually:

```text
storage credential: who Unity Catalog can become in AWS
external location:  which cloud prefix that identity can access
external table:     governed tabular object within that prefix
external volume:    governed file object within that prefix
```

Platform teams normally create storage credentials and external locations. Data-product teams receive `CREATE EXTERNAL TABLE` or `CREATE EXTERNAL VOLUME` on an approved location, then grant consumers privileges on the narrower table or volume.

Avoid granting `READ FILES` or `WRITE FILES` on a broad external location to ordinary consumers when a table or volume can express the need. Direct path privileges can expose all eligible unregistered files under the location without an object-level schema or table contract. Cloud-URI access beneath a registered external table or external volume is governed by privileges on that object instead.

An external location is accessed by cloud URI, not by `/Volumes` and not by a table identifier. It is not a substitute for creating an actual table or volume.

## Respect Path-Overlap Rules

Unity Catalog prevents overlapping governed roots because two objects claiming the same files would create ambiguous privileges and lifecycle ownership. Current rules include:

- external locations cannot overlap one another;
- volumes cannot overlap other volumes;
- tables cannot overlap other tables;
- a table and a volume cannot overlap;
- external tables and external volumes cannot overlap managed storage;
- managed storage locations cannot overlap each other.

These layouts are invalid:

```text
external location A: s3://company-data/
external location B: s3://company-data/finance/

external volume:     s3://company-data/exchange/
external table:      s3://company-data/exchange/orders/
```

The second external location is nested under the first, and the table is nested inside a volume. Unity Catalog blocks both models.

Create external objects in separate subdirectories under an appropriately scoped external location:

```text
s3://company-data/curated/orders-table/
s3://company-data/files/partner-volume/
```

Do not register a table over Delta files stored inside a volume. You can read them by volume path, but Unity Catalog will not register that path as a table while it belongs to the volume. If the files are intended to become a long-lived queryable dataset, write them to a table-owned location instead.

Also avoid defining an external location at a bucket root that includes workspace internal or Unity Catalog managed storage. Current Databricks validation checks storage conflicts across workspaces in the account, not only the workspace creating the location.

## Privileges Follow the Abstraction

Grant consumers at the narrowest useful object:

```sql
-- Table consumer
GRANT USE CATALOG ON CATALOG prod TO `sales-readers`;
GRANT USE SCHEMA ON SCHEMA prod.sales TO `sales-readers`;
GRANT SELECT ON TABLE prod.sales.orders TO `sales-readers`;

-- File consumer
GRANT USE CATALOG ON CATALOG prod TO `ml-engineers`;
GRANT USE SCHEMA ON SCHEMA prod.features TO `ml-engineers`;
GRANT READ VOLUME ON VOLUME prod.features.models TO `ml-engineers`;
```

Grant `WRITE VOLUME` together with `READ VOLUME` only to principals that create or modify files. Similarly, `WRITE FILES` requires `READ FILES` on the same external location. Use `MODIFY` for table writers. Keep credential administration and external-location creation separate from everyday data access.

Remember that the execution identity must have the grants. A notebook author's access does not prove a production job's service principal can read the same table or volume.

## Apply the Choice to Common Workloads

| Workload | Best starting abstraction | Why |
| --- | --- | --- |
| Curated orders fact data | Managed table | Transactional tabular contract and managed lifecycle |
| Existing partner-owned Delta dataset | External table | Preserve external path and lifecycle |
| Raw JSON landing zone | Managed or external volume | File-level ingestion boundary |
| PDFs for document processing | Volume | Non-tabular, path-oriented access |
| Python wheels for jobs | Volume plus library controls | Governed artifact path |
| Streaming checkpoint | Dedicated managed volume path | Durable, governed, query-specific state |
| Broad S3 prefix for platform onboarding | External location | Administrative cloud trust boundary |
| CSV export consumed by a vendor | External volume | File contract with externally managed lifecycle |

"Parquet" does not automatically mean table. A landing set of Parquet files can belong in a volume before validation. Once it becomes a durable analytical dataset with a schema and consumers, write it to a table.

## Review Lifecycle Before Creation

Ask these questions in design review:

1. Is the resource tabular or file-oriented?
2. Who owns physical file deletion?
3. Does any non-Databricks system need direct cloud access?
4. Which principal creates the object, and which principals read or write it?
5. Could the proposed path overlap a table, volume, external location, managed root, or workspace storage path?
6. What happens to data when the Unity Catalog object is dropped?
7. Will application code use the stable table or volume interface rather than a discovered cloud path?

Write the answers into infrastructure code. Object type and lifecycle are architecture decisions, not last-minute SQL syntax choices.

## Official Documentation

- [Databricks Unity Catalog table types](https://docs.databricks.com/aws/en/tables/types)
- [Work with files in Unity Catalog volumes](https://docs.databricks.com/aws/en/volumes/volume-files)
- [Create and manage Unity Catalog volumes](https://docs.databricks.com/aws/en/volumes/utility-commands)
- [Path rules and access in Unity Catalog volumes](https://docs.databricks.com/aws/en/volumes/paths)
- [Connect to an AWS S3 external location](https://docs.databricks.com/aws/en/connect/unity-catalog/cloud-storage/s3/)
- [Resolve storage path conflicts](https://docs.databricks.com/aws/en/data-governance/unity-catalog/storage-conflicts)
- [Unity Catalog privileges and securable objects](https://docs.databricks.com/aws/en/data-governance/unity-catalog/securable-objects)

## Conclusion

Use managed tables for governed tabular data, volumes for governed files, and external locations to establish cloud-storage trust boundaries. Choose external tables or volumes only when an external path or lifecycle is part of the requirement. Keep paths non-overlapping, grant consumers on the narrowest object, and make drop behavior explicit before production data arrives.
