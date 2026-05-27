# Validation Summary: How to Implement Supply Chain Security for Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes admission control
- Kyverno ClusterPolicy and verifyImages
- Sigstore, Fulcio, Rekor, and Cosign
- GitHub Actions OIDC keyless signing
- Docker Buildx and Dockerfile dependency pinning
- Syft SBOM generation
- Grype vulnerability scanning
- SPDX and CycloneDX SBOM formats
- Python subprocess-based verification

## Sources Consulted
- Sigstore Cosign installation documentation: https://docs.sigstore.dev/cosign/system_config/installation/
- Sigstore Cosign signature verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore CI quickstart for GitHub Actions keyless signing: https://docs.sigstore.dev/quickstart/quickstart-ci/
- Sigstore policy controller sample policies for SPDX SBOM attestations: https://docs.sigstore.dev/policy-controller/sample-policies/
- Kyverno verifyImages overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore image verification documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno JMESPath documentation: https://kyverno.io/docs/policy-types/cluster-policy/jmespath/
- Kyverno policy settings documentation: https://kyverno.io/docs/policy-types/cluster-policy/policy-settings/
- Docker build-push-action documentation: https://github.com/docker/build-push-action
- Docker container user documentation: https://docs.docker.com/engine/containers/run/
- Anchore Syft getting started documentation: https://oss.anchore.com/docs/guides/sbom/getting-started/

## Issues Found
- The GitHub Actions workflow used older Docker action majors and `actions/checkout@v4`. Updated checkout to `v5`, Docker Buildx setup and registry login to `v4`, and Docker build-push-action to `v7` to match current official examples.
- The Cosign SBOM attestation used `--type spdxjson`. Updated it to the SPDX predicate type URI `https://spdx.dev/Document`, which is the form shown in current Sigstore SBOM attestation examples.
- The Cosign verification step accepted any certificate identity with `--certificate-identity-regexp=".*"`. Replaced it with a GitHub Actions workflow identity pattern scoped to the repository and tag workflow subject.
- The Kyverno image verification policies used deprecated top-level `validationFailureAction`. Replaced it with `failureAction: Enforce` on each `verifyImages` rule, matching current Kyverno image verification examples.
- The Kyverno keyless attestors used broad `subject` wildcard values. Replaced them with `subjectRegExp` and `issuerRegExp` values matching GitHub Actions workflow certificate subjects and issuer.
- The Kyverno SBOM attestation policy used `type` for the attestation predicate. Updated it to `predicateType`, matching current Kyverno verifyImages attestation syntax.
- The Kyverno SBOM condition used `len(packages)`, which is not Kyverno JMESPath syntax. Replaced it with `packages | length(@)` and changed the comparison value to numeric `0`.
- The Python deploy-time verification example used a broad identity regex. Replaced it with a GitHub Actions workflow identity regex scoped to the example repository and tag workflow subject.
- The Dockerfile example used an incomplete placeholder digest and `USER nonroot`, but usernames must exist in the container image. Replaced the digest with the current manifest digest for `python:3.12.1-slim` and used numeric non-root UID/GID `65532:65532`.

## Review Notes
- The examples are still illustrative and use placeholder registries, organizations, repositories, and workflow names. Real deployments should scope identity regexes to exact workflow paths and protected refs.
- `python:3.12.1-slim` is pinned as shown, but production images should periodically update to supported patch releases and refresh the digest.
