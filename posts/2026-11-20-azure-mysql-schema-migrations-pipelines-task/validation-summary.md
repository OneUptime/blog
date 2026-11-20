# Validation summary

Reviewed the official task reference and task 2.283.1 source at commit e6922cbeb9bbaf49f4f9b406ce6c539eb545d908, together with Microsoft deployment checks and MySQL TLS, online DDL and implicit-commit documentation. The article separates Azure discovery permissions from SQL privileges and explains partial migration recovery.

YAML parsed with PyYAML 6.0.2 and task inputs matched the pinned schema. Both SQL statements parsed with sqlglot 28.0.0. The seven-node, six-edge Mermaid diagram received a structural check. The generated social image was visually inspected and is readable without clipping.

No pipeline, MySQL server, Azure infrastructure or migration was executed. Local parsing does not test service acceptance, networking, table-specific online DDL constraints or application compatibility. The verification SELECT is explicitly evidence, not an automated failure assertion. Mermaid was not rendered.

Sources are listed in validation.json and linked beside the relevant article claims.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
