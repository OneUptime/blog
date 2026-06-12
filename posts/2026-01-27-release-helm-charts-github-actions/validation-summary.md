# Validation Summary: How to Release Helm Charts with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Helm
- Kubernetes
- kind
- helm/chart-testing
- helm/chart-releaser
- GitHub Pages
- OCI registries
- GitHub Container Registry
- Amazon ECR
- yq
- jq
- helm-docs
- Trivy
- Kubesec

## Sources Consulted
- Helm chart-testing-action documentation: https://github.com/helm/chart-testing-action
- Helm chart-testing documentation: https://github.com/helm/chart-testing
- Helm chart-releaser-action documentation: https://helm.sh/docs/howto/chart_releaser_action/
- Helm OCI registry documentation: https://helm.sh/docs/topics/registries/
- Azure setup-helm action documentation: https://github.com/Azure/setup-helm
- GitHub Actions workflow command documentation for GITHUB_OUTPUT: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- yq documentation: https://mikefarah.gitbook.io/yq
- helm-docs documentation: https://github.com/norwoodj/helm-docs
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- Trivy 2026 security incident advisory: https://github.com/aquasecurity/trivy/discussions/10425
- Kubesec documentation: https://github.com/controlplaneio/kubesec
- AWS ECR OCI artifact documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/push-oci-artifact.html
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file

## Issues Found
- The chart-testing examples used an older `helm/chart-testing-action@v2.6.1` and did not explicitly set up Python, even though the upstream action documentation notes that Python is required for `ct lint` dependencies. Updated the action to `v2.8.0` and added `actions/setup-python@v6` in the chart-testing jobs.
- The kind integration test used an older `helm/kind-action@v1.9.0`. Updated it to `v1.12.0`, matching the current upstream chart-testing-action example.
- The automated version bump workflow wrote a newline-separated list directly to `$GITHUB_OUTPUT`, which can break GitHub Actions output parsing or only expose part of the changed chart list. Changed the command to convert the list to a single space-separated output before writing it.
- The security scanning workflow uploaded SARIF results without declaring the `security-events: write` permission. Added explicit `contents: read` and `security-events: write` permissions.
- The Trivy example used the floating `aquasecurity/trivy-action@master` reference. Replaced it with a pinned released action version and changed the scan type from `config` to `fs`, which is the documented action input for scanning a filesystem path.
- The Kubesec example invoked `kubesec` without installing it. Changed the step to run the official `kubesec/kubesec:v2` container image against standard input.
- The security scanning workflow used `helm template` in the Kubesec step without first installing Helm. Added a `azure/setup-helm@v4` step to that job.

## Review Notes
Most examples are structurally correct and align with Helm's OCI, chart-releaser, chart-testing, ECR, yq, jq, and helm-docs documentation. The examples remain illustrative and assume expected repository setup, such as existing chart directories, valid chart metadata, configured GitHub Pages for chart-releaser, existing registry repositories where required, and appropriate credentials/secrets.
