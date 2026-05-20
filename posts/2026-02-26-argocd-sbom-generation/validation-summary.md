# Validation Summary: How to Generate SBOMs for ArgoCD Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource hooks
- Kubernetes Jobs and Deployments
- Syft SBOM generation
- SPDX and CycloneDX SBOM formats
- Cosign attestations and verification
- Kyverno image verification policies
- Trivy SBOM vulnerability scanning
- Dependency-Track BOM ingestion
- GitHub Actions

## Sources Consulted
- Argo CD Resource Hooks: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Syft Output Formats: https://oss.anchore.com/docs/guides/sbom/formats/
- Sigstore Cosign In-Toto Attestations: https://docs.sigstore.dev/cosign/verifying/attestation/
- Sigstore Cosign Signing Other Types: https://docs.sigstore.dev/cosign/signing/other_types/
- Kyverno Verify Images overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore verifyImages documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Trivy SBOM scanning documentation: https://trivy.dev/docs/latest/guide/target/sbom/
- Dependency-Track CI/CD BOM upload documentation: https://docs.dependencytrack.org/usage/cicd/
- Dependency-Track terminology and supported BOM format notes: https://docs.dependencytrack.org/terminology/
- Alpine package index for cosign availability: https://pkgs.alpinelinux.org/

## Issues Found
- The GitHub Actions tool installation wrote to `/usr/local/bin` without elevated permissions. Updated the Syft and Cosign installation commands to use `sudo`.
- The Syft examples used `syft packages`, while current Syft documentation uses the top-level `syft <source> -o <format>` form. Updated both SBOM generation commands.
- The Cosign attestation command could block in CI due to the confirmation prompt. Added `--yes`.
- The examples used `--type spdx` inconsistently with current in-toto predicate type usage. Updated SPDX attestation and verification examples to use `https://spdx.dev/Document`.
- The Argo CD hook examples used container images that did not reliably include every command invoked by the script. Changed hook images to Alpine and installed required tools explicitly.
- The PreSync hook used `echo -e`, which is not portable across `/bin/sh` implementations. Replaced it with `printf "%b\n"`.
- The Kyverno policy used `type` under `attestations`; current Kyverno ClusterPolicy examples use `predicateType` for in-toto attestation checks. Updated the field.
- The vulnerability-check hook used the Trivy image while also invoking Cosign, which is not included there. Changed the hook to install Cosign, jq, and Trivy explicitly.
- The Dependency-Track upload posted a raw SPDX JSON document with `Content-Type: application/json`, which does not match the documented BOM upload API. Updated the example to extract the CycloneDX attestation and upload it as multipart form data with project metadata.

## Review Notes
The Dependency-Track deployment manifest remains a minimal illustrative API server Deployment. A production deployment should also define the Service, frontend, persistent storage, and PostgreSQL configuration, or use the official Helm chart/manifests.
