# Validation Summary: How to Implement GitLab CI Multi-Project Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab multi-project pipelines
- GitLab CI YAML configuration
- GitLab Pipeline Trigger API
- CI/CD variables and job tokens

## Sources Consulted
- GitLab Docs: Downstream pipelines - https://docs.gitlab.com/ci/pipelines/downstream_pipelines/
- GitLab Docs: CI/CD YAML syntax reference, `trigger:project` and `trigger:strategy` - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Trigger pipelines with the API - https://docs.gitlab.com/ci/triggers/
- GitLab Docs: Pipeline trigger tokens API - https://docs.gitlab.com/api/pipeline_triggers/
- GitLab Docs: CI/CD job token - https://docs.gitlab.com/ci/jobs/ci_job_token/

## Issues Found
- The post recommended `strategy: depend` for coordinated releases. GitLab still supports `depend`, but current documentation says it is no longer recommended and recommends `strategy: mirror` instead because it mirrors the downstream pipeline status more accurately. Updated the YAML examples, explanation, and best-practice bullet to use `strategy: mirror`.
- The API example used a stored pipeline trigger token. GitLab documentation distinguishes pipeline trigger tokens from true API-triggered multi-project pipelines: a pipeline triggered with `CI_JOB_TOKEN` is associated with the upstream pipeline, while a pipeline triggered with a trigger token is not. Updated the section to use `CI_JOB_TOKEN` and noted that private downstream projects need job token access to be allowed.

## Review Notes
The remaining examples are intentionally minimal placeholders. Real projects should replace the example project path, branch, project ID, and GitLab instance URL with their own values.
