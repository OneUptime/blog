# Validation Summary: How to Use Artifacts in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml` pipeline configuration)
- GitLab CI artifacts (paths, exclude, expiration, names, reports, dotenv)
- Artifact reports: JUnit, coverage (cobertura), code quality, SAST, dependency scanning, Terraform
- Job dependencies: `dependencies`, `needs`, DAG
- GitLab CI predefined variables (`CI_JOB_NAME`, `CI_COMMIT_REF_SLUG`, `CI_COMMIT_SHORT_SHA`, etc.)
- GitLab Jobs API for downloading artifacts
- Supporting tooling: npm/Node, Docker, Terraform

## Sources Consulted
- GitLab CI/CD `artifacts` keyword reference — https://docs.gitlab.com/ci/yaml/#artifacts
- GitLab `artifacts:expire_in` (chronic_duration parsing, valid units incl. `mos`, `never`) — https://docs.gitlab.com/ci/yaml/#artifactsexpire_in
- GitLab `artifacts:reports` (junit, coverage_report/cobertura, codequality, sast, dependency_scanning, terraform, dotenv) — https://docs.gitlab.com/ci/yaml/artifacts_reports/
- GitLab `needs` / `dependencies` keywords — https://docs.gitlab.com/ci/yaml/#needs and https://docs.gitlab.com/ci/yaml/#dependencies
- GitLab CI/CD variables and where variable expansion is supported — https://docs.gitlab.com/ci/variables/where_variables_can_be_used/
- GitLab predefined variables (`CI_COMMIT_SHORT_SHA`) — https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab Job Artifacts API — https://docs.gitlab.com/api/job_artifacts/

## Issues Found
- **Bash substring expansion in artifact name** (Dynamic Names section): The post used `name: "myapp-${CI_COMMIT_SHA:0:8}-${CI_JOB_NAME}"`. GitLab CI variable expansion (performed by the runner / in the `name:` field) supports `$var`, `${var}`, and `%var%` forms only — it does **not** support Bash parameter-substring syntax such as `${CI_COMMIT_SHA:0:8}`, so this would not produce a truncated SHA. Changed it to use the predefined `${CI_COMMIT_SHORT_SHA}` variable, which is GitLab's intended way to get the short commit SHA.

## Review Notes
- `expire_in` examples (`30 days`, `1 month`, `6 mos`, `1 year`, `never`) are all valid; GitLab parses these with chronic_duration, which accepts the `mos` abbreviation and the `never` keyword.
- The Complete Example's `package` job re-declares `reports: dotenv: build.env` "Re-export for deploy", but `build.env` is not regenerated in that job — dotenv variables inherited via `needs` from `prepare` do not recreate the file on disk. In practice the downstream `deploy_*` jobs already receive the dotenv variables transitively, so this re-export is unnecessary and could fail if the file is absent. Left as-is since it is illustrative and not a syntactic error, but worth simplifying in a future revision.
- The Code Quality example (`docker run ... pipelinecomponents/codeclimate codeclimate.json`) is illustrative; real Code Climate/CodeClimate setups typically use GitLab's `Code-Quality.gitlab-ci.yml` template. Not changed as it is presented as a generic example.
- Test-runner flags such as `--reporter=junit --outputFile=junit.xml` are framework-dependent and presented as examples; correct in spirit.
- All artifact `reports` keys used (junit, coverage_report, codequality, sast, dependency_scanning, terraform, dotenv) are current and valid GitLab keywords.
