# Validation Summary: How to Handle Monorepos with GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab CI YAML configuration
- Monorepo pipeline design
- Parent-child and dynamic child pipelines
- Git change detection
- Node.js/npm build and test commands
- YAML and Python dependency-map examples

## Sources Consulted
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab downstream pipelines documentation: https://docs.gitlab.com/ci/pipelines/downstream_pipelines/
- GitLab rules documentation: https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab job control and matrix jobs documentation: https://docs.gitlab.com/ci/jobs/job_control/
- GitLab matrix expressions documentation: https://docs.gitlab.com/ci/yaml/matrix_expressions/
- GitLab needs documentation: https://docs.gitlab.com/ci/yaml/needs/
- GitLab dotenv variables documentation: https://docs.gitlab.com/ci/variables/dotenv_variables/

## Issues Found
- Replaced `trigger: strategy: depend` with `trigger: strategy: mirror` in the dynamic and child pipeline examples. GitLab's current documentation marks `depend` as not recommended and recommends `mirror` for waiting on downstream pipeline status.
- Fixed the matrix build `needs:parallel:matrix` example to use the current matrix expression syntax, `'$[[ matrix.SERVICE ]]'`, instead of `${SERVICE}`. GitLab matrix expressions are resolved at pipeline creation time and use the `$[[ matrix.IDENTIFIER ]]` form for 1:1 matrix dependencies.
- Moved the root dependency cache example from top-level `cache:` to `default: cache:`. GitLab documents top-level `cache` outside `default` as deprecated.
- Removed the unconditional merge-request workflow rule from the large-monorepo optimization example. With that rule present, merge request pipelines would run even when none of the listed paths changed, contradicting the example's stated goal of skipping irrelevant changes.

## Review Notes
- The `rules:changes` examples are accurate for branch and merge request pipelines, but GitLab notes that `rules:changes` evaluates to true for new branches and pipeline types without a Git push event unless `compare_to` is used.
- The shell examples using `git diff --name-only HEAD~1` are reasonable simplified examples, but production pipelines often need a more explicit comparison base for merge requests, first commits on a branch, scheduled pipelines, or shallow clone settings.
