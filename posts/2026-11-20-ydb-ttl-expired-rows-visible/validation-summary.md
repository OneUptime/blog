# Validation review

Reviewed TTL threshold,background deletion,NULL handling and expiration updates against YDB26.2.1.16 documentation. SQL artifacts match article blocks. A local SQLite comparison using normalized UTC text covered past,equal,future and NULL,returning only future. This is not a YDB runtime test. CLI2.35.0 help confirms inspection options.

No YDB schema,query,TTL worker or recovery operation ran. Deletion timing and production retention changes remain untested. Six-node,five-edge Mermaid structurally checked,not rendered;social image visually reviewed. Sources are in validation.json and article links.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
