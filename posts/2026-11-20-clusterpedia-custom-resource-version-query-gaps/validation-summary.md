# Validation review

Reviewed official CRD versioning and Clusterpedia synchronization/search documentation alongside the v0.9.0 version negotiator. The article separates member storage versions, served endpoints, synchronized versions, and query versions.

Exact jq1.6 comparison passed matching and mismatch fixtures and rejected empty sources, continuation tokens, missing UIDs, and malformed lists. YAML selection passed chart2.7.0 schema validation inside a synthetic PediaCluster. Shell syntax and six diagram edges passed structural checks. The1280x720 image was visually reviewed with no clipped title.

No live APIs, conversion webhook, reconciliation, or search requests were tested. UID equality does not establish freshness. Other inspection filters were source reviewed. Mermaid was not rendered. Supporting source URLs are recorded in validation.json.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
