# Validation Summary: How to Create Kyverno Policy Verify Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kyverno ClusterPolicy and verifyImages rules
- Kubernetes admission control
- Sigstore cosign image signing and attestation
- Helm-based Kyverno installation
- GitHub Actions CI/CD
- OCI container registries

## Sources Consulted
- Kyverno verifyImages overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore verifyImages documentation: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Kyverno installation documentation: https://kyverno.io/docs/installation/installation/
- Kyverno Helm chart values: https://github.com/kyverno/kyverno/blob/main/charts/kyverno/values.yaml
- Sigstore cosign attestation documentation: https://docs.sigstore.dev/cosign/verifying/attestation/
- Sigstore cosign vulnerability attestation specification: https://github.com/sigstore/cosign/blob/main/specs/COSIGN_VULN_ATTESTATION_SPEC.md
- Anchore SBOM Action documentation: https://github.com/marketplace/actions/anchore-sbom-action

## Issues Found
- The Kyverno Helm install command used the old top-level `replicaCount` value. Updated it to current per-controller replica values: `admissionController.replicas`, `backgroundController.replicas`, `cleanupController.replicas`, and `reportsController.replicas`.
- The vulnerability attestation example used `--type vuln` with Kyverno conditions that referenced `criticalCount` and `highCount` fields under `scanner.result`. The cosign vulnerability predicate stores scanner output as a scanner-specific result object and does not define those summary fields. Updated the example to use a custom vulnerability summary predicate type and clarified that `vuln-scan.json` should include `criticalCount` and `highCount`.
- The debug logging Helm command used the outdated `extraArgs` value. Updated it to the current chart value `features.logging.verbosity=4`.

## Review Notes
The verifyImages examples are written for Kyverno ClusterPolicy rather than the newer ImageValidatingPolicy API. ClusterPolicy verifyImages remains documented and usable, but future updates could consider adding ImageValidatingPolicy examples for CEL-based image validation workflows.
