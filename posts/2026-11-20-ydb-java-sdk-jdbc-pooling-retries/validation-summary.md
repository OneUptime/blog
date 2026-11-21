# Validation review

Both separate Maven projects compiled with JDK 17.0.16 and Maven 3.9.11. Native code uses SDK 2.5.0; JDBC uses driver 2.4.1 with HikariCP 6.3.0 and its own transitive SDK. Reviewed retry count, lifecycle, TLS file properties and BAD_SESSION transaction boundaries against tagged official sources.

The seven-node, seven-edge Mermaid diagram was structurally checked, not rendered. Social image visually reviewed. No database query, certificate handshake, token loading, pool saturation or failure injection was run. Compilation alone does not establish server compatibility or production-safe transaction replay. Sources are in validation.json and article links.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
