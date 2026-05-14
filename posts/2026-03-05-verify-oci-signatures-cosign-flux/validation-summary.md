# Validation Summary: How to Verify OCI Artifact Signatures with Cosign in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-controller OCIRepository
- Kubernetes
- OCI artifacts and registries
- Sigstore Cosign
- Sigstore Fulcio and Rekor
- GitHub Actions

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux `flux push artifact` CLI documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Cosign signing command documentation: https://github.com/sigstore/cosign/blob/main/doc/cosign_sign.md
- Sigstore Cosign 2.0 release notes: https://blog.sigstore.dev/cosign-2-0-released/
- GitHub Actions contexts reference: https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/accessing-contextual-information-about-workflow-runs

## Issues Found
- The prerequisites referenced Flux CD v0.35 or later while the examples use the current `source.toolkit.fluxcd.io/v1` OCIRepository API and current Cosign compatibility expectations. Updated the prerequisite to Flux v2.8 or later.
- The signing examples signed mutable tags. Cosign documentation strongly discourages signing by tag, and Flux's own push-and-sign examples capture the pushed artifact digest and sign that digest. Updated the push command to capture `DIGEST_URL` from `flux push artifact --output json` and sign/verify that digest.
- The updated digest capture requires `jq`. Added `jq` to the prerequisites.
- The keyless signing examples still used `COSIGN_EXPERIMENTAL=1`, which has not been required since Cosign 2.0. Removed the environment variable.
- The Flux `matchOIDCIdentity` values were written as plain strings, but Flux treats `issuer` and `subject` as Go regular expressions. Updated them to anchored regexes and escaped literal dots.
- The Mermaid sequence diagram implied that source-controller directly reconciles manifests to the cluster. Adjusted the wording so the verified OCI source is made available to downstream reconciliation.
- The GitHub Actions workflow used `flux push --creds` but did not authenticate Cosign to GHCR before signing. Added `docker/login-action@v3`, captured the pushed digest as a step output, and signed that digest with `cosign sign --yes`.

## Review Notes
- The OCIRepository examples use `apiVersion: source.toolkit.fluxcd.io/v1`, `spec.verify.provider: cosign`, `secretRef`, and `matchOIDCIdentity` fields as documented in the current Flux Source API.
- Flux keyless verification currently relies on the public Fulcio root CA and Rekor instance; custom root CAs or self-hosted Rekor instances remain a caveat in Flux's OCIRepository documentation.
