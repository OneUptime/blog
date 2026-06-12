# Validation Summary: How to Build Multi-Project Pipelines in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- Multi-project pipelines
- Downstream pipelines
- GitLab CI YAML configuration
- GitLab CI job tokens
- GitLab Pipelines API
- GitLab job artifacts

## Sources Consulted
- GitLab Docs: Downstream pipelines - https://docs.gitlab.com/ci/pipelines/downstream_pipelines/
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: CI/CD job token - https://docs.gitlab.com/ci/jobs/ci_job_token/
- GitLab Docs: Pipelines API - https://docs.gitlab.com/api/pipelines/
- GitLab Docs: Pipeline trigger tokens API - https://docs.gitlab.com/api/pipeline_triggers/
- GitLab Docs: Job artifacts - https://docs.gitlab.com/ci/jobs/job_artifacts/

## Issues Found
- Replaced `strategy: depend` recommendations and examples with `strategy: mirror`, because GitLab now recommends `strategy: mirror` for exact downstream status mirroring and documents `strategy: depend` as no longer recommended.
- Updated the artifact-sharing note for `needs:project` to mention that the feature is available on GitLab Premium and Ultimate, matching the current GitLab documentation.
- Removed the unsupported `retry` keyword from a trigger-job example. GitLab trigger jobs only support a limited set of job keywords, and `retry` is not listed as supported.
- Corrected the project access token pipeline creation example to pass variables in the current Pipelines API array-of-hashes parameter format.
- Clarified the troubleshooting note for missing variables to mention `trigger:forward` for pipeline variables, because pipeline variables are not forwarded to downstream pipelines by default.

## Review Notes
The post is technically relevant and remains accurate after the corrections. GitLab also recommends `inputs` for some downstream pipeline configuration use cases because they provide stronger validation than variables; that could be a future enhancement, but the existing variable examples are still valid.
