# Validation review

Reviewed YDB active-transaction FAQ, transaction mode recipe and Python SDK3.35.0 context/execute/session source. Confirmed first execution can begin a transaction, commit_tx requests completion, context exit is rollback fallback rather than automatic successful commit, and the context is not thread-safe.

Executed SDK3.35.0 create_execute_query_request locally for SELECT1 with Serializable Read/Write mode. Serialized protocol messages contained begin_tx.serializable_read_write and the requested true/false commit_tx flags. No message was sent. Python syntax checking passed for execute_once.py.

No server-side query, transaction cleanup or limit behavior was tested. Live normal rejection, exception and lost-commit-response cases remain staging requirements. Mermaid structure passed with nine nodes and ten edges, without rendering. The generated1280x720 image was visually reviewed and is legible and unclipped.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
