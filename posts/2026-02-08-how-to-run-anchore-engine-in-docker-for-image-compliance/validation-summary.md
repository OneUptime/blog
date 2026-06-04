# Validation Summary: How to Run Anchore Engine in Docker for Image Compliance

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Anchore Engine
- Anchore CLI
- Docker
- Docker Compose
- PostgreSQL
- REST API
- GitLab CI
- GitHub Actions
- Grype

## Sources Consulted
- Anchore Engine GitHub repository: https://github.com/anchore/anchore-engine
- Anchore CLI GitHub repository: https://github.com/anchore/anchore-cli
- Historical Anchore Engine quickstart documentation: https://docs.anchore.com/2.0/docs/engine/quickstart/
- Anchore policy checks documentation: https://docs.anchore.com/5.0/docs/overview/concepts/policy/policy_checks/
- Anchore scan-action GitHub repository: https://github.com/anchore/scan-action
- Anchore Open Source installation documentation: https://oss.anchore.com/docs/installation/
- Grype GitHub repository: https://github.com/anchore/grype

## Issues Found
- Anchore Engine is presented as a current tool to deploy for image compliance, but the official Anchore Engine repository states that Anchore Engine has not been maintained since 2023, will have no future releases, and advises users to use Syft and Grype instead. The repository was also archived by its owner on March 24, 2026.
- The tutorial depends on Anchore CLI, but the official Anchore CLI repository states that Anchore CLI is no longer maintained as of 2024 and was archived on July 10, 2024.
- The Docker Compose deployment and Engine-based CI/CD workflow are therefore not appropriate as current technical guidance for a 2026 blog post.
- The GitHub Actions example uses `anchore/scan-action@v3` and uploads a hard-coded `results.sarif`; the current official scan-action documentation uses `anchore/scan-action@v7` and uploads the SARIF path from the action output.

## Review Notes
The local Grype examples are closer to current Anchore OSS guidance, but the article's primary subject is the unmaintained Anchore Engine service. Reworking this into a current guide would require changing the core topic to Syft, Grype, or Anchore Enterprise rather than making minor technical corrections.
