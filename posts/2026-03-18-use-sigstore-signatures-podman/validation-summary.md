# Validation Summary: How to Use Sigstore Signatures with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Sigstore
- Cosign
- Rekor
- Fulcio
- Container image registries
- OIDC-based signing and verification

## Sources Consulted
- Sigstore Cosign container signing docs: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore Cosign verification docs: https://docs.sigstore.dev/cosign/verifying/verify/
- Cosign `sign` command reference: https://raw.githubusercontent.com/sigstore/cosign/main/doc/cosign_sign.md
- Cosign `verify` command reference: https://raw.githubusercontent.com/sigstore/cosign/main/doc/cosign_verify.md
- Cosign `generate-key-pair` command reference: https://raw.githubusercontent.com/sigstore/cosign/main/doc/cosign_generate-key-pair.md
- Cosign `download signature` command reference: https://raw.githubusercontent.com/sigstore/cosign/main/doc/cosign_download_signature.md
- Containers image policy format (`sigstoreSigned`, `signedIdentity`): https://raw.githubusercontent.com/containers/image/main/docs/containers-policy.json.5.md
- Containers registries.d format (`use-sigstore-attachments`): https://raw.githubusercontent.com/containers/image/main/docs/containers-registries.d.5.md
- Podman image trust documentation: https://docs.podman.io/en/latest/markdown/podman-image-trust.1.html
- Rekor CLI search implementation (`--email` support): https://raw.githubusercontent.com/sigstore/rekor/main/cmd/rekor-cli/app/search.go

## Issues Found
- The local-registry Cosign examples used `--allow-insecure-registry`, but the documented flag for plain HTTP registries is `--allow-http-registry`. Updated all `localhost:5000` Cosign examples accordingly.
- The key-based example tagged `alpine:latest` without first ensuring the image was present locally. Added `podman pull docker.io/library/alpine:latest` so the tag step works reliably.
- The keyless and annotation examples attempted to sign tags that had not been created and pushed. Added the missing `podman tag` and `podman push` steps for those examples.
- The Podman verification section omitted the `registries.d` setting required for Sigstore attachments. Added a `use-sigstore-attachments: true` example, which the `containers-policy.json` documentation requires for registry-hosted Sigstore signatures.
- The Podman `sigstoreSigned` policy examples omitted `signedIdentity`. For Cosign-created signatures, the upstream policy docs note that `matchRepository` or `exactRepository` identity matching must be used. Added `signedIdentity` with `exactRepository`.
- The keyless Podman policy used a GitHub Actions-style issuer plus `subjectEmail`, which does not match the documented Fulcio policy shape shown for email identities. Replaced it with an email-based OIDC example consistent with the `fulcio` policy schema.
- The “View the signature manifest” example used `cosign triangulate`, which only resolves a signature artifact reference and does not display the signature payload. Replaced it with `cosign download signature`, which is the documented way to retrieve signature JSON.
- The CI example did not suppress interactive prompts and did not mention the password environment variable expected for encrypted Cosign keys. Added `--yes` and clarified the `COSIGN_PASSWORD` expectation in the comment.
- The Rekor example used a fallback message that could also trigger on a valid “no results” case. Simplified it to the direct `rekor-cli search --email ...` command and noted that it requires `rekor-cli`.

## Review Notes
- Cosign’s current documentation recommends signing image digests rather than mutable tags to avoid tag-race or retagging issues. The post’s tag-based examples remain functional, but digest-based examples would be a stronger future improvement.
- The Podman policy examples keep a permissive global default (`insecureAcceptAnything`) and rely on scoped `sigstoreSigned` rules for enforcement. This is technically valid for demonstration, but a stricter default such as `reject` would be safer for production systems.
