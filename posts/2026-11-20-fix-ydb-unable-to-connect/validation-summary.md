# Validation review

Ran version and help commands with official YDB CLI 2.35.0 for macOS ARM64. Confirmed connection flags and SQL script option against actual command help and official reference pages. Bash blocks passed syntax checking. The seven-node, six-edge diagram was checked structurally; the social image was visually reviewed.

No database, credentials, TLS handshake, network discovery, or query was tested. The official binary was downloaded over HTTPS without separate signature verification. Diagram rendering was not performed. Sources are recorded in validation.json and linked in the article.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
