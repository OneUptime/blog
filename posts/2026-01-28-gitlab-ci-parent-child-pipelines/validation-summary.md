# Validation Summary: How to Use GitLab CI Parent-Child Pipelines

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitLab CI/CD
- Parent-child pipelines
- GitLab CI YAML configuration
- Docker build command
- Node.js npm commands

## Sources Consulted
- GitLab Docs: Downstream pipelines - https://docs.gitlab.com/ci/pipelines/downstream_pipelines/
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Use CI/CD configuration from other files - https://docs.gitlab.com/ci/yaml/includes/
- npm CLI Docs: npm ci - https://docs.npmjs.com/cli/commands/npm-ci
- npm CLI Docs: npm test - https://docs.npmjs.com/cli/commands/npm-test
- Docker Docs: docker build - https://docs.docker.com/reference/cli/docker/buildx/build/

## Issues Found
- The post used `strategy: depend` for parent-child pipeline trigger jobs. GitLab's current CI/CD YAML reference says `depend` is not recommended and advises using `mirror` instead. Updated both YAML examples and the explanatory text to use `strategy: mirror`, which makes the trigger job mirror the downstream pipeline status and causes later stages to wait for the child pipeline to complete.

## Review Notes
The `trigger: include` syntax, child pipeline structure, and job-level `variables` passed to the child pipeline are consistent with GitLab's current documentation. The npm and Docker commands are syntactically valid examples, assuming the runner image has Node.js, npm, Docker CLI access, and appropriate Docker build support configured.
