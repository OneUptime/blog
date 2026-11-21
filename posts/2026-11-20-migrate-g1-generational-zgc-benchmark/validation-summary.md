# Validation summary

Reviewed collector flags against tagged OpenJDK21 source, Oracle23/24 release documentation, and load-model guidance from Grafana. Verified downloaded Azul archive against its official metadata SHA256; no signature verification.

Compiled and ran the included allocation smoke program under G1 and Generational ZGC on Zulu21.0.13.1+2 macOS ARM64. Both completed and wrote collector logs. Verified enabled flags separately. This is startup/allocation validation, not a service benchmark. No request-latency, production rollout or Linux quota testing was performed.

Reviewed eight-node nine-edge Mermaid structure, metadata and prose; diagram not rendered. Visually inspected the generated1280x720 social image: readable title, no clipping.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
