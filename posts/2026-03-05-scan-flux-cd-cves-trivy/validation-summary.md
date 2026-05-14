# Validation Summary: How to Scan Flux CD for CVEs with Trivy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Trivy
- Kubernetes
- GitHub Actions
- SARIF code scanning uploads
- Bash

## Sources Consulted
- Trivy installation documentation: https://trivy.dev/dev/getting-started/installation/
- Trivy image command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy filesystem command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_filesystem/
- Trivy Kubernetes command reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_kubernetes/
- Trivy reporting documentation: https://trivy.dev/latest/docs/configuration/reporting/
- Aqua Security Trivy GitHub Action README: https://github.com/aquasecurity/trivy-action
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux controller release documentation: https://fluxcd.io/flux/releases/controllers/
- Flux v2.8.7 release notes: https://github.com/fluxcd/flux2/releases/tag/v2.8.7
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/code-scanning/integrating-with-code-scanning/uploading-a-sarif-file-to-github

## Issues Found
- The Debian/Ubuntu Trivy install example used `sudo apt-get install -y trivy` without first adding Aqua Security's apt repository and key. Updated the snippet to include the official repository setup before installing Trivy.
- The Flux controller image examples used older controller tags. Updated the sample image tags to match the Flux v2.8.7 component versions: source-controller v1.8.4, kustomize-controller v1.8.5, helm-controller v1.5.4, and notification-controller v1.8.4.
- The Trivy Kubernetes examples used `--namespace`, which is not listed in the current Trivy Kubernetes CLI reference. Replaced it with `--include-namespaces` and added `--include-kinds deployment,pod` to make the workload-only example match its comment.
- The GitHub Actions workflow extracted image names but scanned only a single hard-coded image. Replaced it with a matrix workflow that scans each Flux controller image, uploads each SARIF report with a distinct category, and includes the required `security-events: write` permission for SARIF uploads.
- Updated the SARIF upload action from `github/codeql-action/upload-sarif@v3` to `@v4` to match current GitHub documentation.

## Review Notes
The `trivy fs $(which flux)` example is syntactically valid for scanning a local binary path, but filesystem scanning a single Go binary may provide limited dependency visibility compared with scanning the release SBOM or the Flux CLI container image when those artifacts are available.
