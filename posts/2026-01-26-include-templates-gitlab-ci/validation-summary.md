# Validation Summary: How to Use Include Templates in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab CI `include`
- GitLab managed CI/CD templates
- YAML pipeline configuration
- Kubernetes deployment jobs
- Docker build jobs

## Sources Consulted
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab include documentation: https://docs.gitlab.com/ci/yaml/includes/
- GitLab CI/CD variables documentation: https://docs.gitlab.com/ci/variables/
- GitLab variable expansion reference: https://docs.gitlab.com/ci/variables/where_variables_can_be_used/
- GitLab Code Quality documentation: https://docs.gitlab.com/ci/testing/code_quality/
- GitLab CI Lint documentation: https://docs.gitlab.com/ci/yaml/lint/
- GitLab built-in CI template repository: https://gitlab.com/gitlab-org/gitlab/-/tree/master/lib/gitlab/ci/templates

## Issues Found
- Replaced `image: node:${NODE_VERSION:-20}` with a GitLab-supported variable form and added a top-level `NODE_VERSION` default. GitLab internal variable expansion supports `$variable` and `${variable}` forms, not Bash parameter expansion such as `${VAR:-default}` in YAML keywords.
- Updated built-in template examples from older redirecting paths such as `Security/SAST.gitlab-ci.yml` and `Code-Quality.gitlab-ci.yml` to current `Jobs/...` template paths.
- Added a caveat that the built-in Code Quality template is deprecated and new configurations should prefer importing reports from existing quality tools.
- Corrected the remote include explanation to say remote includes require public HTTP/HTTPS URLs without authentication, and mentioned `integrity` for verification.
- Updated the CI Lint navigation from the older CI/CD Editor wording to the current Build > Pipeline editor > Validate flow.

## Review Notes
GitLab now also supports CI/CD components and typed inputs for reusable pipeline configuration. The post remains accurate as an include-template guide, but a future refresh could mention components for newer reusable CI patterns.
