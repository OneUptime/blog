# Validation Summary: How to Verify Helm Chart Integrity in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm and Helm charts
- HelmRepository, HelmChart, and HelmRelease resources
- OCI registries
- Cosign and Sigstore keyless signing
- Helm provenance files
- GitHub Actions
- Kyverno / OPA Gatekeeper policy enforcement

## Sources Consulted
- Flux HelmChart documentation: https://fluxcd.io/flux/components/source/helmcharts/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Helm package command documentation: https://helm.sh/docs/helm/helm_package/
- Helm provenance and integrity documentation: https://docs.helm.sh/docs/topics/provenance/
- Sigstore Fulcio OIDC documentation: https://docs.sigstore.dev/certificate_authority/oidc-in-fulcio/
- Cosign sign command reference: https://github.com/sigstore/cosign/blob/main/doc/cosign_sign.md
- GitHub Actions package publishing documentation: https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images

## Issues Found
- The post claimed Flux provides built-in Helm provenance verification for traditional HTTP Helm repositories. Flux's HelmChart `spec.verify` feature is documented as available only for Helm charts fetched from an OCI registry, so the post now describes Helm `.prov` verification as a pre-publication or mirroring workflow outside native Flux verification.
- The prerequisites and description implied either Cosign or Helm provenance could be used directly with Flux verification. These were narrowed to Cosign-signed OCI charts for the native Flux path.
- The keyless `matchOIDCIdentity` example used plain strings without noting that Flux treats `issuer` and `subject` as Go regular expressions. The example now uses anchored regular expressions and explains the regex behavior.
- The HTTP repository configuration section incorrectly suggested using Flux's `verify` field with the `cosign` provider for HTTP Helm repositories. It now states that `verify` is not used for Helm provenance files and recommends CI verification or mirroring to signed OCI artifacts.
- The admission controller section implied Kyverno or Gatekeeper can comprehensively verify chart signatures across all chart types. It now states that the sample policy only enforces the presence of Cosign verification configuration and does not verify signatures itself.
- The GitHub Actions GHCR login command used `-u $`, which would not authenticate as the workflow actor. It now uses `${{ github.actor }}` with `GITHUB_TOKEN`, matching GitHub's documented pattern.
- The keyless Cosign signing step omitted non-interactive confirmation handling. It now uses `cosign sign --yes`, matching the Cosign command reference.
- The troubleshooting section listed "expired signature" as a common issue. This was replaced with keyless Fulcio, Rekor, and timestamp verification errors, which better matches Sigstore/Cosign behavior.

## Review Notes
- Flux's `HelmRepository` `type: oci` is still documented, but the current Flux docs note it is in maintenance mode and recommend `OCIRepository` for improved OCI Helm chart support. The post's examples remain technically valid, but a future update could modernize them around `OCIRepository`.
- Helm's provenance documentation notes that Helm 4 content may still be in transition; the provenance commands shown remain consistent with the documented `helm package --sign` workflow.
