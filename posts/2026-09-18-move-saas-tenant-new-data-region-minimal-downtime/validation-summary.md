# Validation Summary: How to Move One SaaS Tenant to a New Data Region with Minimal Downtime

## Status
validated

## Post Type
Technical migration guide with an illustrative PostgreSQL SQL example.

## Technologies Covered
- PostgreSQL 18 publications, row filters, replica identity, and logical replication.
- Logical decoding, WAL retention, replication slots, and snapshot synchronization.
- Multitenant SaaS, regional placement, and Azure deployment stamps.
- Transactional write fencing, routing versions, queues, and idempotency.
- Object storage, migration validation, rollback, and source-data retirement.

## Sources Consulted
- PostgreSQL 18 — Row Filters: https://www.postgresql.org/docs/18/logical-replication-row-filter.html
- PostgreSQL 18 — CREATE PUBLICATION: https://www.postgresql.org/docs/18/sql-createpublication.html
- PostgreSQL 18 — Logical Replication Restrictions: https://www.postgresql.org/docs/18/logical-replication-restrictions.html
- PostgreSQL 18 — Logical Decoding Concepts: https://www.postgresql.org/docs/18/logicaldecoding-explanation.html
- PostgreSQL 18 — Logical Replication Architecture: https://www.postgresql.org/docs/18/logical-replication-architecture.html
- PostgreSQL 18 — Logical Replication Security: https://www.postgresql.org/docs/18/logical-replication-security.html
- PostgreSQL 18 — Transaction Isolation: https://www.postgresql.org/docs/18/transaction-iso.html
- PostgreSQL 18 — Explicit Locking: https://www.postgresql.org/docs/18/explicit-locking.html
- Microsoft Azure Architecture Center — Deployment Stamps Pattern: https://learn.microsoft.com/en-us/azure/architecture/patterns/deployment-stamp
- AWS Builders' Library — Making retries safe with idempotent APIs: https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/
- AWS Database Migration Service — Best Practices: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_BestPractices.html
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The source-fencing paragraph allowed a transactional ownership check without specifying concurrency control. A plain read does not lock the ownership row against concurrent fence changes; a writer could read the old ownership, then commit a mutation after the fence changes. Updated that paragraph to require locking that serializes mutations against fence changes and explain why a plain transactional read is insufficient. PostgreSQL's transaction-isolation and explicit-locking documentation support this correction. No other technical errors were found.

## Review Notes
- The SQL statement matches PostgreSQL 18 syntax. The parenthesized row filter and the comma-separated publication operation list are valid. The example excludes TRUNCATE. It assumes an existing compatible orders table, a numeric tenant_id, sufficient publication privileges, and replica identity covering tenant_id; the stated primary key provides that coverage under the default replica identity.
- Confirmed the row-filter restrictions for UPDATE and DELETE, the lack of tenant filtering for TRUNCATE, and the initial-copy caveat for subscribers older than PostgreSQL 15. Across publications, filters are ORed for the same table and operation; an unfiltered publication can defeat the intended tenant restriction. Publication filtering is not a publication-level access-control boundary.
- Confirmed that native logical replication does not migrate DDL, sequence state, or PostgreSQL large objects. Sequence-backed column values do replicate as table data, which is distinct from synchronizing the sequence itself.
- Confirmed snapshot/change-stream coordination, replication-slot retention and cleanup concerns, and the distinction between table synchronization and ongoing apply progress. Monitoring transport progress alone is insufficient for migration acceptance.
- Microsoft's deployment-stamp guidance explicitly requires custom tenant-transfer and source-removal logic. The remaining scope inventory, placement state, validation, and retirement steps are application-level design guidance rather than automatic PostgreSQL capabilities or jurisdiction-specific legal guarantees.
- The staged cutover and rollback boundary are sound: stop source writes, finish replication and validation, then activate the destination. Returning to the source after destination writes requires preserving those writes through a separately designed synchronization or reconciliation process.
- Idempotency records address ambiguous responses and retries; their persistence must be coordinated with the operation's side effects. The post appropriately avoids promising uninterrupted writes or a fixed downtime duration.
- All external links in the post resolved to the intended resources; the author link redirects to the canonical GitHub profile.
- This was a documentation-based review. The illustrative SQL was not executed against a live PostgreSQL server, and no end-to-end migration was tested. There are no terminal commands or standalone configuration snippets in the post.
