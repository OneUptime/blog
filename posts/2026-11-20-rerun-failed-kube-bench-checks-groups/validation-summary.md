# Technical review

Verified exact filter behavior in tagged v0.14.0 source and with the official native binary. Six synthetic cases confirmed individual/group selection, empty and unknown filters, and rejection of combined check/group flags. Executed the article jq extraction and positive/negative report-membership checks. Three shell blocks passed syntax validation. The diagram was structurally checked and the generated image visually reviewed.

No live Kubernetes node was scanned or changed. Synthetic results establish selection behavior only; Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
