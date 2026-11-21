# Validation summary

Reviewed pinned crane v0.20.3 documentation/source, OCI image-index v1.1.1 and OCI distribution v1.1.1. Local tests used checksum-verified crane and two temporary HTTP loopback registries with isolated empty credential configuration. Both processes were stopped after testing.

Same-repository tagging and cross-registry copying preserved the index digest. Both synthetic platform images and their referenced configurations/layers were fetched. Selecting AMD64 alone produced a different top-level digest. Published shell examples passed syntax checking; equivalent registry operations ran in the fixture. Mermaid received structural review, not rendering. The generated social image was visually reviewed and is readable without cropping.

No application container, production registry, TLS, authenticated access, immutability enforcement, signature migration, or deployment was tested. The article explicitly separates these requirements from the fixture results.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
