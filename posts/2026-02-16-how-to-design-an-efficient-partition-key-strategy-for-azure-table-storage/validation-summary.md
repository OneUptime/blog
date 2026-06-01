# Validation Summary: How to Design an Efficient Partition Key Strategy for Azure Table Storage

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Azure Table Storage
- Azure Tables Python client library
- Azure Table Storage partition keys and row keys
- Entity group transactions
- Python datetime and hashing APIs
- Azurite

## Sources Consulted
- Microsoft Learn: Scalability and performance targets for Table storage - https://learn.microsoft.com/en-ie/azure/storage/tables/scalability-targets
- Microsoft Learn: Performance and scalability checklist for Table storage - https://learn.microsoft.com/en-us/azure/storage/tables/storage-performance-checklist
- Microsoft Learn: Design Azure Table storage for queries - https://learn.microsoft.com/en-us/azure/storage/tables/table-storage-design-for-query
- Microsoft Learn: Azure storage table design patterns - https://learn.microsoft.com/en-us/azure/storage/tables/table-storage-design-patterns
- Microsoft Learn: Data partitioning strategies, Partitioning Azure Table storage - https://learn.microsoft.com/en-us/azure/architecture/best-practices/data-partitioning-strategies
- Microsoft Learn: Performing entity group transactions - https://learn.microsoft.com/en-us/rest/api/storageservices/performing-entity-group-transactions
- Microsoft Learn: Azure Tables client library for Python - https://learn.microsoft.com/en-us/python/api/overview/azure/data-tables-readme
- Microsoft Learn: azure.data.tables.TableClient class - https://learn.microsoft.com/en-us/python/api/azure-data-tables/azure.data.tables.tableclient
- Python documentation: datetime - https://docs.python.org/3/library/datetime.html
- Python documentation: hashlib - https://docs.python.org/3/library/hashlib.html

## Issues Found
- The post described all entities with the same partition key as living on the same storage node. Microsoft documents this in terms of partitions, and notes that a single partition cannot be load-balanced independently. Updated the wording to refer to partitions and single-partition scans.
- The post stated a flat 2,000 operations-per-second limit. Microsoft documents the target as up to 2,000 1-KiB entities per second for a single table partition. Updated the throughput wording in the explanation and decision framework.
- Several Python examples used `datetime.utcnow()`, which is deprecated in Python 3.12. Replaced these calls with `datetime.now(timezone.utc)` and added the required imports.
- One example used an undefined `generate_id()` helper. Replaced it with `uuid4()` and added the import.
- The hash distribution example used MD5. Replaced it with SHA-256 to avoid relying on MD5 availability and to use a current standard library hashing API for non-security partition bucketing.
- The inverted timestamp examples used short, variable-width values and did not add a uniqueness suffix. Updated them to use fixed-width reverse tick values with a UUID suffix, matching the Table Storage log tail pattern's ordering requirements and avoiding duplicate row keys for events in the same tick window.
- The lifecycle section said old data could be cleaned up by deleting entire partitions. Azure Table Storage exposes delete operations for entities and tables, not a direct user operation to delete a partition. Updated the wording to query old partition key values and batch-delete matching entities.
- The sequential partition key anti-pattern was phrased as all new writes going to the same current-range node. Microsoft documents the risk as small, monotonic partitions being physically grouped on the same server. Updated the wording to match that behavior.

## Review Notes
The examples still assume `table_client` is an initialized `TableClient`, which is acceptable for focused partition-key snippets. Batch transaction limits remain correctly described as same-partition operations with a maximum of 100 entities and a 4 MiB payload.
