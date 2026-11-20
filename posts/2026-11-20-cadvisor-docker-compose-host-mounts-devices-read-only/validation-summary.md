# Validation summary

## Sources reviewed

- https://docs.docker.com/reference/cli/docker/system/info/
- https://github.com/google/cadvisor/blob/v0.55.1/README.md
- https://docs.docker.com/engine/security/
- https://docs.docker.com/engine/storage/bind-mounts/
- https://github.com/google/cadvisor/releases/tag/v0.55.1
- https://docs.docker.com/reference/compose-file/services/
- https://docs.docker.com/engine/network/port-publishing/
- https://docs.docker.com/reference/cli/docker/compose/config/
- https://github.com/google/cadvisor/blob/v0.55.1/docs/running.md
- https://github.com/compose-spec/compose-spec/blob/6b3a2a93e77c30ded1aa8264307e74d1208a6eae/schema/compose-spec.json

## Checks performed

- Compose YAML parsed with PyYAML and validated against official Compose JSON schema commit 6b3a2a93e77c30ded1aa8264307e74d1208a6eae.
- Assertions verified five read-only mounts, no source auto-creation, loopback publication, and explicit privileged mode.
- Anonymous HTTPS registry manifest retrieval verified 0.55.1 exists, v0.55.1 returns 404, and SHA-256 matches the article digest; Linux amd64/arm64 entries observed.
- All shell blocks passed sh -n; Mermaid five-edge flow checked structurally.
- Repository social image generated and visually inspected with no title clipping.

## Limitations

- No Docker CLI/daemon or native Linux runtime was available; docker compose config, startup, permissions, API access and metric coverage were not exercised.
- Schema validation is not Compose rendering or host compatibility validation. Registry digest establishes content identity, not publisher signature verification.
- Mermaid structure checked, not rendered. Privileged baseline intentionally does not claim least-privilege isolation.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
