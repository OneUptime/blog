# Validation Summary: How to Scan Dockerfiles for Security Issues with Checkov

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Dockerfile
- Checkov
- Python / pip / pipx
- GitHub Actions
- GitLab CI
- pre-commit
- SARIF and JUnit XML output

## Sources Consulted
- Checkov CLI Command Reference: https://www.checkov.io/2.Basics/CLI%20Command%20Reference.html
- Checkov Dockerfile configuration scanning: https://www.checkov.io/7.Scan%20Examples/Dockerfile.html
- Checkov Dockerfile policy index: https://www.checkov.io/5.Policy%20Index/dockerfile.html
- Checkov installation documentation: https://www.checkov.io/2.Basics/Installing%20Checkov.html
- Checkov suppressing and skipping policies: https://www.checkov.io/2.Basics/Suppressing%20and%20Skipping%20Policies.html
- Checkov pre-commit integration documentation: https://www.checkov.io/4.Integrations/pre-commit.html
- Checkov GitHub Actions integration documentation: https://www.checkov.io/4.Integrations/GitHub%20Actions.html
- Checkov GitLab CI integration documentation: https://www.checkov.io/4.Integrations/GitLab%20CI.html
- Dockerfile reference: https://docs.docker.com/reference/dockerfile/
- GitHub SARIF upload documentation: https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/uploading-a-sarif-file-to-github
- Local verification with Checkov 3.2.533 installed under `/tmp/checkov-review-target`

## Issues Found
- Corrected the stated Python requirement from Python 3.8+ to Python 3.9+, matching current Checkov package metadata for Checkov 3.2.533.
- Reworded the claim that Dockerfiles are scanned against "hundreds" of policies and CIS Docker Benchmark recommendations. The current Checkov Dockerfile policy index lists specific Dockerfile best-practice policies, not hundreds of Dockerfile-specific policies.
- Updated the example scan output. The original Dockerfile used `apt-get`, so it does not trigger `CKV_DOCKER_9`, and `USER root` means it does not trigger `CKV_DOCKER_3`. Current Checkov reports `CKV_DOCKER_1`, `CKV_DOCKER_2`, `CKV_DOCKER_7`, and `CKV_DOCKER_8` for that snippet.
- Replaced the incorrect `CKV_DOCKER_6: Adding Sensitive Files` section. Current `CKV_DOCKER_6` is about deprecated `MAINTAINER`; the practical Dockerfile check for the shown COPY/ADD topic is `CKV_DOCKER_4`, which prefers `COPY` over `ADD`.
- Updated the pre-commit example to include a `files` pattern for Dockerfiles. Checkov's own pre-commit docs state the default hook runs on `.tf` changes unless the file pattern is overridden.
- Updated the pinned Checkov pre-commit revision from `3.1.0` to the current verified release `3.2.533`.

## Review Notes
The final "AFTER" Dockerfile was scanned with Checkov 3.2.533 and produced `Passed checks: 60, Failed checks: 0, Skipped checks: 0`. The GitHub Actions, GitLab CI, CLI output format, skip-check, check selection, external checks directory, and Dockerfile skip comment examples are consistent with current Checkov documentation.
