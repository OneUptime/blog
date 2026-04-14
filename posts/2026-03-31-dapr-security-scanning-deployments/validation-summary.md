# Validation Summary: How to Perform Security Scanning on Dapr Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, component configuration)
- Trivy (container image vulnerability scanning)
- Kubesec (Kubernetes manifest security scanning)
- Checkov (infrastructure-as-code scanning, custom checks)
- Kubernetes (Deployment manifests, security contexts)
- GitHub Actions (CI/CD pipeline integration)
- GitHub CodeQL SARIF upload

## Sources Consulted
- Trivy official documentation — https://aquasecurity.github.io/trivy/
- Kubesec official documentation — https://kubesec.io/
- Kubesec Docker Hub — https://hub.docker.com/r/kubesec/kubesec
- Checkov official documentation — https://www.checkov.io/
- Bridgecrew Checkov GitHub Action — https://github.com/bridgecrewio/checkov-action
- Aquasecurity Trivy GitHub Action — https://github.com/aquasecurity/trivy-action
- GitHub CodeQL upload-sarif action — https://github.com/github/codeql-action
- Kubernetes API reference for apps/v1 Deployment — https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/
- Dapr annotations reference — https://docs.dapr.io/reference/arguments-annotations-overview/

## Issues Found

1. **Misleading comment on Kubesec command (line 34)**: The comment said `# Install kubesec` but the `curl` command actually sends a manifest to the hosted Kubesec API for scanning — it does not install anything. Changed to `# Scan with kubesec hosted API`.

2. **Outdated Kubesec Docker image tag (line 37)**: The tag `kubesec/kubesec:512c5e0` is an old commit-hash-based tag. Updated to `kubesec/kubesec:v2`, which is the current recommended tag.

3. **Incomplete Kubernetes Deployment manifest (lines 43-74)**: The Deployment was missing the required `spec.selector.matchLabels` field and `spec.template.metadata.labels`. Without these, `kubectl apply` would reject the manifest with a validation error. Added `selector.matchLabels` and matching `labels` for `app: secure-service`.

4. **GitHub Actions SARIF upload step would be skipped on findings (line 136-139)**: The Trivy step uses `exit-code: 1` which causes the job to fail when HIGH/CRITICAL vulnerabilities are found. The subsequent SARIF upload step would then be skipped because GitHub Actions skips remaining steps after a failure by default. Added `if: always()` to the upload step so scan results are always uploaded to the GitHub Security tab regardless of whether vulnerabilities were found.

## Review Notes
- The Trivy action and Checkov action are both pinned to `@master`, which is functional but not best practice for reproducible builds. Pinning to a specific version tag (e.g., `@v0.18.0`) is recommended in production workflows.
- Dapr version 1.13.0 referenced for the sidecar image is a valid release. Readers should substitute their actual deployed version.
- The custom Checkov check's `BaseK8Check`, `scan_spec_conf`, `CheckCategories.SECRETS`, and `supported_entities=["Component"]` were all verified as correct. Checkov's Kubernetes parser accepts any YAML with valid `apiVersion`/`kind` fields, so Dapr Component CRDs are handled without additional configuration.
