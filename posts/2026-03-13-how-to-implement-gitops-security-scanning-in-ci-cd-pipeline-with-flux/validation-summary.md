# Validation Summary: How to Implement GitOps Security Scanning in CI/CD Pipeline with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes manifests and CRDs
- GitHub Actions
- kubeconform
- Trivy
- Sigstore Cosign
- Helm and Flux HelmRelease resources
- OPA / Conftest
- Rego policies

## Sources Consulted
- Flux GitHub Action documentation: https://fluxcd.io/flux/flux-gh-action/
- Flux CLI documentation for `flux check` and `flux build kustomization`: https://fluxcd.io/flux/cmd/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- kubeconform usage documentation: https://kubeconform.mandragor.org/docs/usage/
- kubeconform CRD schema location behavior: https://github.com/yannh/kubeconform
- Datree CRDs catalog for Flux schemas: https://github.com/datreeio/CRDs-catalog
- Trivy misconfiguration scanning documentation: https://trivy.dev/docs/latest/scanner/misconfiguration/
- Trivy CLI reference for `trivy config`: https://trivy.dev/docs/latest/guide/references/configuration/cli/trivy_config/
- GitHub documentation for SARIF upload workflows: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- Sigstore Cosign verification documentation: https://docs.sigstore.dev/cosign/verifying/verify/
- Sigstore Cosign installer documentation: https://github.com/sigstore/cosign-installer
- Conftest documentation and options: https://www.conftest.dev/options/

## Issues Found
- The initial Flux validation loop called `flux check --pre` once per YAML file and ignored failures. `flux check --pre` checks local/cluster prerequisites, not individual manifests, so the example now runs `flux version --client` and `flux check --pre` directly.
- The kubeconform Flux schema setup downloaded CRD YAML but never converted it into JSON schemas used by kubeconform. The example now uses a working CRD schema location backed by the Datree CRDs catalog.
- The Trivy SARIF upload step used `github/codeql-action/upload-sarif@v2` and omitted required permissions. It now uses `upload-sarif@v4` and grants `security-events: write`.
- The image scanning loop set `FAILED` inside a pipeline subshell, so failures would not affect the final exit code. It also used `--exit-code 0`, so Trivy would never fail the job for high or critical vulnerabilities. The loop now preserves `FAILED` and uses `--exit-code 1`.
- The Cosign signature verification loop had the same pipeline subshell failure-tracking issue. It now preserves the failure state.
- The Helm scan used an outdated setup action and assumed HelmRelease chart information was enough for `helm template` without resolving a `HelmRepository`. The example now uses `azure/setup-helm@v4`, installs `yq`, resolves the matching `HelmRepository` URL when present, and fails on Trivy findings.
- The complete pipeline's signature-check job ignored all Cosign verification failures with `|| true` and used an overly broad certificate identity regex. It now fails on verification errors and uses an explicit placeholder for the expected GitHub OIDC certificate identity.
- The Trivy cache example used an older cache action. It now uses `actions/cache@v5`.

## Review Notes
The image extraction examples still use simple `grep`/`awk` parsing, which is acceptable for a compact blog example but can miss images in templated Helm values or nonstandard YAML layouts. A production pipeline should prefer a YAML-aware parser or rendered manifests as the source for image discovery.
