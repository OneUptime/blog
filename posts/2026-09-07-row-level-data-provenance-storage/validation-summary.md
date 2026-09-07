# Validation Summary: How to Track Row-Level Data Provenance Without Exploding Storage Costs

## Status
validated

## Post Type
Technical implementation guide.

## Technologies Covered
- Row-level data provenance, lineage, and tiered evidence retention
- W3C PROV entities, activities, and agents
- PostgreSQL SQL, UUIDs, primary keys, partitioning, row versions, and replica identity
- Debezium PostgreSQL change data capture and Apache Kafka checkpoints
- Python hashlib, JSON serialization, SHA-256, and HMAC
- Aggregate contributor sets and Bloom filters
- MySQL binary logging and OpenLineage (documentation references)

## Sources Consulted
- W3C PROV overview: https://www.w3.org/TR/prov-overview/
- W3C PROV primer: https://www.w3.org/TR/prov-primer/
- W3C PROV-O: https://www.w3.org/TR/prov-o/
- PostgreSQL constraints: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL partitioning: https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL system columns: https://www.postgresql.org/docs/current/ddl-system-columns.html
- PostgreSQL UUID type: https://www.postgresql.org/docs/current/datatype-uuid.html
- PostgreSQL PREPARE: https://www.postgresql.org/docs/current/sql-prepare.html
- PostgreSQL INSERT: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL replica identity: https://www.postgresql.org/docs/current/sql-altertable.html#SQL-ALTERTABLE-REPLICA-IDENTITY
- Debezium PostgreSQL connector: https://debezium.io/documentation/reference/stable/connectors/postgresql.html
- Apache Kafka design and delivery semantics: https://kafka.apache.org/41/design/design/
- Python hashlib: https://docs.python.org/3/library/hashlib.html
- Python json: https://docs.python.org/3/library/json.html
- Python hmac: https://docs.python.org/3/library/hmac.html
- Redis Bloom filter documentation: https://redis.io/docs/latest/develop/data-types/probabilistic/bloom-filter/
- MySQL 8.4 binary logging formats: https://dev.mysql.com/doc/refman/8.4/en/binary-log-formats.html
- OpenLineage run cycle: https://openlineage.io/docs/spec/run-cycle/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. **Slice identity rejected unpartitioned datasets and multiple ranges.** The composite primary key implicitly made both partition fields non-null and allowed only one slice per dataset/partition pair in a run. Replaced it with a caller-assigned stable `slice_id` and explained reuse on retries. Optional partition names now remain nullable, and distinct ranges can coexist.
2. **Partitioned side-table prerequisites were missing.** The example only matches output partitioning when the output uses `output_version`, and a partitioned parent cannot accept rows without matching child partitions. Clarified both prerequisites and that a timestamp must uniquely identify a version for its business key.
3. **Key hashes did not explicitly identify row versions.** Business-key-only hashes can collapse distinct versions within a run. Required complete source and target row identities, including versions where needed.
4. **HMAC lookup and rotation requirements were incomplete.** A digest cannot recover the original key, and rotation changes equality results. Added key-version tracking, retention of required keys, and an authorized lookup or queryable source-key set. The existing warning that hashing is not anonymization remains intact.
5. **A CDC range was presented as an alternative to a source snapshot without sufficient reconstruction evidence.** An arbitrary change interval does not supply unchanged source rows. Required a base snapshot plus the complete retained CDC history needed to reconstruct the selected source version.
6. **Debezium operation field was placed in the wrong object.** Corrected the claim: `op` belongs to the event envelope, while database/table/log-position information belongs to `source`. Identified the sample JSON as application-defined metadata, rather than a native Debezium message or configuration.
7. **LSN ranges were insufficiently distinguished from consumed Kafka records.** Added explicit range-boundary semantics and per-topic, per-partition checkpoints. An LSN interval alone does not establish the exact Kafka events processed.
8. **Retry-key serialization and scope could conflate evidence.** Null-delimited interpolation is ambiguous when fields contain the delimiter, and the original key omitted topic, target dataset/version, and transformation version. Replaced it with JSON array serialization and included those identity fields. Specified stable argument types and clarified that Kafka offsets deduplicate consumer retries, not connector duplicates republished at new offsets; those require stable source event identities.
9. **Automatic capture demotion could break the advertised provenance contract.** Limited demotion to cases permitted by the contract; alerting remains an alternative.
10. **The conclusion overstated bounded storage.** Factoring ancestry reduces growth but does not cap total storage. Clarified that storage still grows with retained evidence and requires retention and capture limits for a bound.

## Review Notes
- Executed all four SQL blocks successfully on a temporary, isolated PostgreSQL 14.17 instance, using fixture schemas/tables and PREPARE/EXECUTE for the parameterized INSERT. Checked the current PostgreSQL 18 documentation as well. The temporary server was stopped after testing.
- Verified that the INSERT computes net amount 80 from gross amount 100 and discount 20; verified an insert through a child partition; verified two slices with null partition names for the same run and dataset pair.
- Executed the Python example and checked deterministic retries, differing identity components, and delimiter-containing inputs. Parsed the JSON example successfully. No deprecated Python APIs were found.
- Confirmed W3C entity/activity/agent mappings, fixed-width UUID identity, the warning against durable use of `ctid`, Bloom filter false positives, Debezium transaction metadata, truncate ordering caveats, and replica-identity-dependent before-images against official sources.
- All post links resolved to the intended resources; the author URL redirects to the canonical GitHub profile. MySQL and OpenLineage are supplementary references, with no corresponding executable examples in the post.
- The JSON range is illustrative; its numeric positions and transaction IDs were not checked against a real source log. No end-to-end Debezium/Kafka deployment, storage benchmark, or production retention-policy validation was performed.
- Compression effectiveness depends on contributor cardinality and key distribution. Contributor identities alone cannot reproduce values after source data expires, and exact lookups must account for digest collisions where absolute identity guarantees are required.
- `RUN`, `PARTITION`, `KEY`, and `EXACT_SET` are application-defined resolution labels. Production implementations still need enforceable integrity, atomic publication of data and evidence, and retention appropriate to their contracts.
