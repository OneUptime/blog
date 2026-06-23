# Validation Summary: How to Use Include/Extend in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml` pipeline configuration)
- `include` keyword (local, project, remote, template)
- `extends` keyword (single and multiple inheritance)
- YAML anchors, aliases, and merge keys (`&`, `*`, `<<:`)
- `!reference` tag
- Coverage reports (cobertura) and JUnit artifact reports
- Node.js, Python, and Docker CI examples

## Sources Consulted
- GitLab CI/CD `include` reference — https://docs.gitlab.com/ee/ci/yaml/#include (and sub-keys `include:local`, `include:project`, `include:remote`, `include:template`)
- GitLab CI/CD `extends` reference — https://docs.gitlab.com/ee/ci/yaml/#extends
- GitLab CI/CD `!reference` tags — https://docs.gitlab.com/ee/ci/yaml/yaml_optimization/#reference-tags
- GitLab YAML optimization / anchors — https://docs.gitlab.com/ee/ci/yaml/yaml_optimization/
- GitLab built-in CI templates — https://gitlab.com/gitlab-org/gitlab/-/tree/master/lib/gitlab/ci/templates
- GitLab artifacts reports (coverage_report / cobertura, junit) — https://docs.gitlab.com/ee/ci/yaml/artifacts_reports.html
- GitLab `coverage` keyword — https://docs.gitlab.com/ee/ci/yaml/#coverage

## Issues Found
No technical issues found.

All code examples were verified to be syntactically valid and semantically correct:
- The four `include` sub-keys (`local`, `project`, `remote`, `template`) are used correctly, including `project` with `ref` plus a single-string `file` and a `file` array.
- The referenced built-in templates (`Security/SAST.gitlab-ci.yml`, `Security/Dependency-Scanning.gitlab-ci.yml`, `Code-Quality.gitlab-ci.yml`, `Jobs/Build.gitlab-ci.yml`, `Jobs/Deploy.gitlab-ci.yml`) are all real GitLab-maintained templates.
- `extends` single and multiple inheritance is correct, and the statement that later entries in the `extends` array override earlier ones matches GitLab's merge behavior.
- `!reference [.job, keyword]` usage is correct.
- YAML anchors with `<<: *anchor` merge keys are valid and used appropriately for both job sections and variable maps.
- The `coverage` regex and `artifacts:reports:coverage_report` (cobertura) / `junit` syntax matches current GitLab schema.
- Hidden-job (`.`-prefixed) templates, `retry`, `interruptible`, `allow_failure`, `needs`, and `environment` keywords are all used correctly.

## Review Notes
- The Docker-in-Docker example (`.docker_job` with `image: docker:24`, `services: docker:24-dind`, `DOCKER_HOST: tcp://docker:2375`) is illustrative of multiple inheritance rather than a complete working DinD setup. For a fully functional non-TLS DinD configuration, `DOCKER_TLS_CERTDIR: ""` would typically also be required. This is not an error in the context of a DRY/inheritance tutorial, so no change was made.
- The `deploy_production` job uses the legacy `only: - main` keyword. This still works and is not deprecated, but GitLab now recommends `rules` for new pipelines. Left as-is since it is functionally correct.
- Image tags (`node:20`, `python:3.11`, `docker:24`) are valid and current at the time of review; readers may wish to bump to newer LTS/stable tags over time, but the configuration syntax is version-independent.
