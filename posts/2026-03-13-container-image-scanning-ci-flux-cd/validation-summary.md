# Validation Summary: How to Configure Container Image Scanning in CI for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD image automation
- Kubernetes custom resources
- GitHub Actions
- Docker Buildx and GHCR
- Trivy container image scanning
- SARIF upload to GitHub code scanning

## Sources Consulted
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- Trivy configuration file documentation: https://trivy.dev/docs/dev/guide/references/configuration/config-file/
- Trivy configuration overview: https://trivy.dev/docs/latest/guide/configuration/
- Flux ImagePolicy documentation: https://fluxcd.io/flux/components/image/imagepolicies/
- Docker build-push-action documentation: https://github.com/docker/build-push-action
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github

## Issues Found
- The workflow used older action major versions and `aquasecurity/trivy-action@master`. Updated examples to current documented major versions where applicable and pinned Trivy to `aquasecurity/trivy-action@v0.36.0` instead of using the moving `master` branch.
- The SARIF upload step used `github/codeql-action/upload-sarif@v3`; current GitHub and Trivy examples use `@v4`, so the snippet was updated.
- The workflow rebuilt the image for pushing after scanning, which meant the pushed image was not necessarily the exact local image that Trivy scanned. Updated the workflow to build a GHCR-tagged local image, scan that image, and push the same tag only after the scan passes.
- The JSON report snippet would not run after the blocking Trivy step failed unless explicitly guarded. Added `if: always()` to the report generation and artifact upload steps.
- The Trivy config example used `.trivy.yaml` and `security-checks`. Current Trivy documentation uses `trivy.yaml` by default and the `scan.scanners` configuration key, so the example was updated.
- The Flux ImagePolicy section said to use `filterTags` for scanned images, but the manifest did not include `filterTags`. Added a `filterTags` pattern and `extract` value so Flux evaluates only `-scanned` SemVer tags.
- The architecture diagram and best-practice wording were inconsistent with the CRITICAL/HIGH gate shown in the workflow. Updated the wording to match the enforced severity threshold.

## Review Notes
- The Flux `filterTags` policy assumes registry permissions prevent untrusted manual pushes of matching `-scanned` tags. In production, pair this pattern with registry access controls or image signing/attestation for stronger provenance.
