# Validation Summary: How to Implement Pipeline Triggers in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab pipeline trigger tokens
- GitLab Pipelines API
- GitLab CI/CD YAML configuration
- GitLab downstream and multi-project pipelines
- GitLab scheduled pipelines
- cURL
- Bash
- jq

## Sources Consulted
- GitLab Docs: Trigger pipelines with the API - https://docs.gitlab.com/ci/triggers/
- GitLab Docs: Pipeline trigger tokens API - https://docs.gitlab.com/api/pipeline_triggers/
- GitLab Docs: Pipelines API - https://docs.gitlab.com/api/pipelines/
- GitLab Docs: Downstream pipelines - https://docs.gitlab.com/ci/pipelines/downstream_pipelines/
- GitLab Docs: CI/CD YAML syntax reference - https://docs.gitlab.com/ci/yaml/
- GitLab Docs: Specify when jobs run with rules - https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab Docs: Scheduled pipelines - https://docs.gitlab.com/ci/pipelines/schedules/
- GitLab Docs: Predefined CI/CD variables reference - https://docs.gitlab.com/ci/variables/predefined_variables/

## Issues Found
- The Pipeline API example placed `ref` in the JSON body. GitLab's official Create a new pipeline examples pass the required `ref` on the request URL, so the example now uses `/pipeline?ref=main` and keeps the JSON body for `variables`.
- The multi-project artifact example built an artifact download URL from `CI_JOB_URL`, which pointed at the trigger job rather than the upstream build artifact. It now defines build artifacts and uses GitLab's documented `needs:project` pattern to fetch artifacts from the upstream project, job, and ref.
- The downstream job used `only: pipelines`. The example now uses `rules` with `$CI_PIPELINE_SOURCE == "pipeline"`, matching GitLab's preferred current job selection mechanism.
- The webhook payload example used a custom `WEBHOOK_PAYLOAD` variable while describing webhook-triggered pipelines. GitLab exposes webhook request bodies as the file-type `TRIGGER_PAYLOAD` variable, so the handler now reads `TRIGGER_PAYLOAD` and the external example calls the documented webhook-style trigger URL.
- The polling script treated valid intermediate pipeline statuses such as `created`, `waiting_for_resource`, and `preparing` as unknown failures. Those statuses are now handled as in-progress states.
- The scheduled pipeline UI navigation was outdated. It now uses GitLab's current `Build > Pipeline schedules` path.

## Review Notes
- The `needs:project` artifact-fetching example is accurate for multi-project pipelines, but GitLab documents it as a Premium/Ultimate feature.
- GitLab now recommends CI/CD inputs for some pipeline parameterization use cases because they provide stronger typing and validation, but CI/CD variables remain supported for trigger and pipeline API calls.
