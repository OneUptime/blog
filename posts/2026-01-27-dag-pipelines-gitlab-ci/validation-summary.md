# Validation Summary: How to Implement DAG Pipelines in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab CI YAML
- DAG pipelines with `needs`
- GitLab CI job artifacts
- GitLab CI `parallel:matrix`
- Docker image build, push, and test workflows in GitLab CI

## Sources Consulted
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Make jobs start earlier with `needs` - https://docs.gitlab.com/ci/yaml/needs/
- GitLab Docs: Job artifacts - https://docs.gitlab.com/ci/jobs/job_artifacts/
- GitLab Docs: Control how jobs run - https://docs.gitlab.com/ci/jobs/job_control/
- GitLab Docs: Matrix expressions in GitLab CI/CD - https://docs.gitlab.com/ci/yaml/matrix_expressions/
- GitLab Docs: Build and push container images to the container registry - https://docs.gitlab.com/user/packages/container_registry/build_and_push_images/
- GitLab Docs: Predefined CI/CD variables reference - https://docs.gitlab.com/ci/variables/predefined_variables/
- GitLab Docs: Services, including `CI_DEBUG_SERVICES` behavior - https://docs.gitlab.com/ci/services/

## Issues Found
- The DAG artifact example combined `needs` and `dependencies`. GitLab recommends using `needs:artifacts` to control artifact downloads for jobs that use `needs`, so the example now uses long-form `needs` entries with `artifacts: true`.
- The artifacts section claimed a job could use `dependencies` with `needs: []` to download artifacts without waiting. `needs: []` starts immediately and should not be used to imply waiting for artifact producers, so the example now uses `needs` entries with `artifacts: true`.
- The empty `needs` example referenced a `build` job but did not define it. Added a minimal `build` job so the snippet is self-contained.
- The Docker microservices example built local images and then used them in later jobs, which is not reliable across GitLab CI jobs. Updated it to tag images with `$CI_REGISTRY_IMAGE`, log in to the GitLab container registry, push images, pull them in test jobs, and create the artifact files declared in `artifacts:paths`.
- The optional dependency section incorrectly described `optional: true` as allowing a dependency to fail. In GitLab, `needs:optional` is for needed jobs that may not be present in the pipeline. The text and example now reflect that behavior.
- Several snippets omitted required `script` entries or upstream jobs. Added minimal scripts and job definitions where needed.
- The limiting parallel jobs section used `CI_DEBUG_SERVICES` as if it controlled `needs` behavior. That variable enables service container logging, so it was removed from the resource-limiting example.
- The matrix example used `$PLATFORM` directly inside `needs:parallel:matrix`, which is not the current matrix expression syntax. Updated it to use `$[[ matrix.PLATFORM ]]` and noted the GitLab 18.6 requirement.

## Review Notes
The post is technically relevant and now aligns with current GitLab documentation. The Docker example remains illustrative and assumes runners are configured with Docker access and registry credentials available through GitLab CI variables.
