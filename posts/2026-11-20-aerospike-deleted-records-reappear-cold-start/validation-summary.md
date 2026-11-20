# Validation summary

## Checks

Compiled the Java helper with javac 17.0.16 against Aerospike Java client 10.5.0. Local assertions verified durableDelete, disabled automatic retries, inherited timeout and generation constraint, and an unchanged original policy. Bash syntax passed. Checked the Mermaid branching structure, seven nodes and six edges. Reviewed edition boundaries, truncation scope, old-node risks, and the distinction between future policy changes and remediation of earlier expunges. Generated and visually inspected the 1280x720 social image; no clipped text.

## Limitations

No live Aerospike server was available. No deletion, tombstone creation, restart, truncation, or restoration was executed. The diagram received structural validation only. The isolated recovery rehearsal remains a reader acceptance procedure.

## Sources

- https://aerospike.com/docs/database/manage/database/cold-start/
- https://aerospike.com/docs/database/learn/architecture/durable-deletes/
- https://aerospike.com/docs/database/reference/info/
- https://aerospike.com/docs/develop/client/java/usage/atomic/delete/
- https://github.com/aerospike/aerospike-client-java/blob/10.5.0/client/src/com/aerospike/client/policy/WritePolicy.java
- https://aerospike.com/docs/database/reference/info/#truncate
- https://aerospike.com/docs/database/manage/namespace/retention/
- https://aerospike.com/docs/database/reference/config/

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
