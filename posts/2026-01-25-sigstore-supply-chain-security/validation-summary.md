# Validation Summary: How to Implement Supply Chain Security with Sigstore

## Status
validated

## Post Type
Technical guide / implementation tutorial

## Technologies Covered
- Sigstore
- Cosign
- Fulcio
- Rekor and rekor-cli
- Gitsign
- Sigstore policy-controller
- SLSA provenance
- GitHub Actions
- Kubernetes and Helm
- Syft SBOM generation
- Docker / OCI container images

## Sources Consulted
- Sigstore Cosign quickstart: https://docs.sigstore.dev/quickstart/quickstart-cosign/
- Sigstore Cosign signing containers docs: https://docs.sigstore.dev/cosign/signing/signing_with_containers/
- Sigstore Cosign verifying signatures docs: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Cosign signing other types / SBOM docs: https://docs.sigstore.dev/cosign/signing/other_types/
- Sigstore Cosign custom components docs: https://docs.sigstore.dev/cosign/system_config/custom_components/
- Cosign generated CLI docs for `initialize`, `sign`, and `signing-config create`: https://github.com/sigstore/cosign/tree/main/doc
- Sigstore Fulcio OIDC usage docs: https://docs.sigstore.dev/certificate_authority/oidc-in-fulcio/
- Sigstore policy-controller overview and sample policies: https://docs.sigstore.dev/policy-controller/overview/ and https://docs.sigstore.dev/policy-controller/sample-policies/
- Sigstore policy-controller CRD and examples: https://github.com/sigstore/policy-controller
- Sigstore Rekor docs and CLI source: https://docs.sigstore.dev/logging/overview/ and https://github.com/sigstore/rekor
- Sigstore Rekor monitor README: https://github.com/sigstore/rekor-monitor
- Gitsign README: https://github.com/sigstore/gitsign
- SLSA GitHub generator container workflow docs: https://github.com/slsa-framework/slsa-github-generator/tree/main/internal/builders/container
- SLSA generator reusable workflow definition: https://github.com/slsa-framework/slsa-github-generator/blob/main/.github/workflows/generator_container_slsa3.yml
- Sigstore Helm charts and scaffold values: https://github.com/sigstore/helm-charts and https://sigstore.github.io/helm-charts/index.yaml

## Issues Found
- Cosign container signing and verification examples used mutable tags. Updated signing, verification, attestation, and private signing examples to use immutable digest references, matching current Cosign guidance.
- The SBOM attestation command omitted `--yes` and used a tag. Added `--yes` and switched to a digest reference.
- The SLSA GitHub generator example used an older workflow version and omitted registry authentication details. Updated to `generator_container_slsa3.yml@v2.1.0`, added GHCR login, explicit package permissions, `registry-username`, and `registry-password`.
- The Gitsign verification example used `git verify-commit`, which does not validate certificate identity claims. Replaced it with `gitsign verify` and explicit certificate identity and issuer checks.
- The Rekor inclusion verification command used artifact and signature flags without enough verification material. Replaced it with UUID-based inclusion verification after retrieving/searching for the entry.
- The custom Rekor polling script used an API pattern that does not match current Rekor APIs and duplicated functionality covered by the official monitor. Replaced it with the Sigstore `rekor-monitor` reusable workflow for identity monitoring.
- The policy-controller example used `v1beta1` while official examples still use `v1alpha1`, and placed attestations in a separate authority. Updated the API version to `v1alpha1` and attached the SLSA attestation requirement to the same keyless authority.
- The private Sigstore client configuration used deprecated Cosign signing flags. Replaced them with `cosign signing-config create` and `--signing-config`, and adjusted `cosign initialize` to use a local trusted root file rather than an HTTP root without checksum.

## Review Notes
The post is technically relevant and useful. Some examples still use placeholder digests and identities, which is appropriate for a tutorial, but readers must replace them with real image digests and certificate identities from their own signing environment.
