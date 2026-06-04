# Validation Summary: How to Run tfsec in Docker for Terraform Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- tfsec
- Docker
- Terraform / HCL
- AWS Terraform resources
- GitHub Actions
- SARIF
- pre-commit
- Rego custom policies

## Sources Consulted
- Aqua Security tfsec README and Docker usage: https://github.com/aquasecurity/tfsec
- Aqua Security tfsec parameters documentation: https://aquasecurity.github.io/tfsec/v1.28.13/guides/usage/
- Aqua Security tfsec configuration file documentation: https://aquasecurity.github.io/tfsec/v1.28.13/guides/configuration/config/
- Aqua Security tfsec custom checks documentation: https://aquasecurity.github.io/tfsec/v1.28.4/guides/configuration/custom-checks/
- Aqua Security tfsec ignore comments documentation: https://aquasecurity.github.io/tfsec/v1.28.13/guides/configuration/ignores/
- Aqua Security tfsec Rego policy documentation: https://aquasecurity.github.io/tfsec/v1.28.6/guides/rego/rego/
- pre-commit official documentation: https://pre-commit.com/
- Docker run reference: https://docs.docker.com/engine/reference/run/

## Issues Found
- The configuration section said tfsec could use a top-level `tfsec.yml` file while the example command relied on automatic loading. tfsec automatically loads `.tfsec/config.yml` or `.tfsec/config.json`; a top-level `tfsec.yml` requires `--config-file`. Changed the wording to use `.tfsec/config.yml`.
- The custom checks section said `.tfsec/custom_checks.json` would load automatically. Current tfsec documentation says auto-loaded JSON/YAML custom check files must end with `_tfchecks.json` or `_tfchecks.yaml`. Changed the filename to `.tfsec/company_tfchecks.json`.
- The custom rules section grouped JSON and Rego together as if both loaded automatically from `.tfsec`. JSON custom checks can auto-load with the required suffix, but Rego policies require `--rego-policy-dir`. Added that distinction.
- The pre-commit example used `language: system` with an inline `docker run -v "$(pwd):/src"` command. pre-commit has a dedicated `docker_image` language that mounts the repository at `/src`; using it avoids shell expansion and mount issues in hook execution. Updated the hook to `language: docker_image` with `entry: aquasec/tfsec` and explicit args.

## Review Notes
- Aqua Security now encourages tfsec users to migrate to Trivy, and the tfsec repository states that tfsec is part of Trivy. The standalone `aquasec/tfsec` image and documented CLI remain available, so the tutorial is still technically relevant, but future updates should consider a Trivy migration note.
- Docker-based command execution could not be tested locally because Docker Hub returned an unauthenticated pull rate-limit error. CLI flags and behavior were verified against official tfsec documentation instead.
