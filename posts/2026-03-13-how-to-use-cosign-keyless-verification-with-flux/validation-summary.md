# Validation Summary: How to Use Cosign Keyless Verification with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Kubernetes
- OCIRepository
- OCI artifacts
- Cosign
- Sigstore
- Fulcio
- Rekor
- GitHub Actions OIDC

## Sources Consulted
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux `push artifact` CLI documentation: https://fluxcd.io/flux/cmd/flux_push_artifact/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore OIDC verification cheat sheet: https://docs.sigstore.dev/quickstart/verification-cheat-sheet/
- Sigstore Cosign signing overview: https://docs.sigstore.dev/cosign/signing/overview/

## Issues Found
- The prerequisites listed Kubernetes v1.25 and Flux v2.1, but the post uses `source.toolkit.fluxcd.io/v1` examples and current Flux documentation lists newer supported Kubernetes versions. Updated the prerequisite wording to require a Kubernetes version supported by the installed Flux release and `source.toolkit.fluxcd.io/v1` support.
- The Flux `matchOIDCIdentity` examples were described as direct identity values, but Flux treats both `issuer` and `subject` as Go regular expressions. Updated the wording and anchored the sample patterns.
- The first GitHub Actions OIDC subject matched `refs/heads/main`, but the workflow signs on tag pushes. Updated the subject pattern to match tag refs for the shown workflow.
- The `flux push artifact` example used an invalid `--revision` format and signed the tag rather than the immutable digest returned by Flux. Updated it to use `<tag>@sha1:<commit-sha>`, `--output json`, and sign the digest URL.
- The verification step checked Kubernetes events with `reason=VerificationSucceeded`, but Flux documents the `SourceVerified` condition with reason `Succeeded`. Updated the command to inspect the `SourceVerified` condition directly.
- The troubleshooting text said keyless verification requires access to both Fulcio and Rekor. Adjusted the wording to distinguish Fulcio for keyless signing from Flux verification using the public Rekor instance.

## Review Notes
The Flux keyless verification feature is still documented as experimental, and Flux currently does not support custom root CAs or self-hosted Rekor instances for keyless verification. The local workspace did not have `flux`, `cosign`, or `kubectl` installed, so CLI validation was performed against official documentation rather than local `--help` output.
