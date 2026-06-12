# Validation Summary: How to Implement Trivy SBOM Generation

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Trivy
- Software Bill of Materials (SBOM)
- CycloneDX
- SPDX
- GitHub Actions
- GitLab CI
- Cosign
- ORAS
- Python
- jq

## Sources Consulted
- Trivy SBOM generation documentation: https://trivy.dev/docs/latest/supply-chain/sbom/
- Trivy SBOM scanning documentation: https://trivy.dev/docs/latest/guide/target/sbom/
- Trivy `sbom` CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_sbom/
- Trivy `convert` CLI reference: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_convert/
- Trivy repository scanning documentation: https://trivy.dev/docs/latest/target/repository/
- Trivy repository CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_repository/
- Aqua Security Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- Trivy SBOM attestation documentation: https://trivy.dev/docs/latest/supply-chain/attestation/sbom/
- Sigstore Cosign specifications: https://docs.sigstore.dev/cosign/system_config/specifications/
- NIST EO 14028 SBOM guidance page: https://www.nist.gov/itl/executive-order-14028-improving-nations-cybersecurity/software-supply-chain-security-guidance-20
- NTIA SBOM minimum elements report: https://www.ntia.gov/sites/default/files/publications/sbom_minimum_elements_report_0.pdf

## Issues Found
- The conversion examples incorrectly used `trivy sbom --format ...` as a format conversion workflow. `trivy sbom` scans SBOM input for vulnerabilities and licenses; official Trivy documentation describes `trivy convert` for converting a Trivy JSON report to formats such as CycloneDX or SPDX. Updated the section to generate a Trivy JSON report and convert it with `trivy convert`.
- The Cosign storage example used `cosign attach sbom` and then verified it with `cosign verify-attestation`. Those commands belong to different Cosign workflows. Updated the example to use `cosign attest --type cyclonedx --predicate ...` with `cosign verify-attestation`, matching Trivy's SBOM attestation documentation.
- The post described Trivy JSON as a major SBOM format alongside CycloneDX and SPDX. Updated the wording and diagram labels to distinguish standard SBOM formats from Trivy's native JSON report format.
- The Python database example counted only CycloneDX `components`, which reports zero for SPDX JSON SBOMs that use `packages`. Updated the count logic to support both keys.
- The Python database example used `datetime.utcnow()`, which is deprecated in modern Python. Updated it to use `datetime.now(timezone.utc)`.

## Review Notes
- The GitHub Actions example uses `aquasecurity/trivy-action@master`, which is valid but mutable. Pinning actions to immutable commit SHAs is a stronger supply-chain security practice for production workflows.
