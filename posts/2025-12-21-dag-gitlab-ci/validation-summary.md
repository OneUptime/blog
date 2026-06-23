# Validation Summary: How to Use DAG (Directed Acyclic Graph) in GitLab CI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitLab CI/CD
- GitLab CI YAML
- Directed acyclic graph pipeline scheduling
- Job dependencies with `needs`
- GitLab CI job artifacts

## Sources Consulted
- GitLab Docs: Make jobs start earlier with `needs` - https://docs.gitlab.com/ci/yaml/needs/
- GitLab Docs: CI/CD YAML syntax reference, `needs` and `needs:artifacts` - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Job artifacts - https://docs.gitlab.com/ci/jobs/job_artifacts/

## Issues Found
- The optional dependency example said `optional: true` lets deploy continue if `integration_tests` was skipped. GitLab documents `needs:optional` for jobs that might not be added to the pipeline; if the optional job exists, the dependent job still waits for it. Updated the comment to say deploy can continue when `integration_tests` is not added to the pipeline.
- The cross-stage example claimed a job can depend on a job from a later stage. GitLab documents `needs` for dependencies that let later jobs start earlier, and explicitly supports same-stage dependencies, but later-stage dependencies are not a valid pattern. Replaced the section with a same-stage `needs` example and clarified that later-stage jobs are not valid dependencies.

## Review Notes
- The examples use current GitLab CI YAML forms for `needs`, `needs:artifacts`, `needs:optional`, `needs: []`, `.pre`, same-stage dependencies, and manual deployment rules.
- The post does not pin a GitLab version, so the review used current GitLab documentation as of 2026-06-23.
