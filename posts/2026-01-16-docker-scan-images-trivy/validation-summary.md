# Validation Summary: How to Scan Docker Images for Vulnerabilities with Trivy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Trivy
- Container image vulnerability scanning
- Dockerfile and IaC misconfiguration scanning
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- JSON, SARIF, and template reporting
- npm dependency version pinning

## Sources Consulted
- Trivy installation documentation: https://trivy.dev/docs/latest/getting-started/installation/
- Trivy repository package instructions: https://aquasecurity.github.io/trivy-repo/
- Trivy image CLI reference: https://trivy.dev/docs/latest/references/configuration/cli/trivy_image/
- Trivy reporting documentation: https://trivy.dev/docs/latest/configuration/reporting/
- Trivy database update documentation: https://trivy.dev/docs/latest/configuration/db/
- Trivy filtering documentation: https://trivy.dev/docs/latest/configuration/filtering/
- Trivy container image target documentation: https://trivy.dev/docs/latest/guide/target/container_image/
- Trivy filesystem target documentation: https://trivy.dev/docs/latest/target/filesystem/
- Trivy misconfiguration scanning documentation: https://trivy.dev/docs/latest/scanner/misconfiguration/
- Trivy GitLab CI integration documentation: https://trivy.dev/docs/latest/tutorials/integrations/gitlab-ci/
- Trivy GitHub Action documentation: https://github.com/aquasecurity/trivy-action
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file
- npm registry metadata for axios and lodash: https://www.npmjs.com/package/axios and https://www.npmjs.com/package/lodash

## Issues Found
- The Debian/Ubuntu installation example used the deprecated `apt-key` flow and a release-codename repository entry. Updated it to the current signed keyring approach with `signed-by=/usr/share/keyrings/trivy.gpg` and the `generic` repository channel used in Trivy's official package instructions.
- The RHEL/CentOS installation example pinned an old Trivy `v0.48.0` RPM. Replaced it with the official Yum repository configuration and `yum install trivy` so readers install a current package.
- The GitHub Actions example used floating `aquasecurity/trivy-action@master` references and the outdated `github/codeql-action/upload-sarif@v2`. Updated Trivy Action to a versioned release, updated SARIF upload to `@v4`, and added the `security-events: write` permission required for SARIF uploads.
- The `jq` JSON processing example assumed every result always has a `Vulnerabilities` array. Added optional traversal operators so the command does not fail on clean or non-vulnerability result entries.
- The pre-deploy gate comment said exit code 0 means "safe to deploy." Changed it to say no matching vulnerabilities were found, which is the accurate meaning of the Trivy command result.
- The package version example used a `dockerfile` code fence for JSON, used range specifiers despite saying "pin," and included stale example versions. Changed the fence to `json`, removed the invalid comment from the JSON block, and used exact current package versions from npm metadata.

## Review Notes
Most Trivy CLI examples remain valid against the current CLI reference. Future improvements could pin CI examples to the then-current Trivy Action release at publication time and consider avoiding `latest` image tags in production CI examples.
