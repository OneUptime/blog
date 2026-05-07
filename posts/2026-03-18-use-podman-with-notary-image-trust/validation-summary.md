# Validation Summary: How to Use Podman with Notary for Image Trust

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Notary v1
- The Update Framework (TUF)
- GPG simple signing
- `policy.json`
- `registries.d`

## Sources Consulted
- Podman `podman image trust` man page: https://github.com/containers/podman/blob/main/docs/source/markdown/podman-image-trust.1.md.in
- Podman `podman push` man page: https://github.com/containers/podman/blob/main/docs/source/markdown/podman-push.1.md.in
- Podman `podman image sign` man page: https://github.com/containers/podman/blob/main/docs/source/markdown/podman-image-sign.1.md.in
- Podman image-signing tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/image_signing.md
- containers/image `containers-registries.d(5)`: https://github.com/containers/image/blob/main/docs/containers-registries.d.5.md
- containers/image `containers-policy.json(5)`: https://github.com/containers/image/blob/main/docs/containers-policy.json.5.md
- Docker docs, Deploy Notary Server with Compose: https://docs.docker.com/engine/security/trust/deploying_notary/
- Notary advanced usage: https://github.com/theupdateframework/notary/blob/master/docs/advanced_usage.md
- Notary command reference: https://github.com/theupdateframework/notary/blob/master/docs/command_reference.md
- Notary running a service: https://github.com/theupdateframework/notary/blob/master/docs/running_a_service.md
- Notary repository README: https://github.com/notaryproject/notary
- Docker Official Image page for `notary`: https://hub.docker.com/_/notary
- TUF roles and metadata: https://theupdateframework.io/docs/metadata/

## Issues Found
- The post incorrectly implied that Podman directly verifies Notary metadata during image pulls. I corrected the description, introduction, delegation text, and conclusion to explain that Podman enforces trust through `policy.json` plus its own signature storage and verification features, while Notary manages separate TUF metadata.
- The Notary deployment example used a custom Compose stack that did not match the current official guidance and omitted important caveats. I replaced it with Docker's documented sample-stack workflow and added the required legacy/deprecation note because Notary v1 is archived and the official image is deprecated.
- The Notary server configuration example was incomplete. I added the required mutual-TLS client certificate fields, corrected the signer hostname, and updated the storage DSN to match the upstream sample configuration.
- The `notary init` example was incomplete and the explanatory comments were wrong. I changed it to `init -p` so the repository is actually published, and I corrected the explanation of which keys are created locally versus managed by the server.
- The `notary addhash` examples were syntactically wrong. I replaced the invalid positional digest example and `--publish` usage with the documented form that includes `-p`, `<manifest-size>`, and `--sha256 <manifest-sha256>`.
- The Podman verification configuration incorrectly pointed a Notary endpoint at Podman's registry signature configuration and mixed in `use-sigstore-attachments` for a Notary workflow. I replaced that with a correct `lookaside` configuration for Podman's simple-signing verification path.
- The GPG signing section embedded YAML inside a Bash code block and used the older `sigstore` key name in a way that was confusing for current documentation. I split the examples into proper Bash and YAML blocks and updated the configuration to `lookaside` and `lookaside-staging`.
- The Notary delegation examples used incorrect flags and argument ordering. I fixed delegation creation to use positional certificate arguments with `--all-paths`, fixed delegated publishing to use `addhash -p ... --roles`, and clarified that Podman does not consume those delegations directly.
- The key-rotation and emergency-revocation commands were wrong. I replaced the invalid `--server-managed` and `--publish` usage with the documented `-r` flow for server-managed roles, and corrected delegation-key revocation to use `delegation purge -p`.

## Review Notes
- Notary v1 is now a legacy technology: Docker marks the official image as deprecated, and the upstream project was archived in 2025. The corrected post is technically accurate only when framed as a legacy or compatibility workflow.
- Podman also supports `sigstoreSigned` trust policies, but the post now stays focused on the GPG simple-signing path because that is the mechanism actually described by the original examples.
- The review relied on upstream documentation and source-manpage content; `podman` and `notary` were not installed in the local workspace for live command execution.
