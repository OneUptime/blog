# Validation summary

Reviewed Azure MySQL metric scope, slow-log configuration and workbook schema, MySQL 8.0 statement summaries and timer units, and EXPLAIN execution behavior using official sources linked in the article and validation.json.

Two SQL examples passed sqlglot 28.0.0 MySQL parsing. KQL was source-reviewed, not executed. The diagram has six declared nodes and five connected edges; no diagram renderer was used. The generated social image was visually inspected and is readable without clipping.

No Azure service or MySQL database was accessed. These checks do not establish runtime permissions, logging coverage, ingestion delay, or a CPU cause. The article explicitly separates elapsed query timing from CPU consumption and cumulative summaries from interval measurements.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
