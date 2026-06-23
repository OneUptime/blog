# Validation Summary: How to Use Parent-Child Pipelines in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- Parent-child pipelines
- Downstream pipeline trigger jobs
- GitLab CI YAML configuration
- Dynamic child pipelines
- `rules:changes`
- Docker CLI
- npm scripts and CI installs

## Sources Consulted
- GitLab Docs: Downstream pipelines - https://docs.gitlab.com/ci/pipelines/downstream_pipelines/
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Specify when jobs run with rules - https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab Docs: Make jobs start earlier with needs - https://docs.gitlab.com/ci/yaml/needs/
- npm Docs: npm ci - https://docs.npmjs.com/cli/v9/commands/npm-ci/
- npm Docs: npm scripts - https://docs.npmjs.com/cli/using-npm/scripts/
- Docker Docs: Docker CLI reference - https://docs.docker.com/reference/cli/docker/
- Docker Docs: Build, tag, and publish an image - https://docs.docker.com/get-started/docker-concepts/building-images/build-tag-and-publish-an-image/

## Issues Found
- The post recommended and used `strategy: depend` throughout. GitLab still supports `depend`, but current GitLab documentation marks it as not recommended and says to use `strategy: mirror` instead. Updated the examples and best practice guidance to use `strategy: mirror`.
- The monorepo examples generated dotenv variables in one job and then used those variables in `rules` for trigger jobs. GitLab evaluates `rules` before jobs run, so dotenv variables created by scripts cannot control whether later jobs are added to the pipeline. Replaced those examples with `rules:changes`, which is evaluated at pipeline creation time.
- The multiple child pipelines example used `needs` for trigger jobs that may be omitted by `rules:changes`. GitLab requires `optional: true` when a `needs` target might not exist in the pipeline. Updated those `needs` entries to use optional dependencies.

## Review Notes
The Docker and npm commands are syntactically valid examples, assuming the referenced project directories, package scripts, Dockerfiles, registry authentication, and CI runner privileges exist. `rules:changes` is appropriate for branch and merge request pipelines; for scheduled, tag, or manually run pipelines without a push event, future revisions could add `compare_to` where deterministic comparison behavior is required.
