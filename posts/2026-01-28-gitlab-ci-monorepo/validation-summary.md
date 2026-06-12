# Validation Summary: How to Use GitLab CI for Monorepo

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitLab CI/CD
- Monorepo CI configuration
- GitLab CI `rules:changes`
- GitLab parent-child pipelines
- GitLab CI caching
- GitLab CI `parallel:matrix`

## Sources Consulted
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Specify when jobs run with rules - https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab Docs: Downstream pipelines - https://docs.gitlab.com/ci/pipelines/downstream_pipelines/
- GitLab Docs: Caching in GitLab CI/CD - https://docs.gitlab.com/ci/caching/
- GitLab Docs: Optimize GitLab CI/CD configuration files - https://docs.gitlab.com/ci/yaml/yaml_optimization/
- GitLab Docs: Use CI/CD configuration from other files - https://docs.gitlab.com/ci/yaml/includes/

## Issues Found
- The child pipeline example used `trigger: strategy: depend`. GitLab's current YAML reference says `depend` is not recommended and advises using `mirror` instead. Updated the example to `strategy: mirror`, which preserves the intended behavior of waiting for the child pipeline status before later stages continue.

## Review Notes
The `rules:changes` examples, local child pipeline include syntax, cache key/path syntax, and matrix guidance are consistent with current GitLab CI/CD documentation. The path-based matching examples use valid glob syntax, and the cache key avoids disallowed `/` characters.
