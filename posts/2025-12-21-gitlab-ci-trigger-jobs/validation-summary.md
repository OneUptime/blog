# Validation Summary: How to Use Trigger Jobs in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- Trigger jobs
- Multi-project pipelines
- Parent-child pipelines
- Dynamic child pipelines
- Pipeline trigger API
- cURL
- YAML CI/CD configuration

## Sources Consulted
- GitLab Docs: Downstream pipelines - https://docs.gitlab.com/ci/pipelines/downstream_pipelines/
- GitLab Docs: CI/CD YAML syntax reference, `trigger` and `trigger:strategy` - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Trigger pipelines with the API - https://docs.gitlab.com/ci/triggers/
- GitLab Docs: CI/CD variables - https://docs.gitlab.com/ci/variables/

## Issues Found
- The post recommended `strategy: depend` for waiting on downstream pipelines. GitLab's current YAML reference says `strategy: depend` is not recommended and recommends `strategy: mirror` instead. Updated all waiting examples and the best-practices text to use `strategy: mirror`.
- The basic trigger example said the deploy job runs after the downstream pipeline completes, but without `trigger:strategy` the trigger job is marked successful as soon as the downstream pipeline is created. Updated the comment to say the deploy job runs after the downstream pipeline is created.
- The pipeline trigger token setup path used "Pipeline triggers"; GitLab's current UI documentation refers to "Pipeline trigger tokens" when creating a token. Updated the wording.

## Review Notes
The examples use representative project paths, project IDs, branch names, and scripts that must be adjusted for a real GitLab instance. GitLab also now supports CI/CD inputs for some downstream-pipeline parameterization use cases, but the variable-based examples remain technically valid.
