# Validation Summary: How to Configure Fleet Image Scanning

## Status
validated

## Post Type
Guide

## Technologies Covered
- Fleet
- Rancher
- Kubernetes
- GitHub Actions
- Trivy
- Harbor
- Kyverno
- Cosign

## Sources Consulted
- Fleet documentation: https://fleet.rancher.io/how-tos-for-users/imagescan
- Trivy CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy GitHub Action: https://github.com/aquasecurity/trivy-action
- Harbor project configuration: https://goharbor.io/docs/main/working-with-projects/project-configuration/
- Harbor vulnerability scanning: https://goharbor.io/docs/main/administration/vulnerability-scanning/
- Kyverno installation: https://kyverno.io/docs/installation/
- Kyverno validate rules: https://kyverno.io/docs/policy-types/cluster-policy/validate/
- Kyverno verifyImages overview: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/overview/
- Kyverno Sigstore image verification: https://kyverno.io/docs/policy-types/cluster-policy/verify-images/sigstore/
- Cosign attest command reference: https://github.com/sigstore/cosign/blob/main/doc/cosign_attest.md
- GitHub Actions `GITHUB_TOKEN` behavior: https://docs.github.com/en/actions/concepts/security/github_token
- GitHub Actions workflow syntax and permissions: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- actions/checkout documentation: https://github.com/actions/checkout
- docker/login-action documentation: https://github.com/docker/login-action

## Issues Found
- The introduction stated that Fleet does not perform image scanning directly. I corrected this to clarify that Fleet has an experimental `imageScans` feature for updating image references in Git, while vulnerability scanning still depends on external scanners and admission controls.
- The GitHub Actions workflow was incomplete for the behavior it described. I added repository checkout, registry authentication, `contents: write` permissions for pushing back to Git, pinned the Trivy action to a current release, removed the unused `latest` tag, and made the `git add` and `git commit` steps more reliable.
- The Harbor section used an API-style scanner example, but Harbor’s documented project-level vulnerability controls for this use case are the project configuration settings for auto-scan on push, preventing vulnerable images from running, and severity thresholds. I replaced the snippet with the documented configuration flow.
- The Harbor subsection heading referenced replication and signing, but the example only showed digest pinning. I renamed the heading to match the actual example.
- The Kyverno “image scan policy” example did not actually enforce scan results and used the deprecated `spec.validationFailureAction` field. I corrected it to an approved-registry policy and switched to `validate.failureAction`.
- The Kyverno signature verification example used an older policy shape. I updated it to use `verifyImages[].failureAction: Enforce`, which matches current Kyverno Sigstore examples.
- The Cosign section overstated what the example proved. Signing an image and attaching a vulnerability attestation ties signed metadata to the image, but signature verification alone does not validate that the vulnerability report contents are acceptable. I adjusted the wording accordingly.
- The scan-results example referenced `:latest`, which no longer matched the SHA-tagged workflow example, and it did not create the output directory. I updated it to use `${IMAGE_TAG}` and added `mkdir -p scan-results`.
- The conclusion claimed the process guarantees “vulnerability-free” deployments. I revised it to describe policy-compliant scanning, trusted registries, signature verification, and layered enforcement more accurately.

## Review Notes
- Fleet’s official `imageScans` terminology refers to updating image references from registries, not vulnerability analysis. The post now distinguishes that feature from the external vulnerability-scanning workflow it describes.
- Kyverno documentation currently contains both older `validationFailureAction` examples and newer `failureAction` examples. The corrected snippets use the current, non-deprecated form where applicable.
- Storing every scan report in Git is technically valid for auditability, but it can grow the repository quickly over time. Consider retention or artifact storage policies if this pattern is adopted broadly.
