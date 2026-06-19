# Validation Summary: How to Implement DevSecOps Practices

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered
- DevSecOps
- GitLab CI/CD
- Semgrep
- Trivy
- TruffleHog
- pre-commit
- detect-secrets
- Safety CLI
- Jira Cloud REST API
- Syft
- Cosign
- Grype
- OWASP ZAP
- Falco
- PostgreSQL-style SQL metrics queries

## Sources Consulted
- GitLab CI/CD artifacts reports documentation: https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab Docker image entrypoint documentation: https://docs.gitlab.com/ci/docker/using_docker_images/
- Trivy GitLab CI integration documentation: https://trivy.dev/docs/latest/tutorials/integrations/gitlab-ci/
- Trivy image and filesystem CLI documentation: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/ and https://trivy.dev/docs/latest/references/configuration/cli/trivy_filesystem/
- Semgrep CLI reference: https://docs.semgrep.dev/cli-reference
- Semgrep pre-commit documentation: https://docs.semgrep.dev/extensions/pre-commit
- detect-secrets pre-commit guidance: https://github.com/Yelp/detect-secrets
- Safety CLI command documentation: https://docs.safetycli.com/safety-docs/safety-cli/scanning-for-vulnerable-and-malicious-packages/available-commands-and-inputs
- TruffleHog CI and CLI documentation: https://docs.trufflesecurity.com/scanning-in-ci and https://github.com/trufflesecurity/trufflehog
- Atlassian Jira Cloud REST API authentication and issue search documentation: https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/ and https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/
- Syft CLI documentation: https://oss.anchore.com/docs/reference/syft/cli/
- Grype CLI documentation: https://oss.anchore.com/docs/reference/grype/cli/
- Sigstore Cosign blob signing documentation: https://docs.sigstore.dev/cosign/signing/signing_with_blobs/
- OWASP ZAP baseline scan documentation: https://www.zaproxy.org/docs/docker/baseline-scan/
- Falco rules and condition syntax documentation: https://falco.org/docs/concepts/rules/basic-elements/ and https://falco.org/docs/concepts/rules/conditions/

## Issues Found
- The GitLab build job exported `sbom.json` as a CycloneDX report without generating the file. Added a Syft command to generate `sbom.json` before artifact collection.
- The Semgrep command used `--output` with JSON output. Updated it to the documented `--json-output` option.
- The pipeline used GitLab native security report artifact keys for raw Semgrep, Trivy, and ZAP JSON outputs. Changed those to regular artifact paths because those files are not emitted in GitLab's native SAST, dependency scanning, container scanning, or DAST schemas.
- The Trivy `jq` expressions could fail when a result had no `Vulnerabilities` array. Updated them to use optional traversal.
- The scanner container jobs did not clear Docker image entrypoints, which can prevent GitLab Runner from executing `script` commands. Added `entrypoint: [""]` for scanner images.
- The TruffleHog job suppressed the scanner exit code and treated any non-empty output file as a secret finding. Updated it to use TruffleHog's `--fail` behavior and store the JSON output as an artifact.
- The ZAP job referenced the older `owasp/zap2docker-stable` image. Updated it to the current ZAP image location, `ghcr.io/zaproxy/zaproxy:stable`.
- The Semgrep pre-commit hook used the outdated `returntocorp/semgrep` repository and an old revision. Updated it to the official `semgrep/pre-commit` hook repository and current documented revision.
- The Safety pre-commit hook used deprecated `safety check`. Replaced it with `safety scan --target .` and added `additional_dependencies` so the hook environment installs Safety.
- The Python Jira example referenced `os.environ` without importing `os`. Added the missing import.
- The Jira Cloud example used an API token with an empty username and old REST API v2 endpoints. Updated authentication to use email plus API token and changed issue search and issue creation to REST API v3.
- The duplicate check expected a `total` field from the old search API. Updated it to inspect returned `issues` from the v3 JQL search response.
- The ticket description always linked every finding ID to NVD, which is incorrect for Semgrep rule IDs. Added reference formatting that only creates an NVD link for CVE IDs.
- The Falco rule used a list name as a condition expression and referenced an undefined allow-list. Added explicit lists and changed the condition to `proc.name in (shell_procs)`.
- The Falco sensitive-file rule used a wildcard inside an `in` list for `/root/.ssh/*`. Replaced that part with Falco's path-prefix `pmatch` operator.

## Review Notes
- The examples still assume the CI runner or selected job images provide tools such as Docker, Syft, kubectl, npm, jq, and registry credentials where needed. That is acceptable for a guide-level snippet, but a production pipeline should pin tool versions and use purpose-built images.
- The Cosign example still uses key-based signing. Current Sigstore guidance recommends bundles for blob signing and keyless signing where practical, but the shown key-based pattern remains a plausible workflow.
