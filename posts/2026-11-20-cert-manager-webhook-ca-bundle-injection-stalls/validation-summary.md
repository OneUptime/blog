# Validation summary

Official cert-manager documentation and v1.19.1 source were reviewed for Certificate/Secret selection, association annotations, CA data keys, namespace restrictions, source/target enablement flags, RBAC, reconciliation and CA merging. The default-enabled beta CAInjectorMerging feature and expiry filtering were checked in tagged source. Source URLs are recorded in validation.json.

Three shell blocks passed bash syntax checks. The metadata fragment parsed with PyYAML 6.0.2. The extracted Python fingerprint helper ran with Python 3.11.13 against four certificate-set scenarios for two entries: identical bundles, overlap, reordered/duplicate certificates, and missing current CA. Empty and malformed Base64 inputs failed. This checks comparison behavior, not controller reconciliation or X.509 trust.

No Kubernetes operations, cert-manager runtime, RBAC impersonation, issuance, or rotation were performed. The six-node/five-edge Mermaid diagram was structurally checked without rendering. The generated social image was visually inspected; the complete title is legible and unclipped.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
