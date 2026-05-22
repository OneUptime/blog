# Validation Summary: How to Use KICS for Infrastructure as Code Scanning

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- KICS
- Terraform
- Rego / Open Policy Agent
- Docker
- GitHub Actions
- GitLab CI
- pre-commit
- SARIF and GitLab SAST reports

## Sources Consulted
- KICS command line documentation: https://docs.kics.io/latest/commands/
- KICS configuration file documentation: https://docs.kics.io/latest/configuration-file/
- KICS running and inline comment documentation: https://docs.kics.io/latest/running-kics/
- KICS query documentation: https://docs.kics.io/latest/queries/
- KICS custom query documentation: https://docs.kics.io/latest/creating-queries/
- KICS platforms documentation: https://docs.kics.io/latest/platforms/
- KICS results documentation: https://docs.kics.io/latest/results/
- KICS GitLab CI documentation: https://docs.kics.io/latest/integrations_gitlabci/
- KICS pre-commit documentation: https://docs.kics.io/latest/integrations_pre_commit/
- Checkmarx KICS GitHub Action README: https://github.com/Checkmarx/kics-github-action
- Checkmarx security update for affected KICS artifacts: https://checkmarx.com/blog/ongoing-security-updates/
- Local verification with the official `checkmarx/kics:latest` Docker image (`kics version`, `scan --help`, `list-platforms`, and a custom-query smoke test).

## Issues Found
- Replaced exact "over 2000 built-in queries" claims with "large built-in query library" because the current official image and docs do not consistently support that exact built-in count.
- Updated installation guidance: `brew install kics` is not current KICS guidance, and the Checkmarx tap is documented as deprecated for versions after 1.5.1. Added source-build commands and pinned Docker examples to `v2.1.20`.
- Updated the sample scan output from `KICS v1.7.0` and changed the description from a table to a results summary, matching current CLI behavior more closely.
- Fixed invalid query-listing commands. `kics scan --list-platforms` and `kics list --type terraform` are not valid current CLI commands; replaced them with `kics list-platforms` and metadata inspection.
- Fixed inline suppression syntax. `kics-scan ignore-block=<query_id>` is not supported; `ignore-block` ignores a block, while query-specific ignores use `disable=<query_id>` at the start of a file.
- Fixed the custom query example. The referenced `tf_lib.allows_tags` helper does not exist in current KICS libraries; replaced it with `tf_lib.check_resource_tags`, used the expected query folder layout, and changed the metadata ID to a UUID.
- Updated GitHub Actions integration to `checkmarx/kics-github-action@v2.1.20` and used `platform_type` for the platform input.
- Fixed GitLab CI SAST output. GitLab SAST integration expects KICS `glsast` output and the generated `gl-sast-results.json` file, not SARIF.
- Updated the pre-commit example from `v1.7.0` to `v2.1.20`.

## Review Notes
KICS Docker images and GitHub Actions had affected artifacts in March and April 2026. The post now pins examples to `v2.1.20` and notes that production CI should pin a trusted version or digest. Teams that pulled affected KICS Docker tags during the April 22, 2026 window should follow Checkmarx's advisory.
