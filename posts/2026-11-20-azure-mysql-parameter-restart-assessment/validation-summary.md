# Validation summary

Reviewed official Azure parameter metadata, portal behavior, restart guidance and actual Azure CLI 2.80.0 MySQL command/source implementation. The article separates saved configuration, running global variables and existing session values, and requires review of all pending changes before a server-wide restart. Controlled test traffic precedes resumption of normal writers.

Three shell snippets passed Bash syntax checks. JMESPath 1.0.1 tests used synthetic static-pending, dynamic-clear, missing-metadata and empty-list cases. The SQL inspection parsed as SELECT with sqlglot 28.0.0. Mermaid passed structural checks for six nodes/five edges. The generated image was visually inspected and has readable, unclipped text.

No Azure API, parameter update, restart, database query or application recovery action ran. Synthetic metadata checks cannot establish actual server restart requirements. Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
