# Validation summary

Reviewed official Azure MySQL auditing and routing documentation, supported log category mapping, both table schemas, KQL summarization and Log Analytics cost concepts. Examples use AzureDiagnostics explicitly; they do not assume that the resource-specific schema is interchangeable.

Both KQL blocks were reviewed for documented columns and resource, category and time scope. Basic delimiter checks passed; no KQL parser or query engine was available, so no syntax-engine or runtime success is claimed. The diagram passed a structural five-node/four-edge check and was not rendered. The generated social image was visually inspected and is readable without clipping.

No server parameters, diagnostic settings, live queries, known audit events or ingestion measurements were performed. Actual field availability, delivery and coverage require the stated workspace acceptance checks.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
