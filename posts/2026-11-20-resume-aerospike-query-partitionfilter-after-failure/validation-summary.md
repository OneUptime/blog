# Validation summary

## Checks performed

Reviewed Java 10.5.0 client query overload, PartitionFilter, PartitionStatus, QueryPolicy and listener command source plus official query tutorials. Compiled the exact article class with javac 17.0.16 against published aerospike-client-jdk8 10.5.0. A trusted synthetic cursor serialization round-trip preserved range, IDs, digest, bval and retry state. Inspected callback-before-cursor-update ordering and iterator caveat. Checked diagram references structurally and visually inspected generated 1280x720 social image.

## Limitations

No database query, network failure, durable sink, checkpoint publication or crash recovery was run. Synthetic same-version serialization does not prove cross-version compatibility or exactly-once processing. Mermaid was not browser-rendered.

## Sources reviewed

- https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/query/PartitionFilter.java
- https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/AerospikeClient.java
- https://aerospike.com/docs/develop/tutorials/queries/query-streams-java/
- https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/query/QueryListenerCommand.java
- https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/query/PartitionStatus.java
- https://aerospike.com/docs/develop/tutorials/queries/query-splits-java/
- https://repo.maven.apache.org/maven2/com/aerospike/aerospike-client-jdk8/10.5.0/aerospike-client-jdk8-10.5.0.jar

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
