# Validation Summary: How to Run Checkov in Docker for IaC Scanning

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Checkov
- Docker
- Infrastructure as Code
- Terraform
- CloudFormation
- Kubernetes
- Helm
- Dockerfiles
- GitHub Actions
- SARIF
- JUnit XML

## Sources Consulted
- Checkov CLI Command Reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov Docker integration: https://www.checkov.io/4.Integrations/Docker.html
- Checkov Dockerfile scanning example and policy index: https://www.checkov.io/7.Scan%20Examples/Dockerfile.html, https://www.checkov.io/5.Policy%20Index/dockerfile.html
- Checkov YAML custom policy documentation: https://www.checkov.io/3.Custom%20Policies/YAML%20Custom%20Policies.html
- Checkov suppressing and skipping policies: https://www.checkov.io/2.Basics/Suppressing%20and%20Skipping%20Policies.html
- Checkov hard and soft fail documentation: https://www.checkov.io/2.Basics/Hard%20and%20soft%20fail.html
- Checkov Helm scanning documentation: https://www.checkov.io/7.Scan%20Examples/Helm.html
- Checkov GitHub Actions integration: https://www.checkov.io/4.Integrations/GitHub%20Actions.html
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github

## Issues Found
- The post used `--check-severity`, which is not a current Checkov CLI option. Replaced it with `--check HIGH` for selecting checks by severity and `--hard-fail-on CRITICAL` for CI exit-code behavior.
- The compliance example used `--check-type terraform`, which is not a current Checkov CLI option. Removed the unsupported flag and adjusted the surrounding text to describe running and listing Terraform checks, then reviewing their compliance mappings.
- The Helm example comment said to pipe rendered output to Checkov, but the command scans a chart directory with Checkov's Helm framework. Updated the comment to match the command.
- The custom YAML policy used `CUSTOM_001` as an ID. Updated it to `CKV2_CUSTOM_1`, matching Checkov's documented custom YAML policy ID pattern.
- The Dockerfile example implied the Dockerfile framework itself detects the hardcoded secret. Clarified that this is detected when the secrets framework is included.
- The SARIF upload workflow lacked the `security-events: write` permission required by GitHub's SARIF upload action. Added minimal workflow permissions.

## Review Notes
The Checkov Docker image could not be pulled locally because Docker Hub returned an unauthenticated pull rate-limit error, so command verification was performed against official Checkov documentation rather than local `--help` output. Severity filtering depends on Checkov severity metadata; the documented CLI supports severity values in `--check`, `--skip-check`, `--soft-fail-on`, and `--hard-fail-on`.
