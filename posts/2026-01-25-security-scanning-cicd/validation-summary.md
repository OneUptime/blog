# Validation Summary: How to Configure Security Scanning in CI/CD Pipelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GitHub Actions
- Semgrep
- Safety CLI
- npm audit
- govulncheck
- Trivy
- Grype / Anchore Scan Action
- Hadolint
- Dockle
- Cosign
- Checkov
- Kubescape
- KICS
- OWASP ZAP
- SARIF
- Python

## Sources Consulted
- Semgrep CLI reference: https://docs.semgrep.dev/cli-reference
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- GitHub CodeQL Action v2 retirement notice: https://github.blog/changelog/2025-01-10-code-scanning-codeql-action-v2-is-now-deprecated/
- GitHub CodeQL Action v4 release and migration notice: https://github.blog/changelog/2025-10-28-upcoming-deprecation-of-codeql-action-v3/
- Safety CLI 3 migration guide: https://docs.safetycli.com/safety-docs/safety-cli/introduction-to-safety-cli-vulnerability-scanning/migrating-from-safety-cli-2.x-to-safety-cli-3.x
- Safety JSON output documentation: https://docs.safetycli.com/safety-docs/output/json-output
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- Anchore Scan Action documentation: https://github.com/anchore/scan-action
- Hadolint Action documentation: https://github.com/hadolint/hadolint-action
- Dockle documentation: https://github.com/goodwithtech/dockle
- Cosign documentation: https://github.com/sigstore/cosign
- Sigstore CI quickstart: https://docs.sigstore.dev/quickstart/quickstart-ci/
- Checkov GitHub Action documentation: https://github.com/bridgecrewio/checkov-action
- tfsec to Trivy migration notice: https://github.com/aquasecurity/tfsec
- Kubescape CLI reference: https://github.com/kubescape/kubescape/blob/master/docs/cli-reference.md
- KICS GitHub Action documentation: https://github.com/Checkmarx/kics-github-action
- OWASP ZAP baseline action documentation: https://github.com/zaproxy/action-baseline
- OWASP ZAP full scan action documentation: https://github.com/zaproxy/action-full-scan
- OWASP ZAP API scan action documentation: https://github.com/zaproxy/action-api-scan
- OWASP ZAP baseline scan rules file documentation: https://www.zaproxy.org/docs/docker/baseline-scan/

## Issues Found
- The SARIF upload examples used `github/codeql-action/upload-sarif@v2`, which is retired. Updated the examples to `@v4` and added `security-events: write` permissions where SARIF uploads are shown.
- The Safety example used `safety check -r ... --json` and parsed an older JSON shape. Updated it to `safety scan --target . --output json`, which matches Safety CLI 3 guidance.
- The Semgrep hardcoded secret rule used language-specific assignment patterns that would not be reliable across Python, JavaScript, and Go. Replaced it with a generic regex rule.
- The container signing example referenced `${{ steps.build.outputs.digest }}` without defining a `build` step output, did not tag the image with the registry for signing, did not push the image, and did not install Cosign. Updated the image reference, push flow, Cosign installation, and digest-based signing command.
- The container signing example lacked `id-token: write`, which is required for keyless Cosign signing in GitHub Actions. Added the permission.
- The IaC example used tfsec, which Aqua now directs users to replace with Trivy. Replaced the tfsec action example with a Trivy config scan.
- The Kubescape command used `framework nsa,mitre`, but the CLI accepts one framework name per invocation. Split it into separate NSA and MITRE scans.
- The KICS action used an older tag. Updated it to the current documented `v2.1.20` example.
- The ZAP baseline and full scan actions used older versions. Updated them to the latest documented versions in the official repositories.
- The Checkov security gate example used `--check CRITICAL,HIGH`, which is not a valid way to filter Checkov checks by severity in the open-source CLI. Replaced it with a quiet Checkov IaC scan that fails on findings by default.

## Review Notes
The examples remain illustrative and still require project-specific policies, authentication, registry permissions, and scanner configuration before production use. Several GitHub Action examples use moving tags such as `master`; pinning actions to immutable commit SHAs would be a stronger supply-chain practice in a production pipeline.
