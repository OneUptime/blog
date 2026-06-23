# Validation Summary: How to Set Up Multi-Project Pipelines in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- Multi-project (cross-project) pipelines
- `trigger` keyword (downstream pipelines)
- Pipeline trigger tokens & the GitLab REST API (`/trigger/pipeline`, job artifacts download)
- `needs:project`, `include:project`, `forward`, `parallel:matrix`, `rules`
- YAML (`.gitlab-ci.yml`)
- Docker / npm (used in illustrative job scripts)

## Sources Consulted
- CI/CD YAML syntax reference — https://docs.gitlab.com/ci/yaml/
- Downstream pipelines — https://docs.gitlab.com/ci/pipelines/downstream_pipelines/
- Specify when jobs run with rules — https://docs.gitlab.com/ci/jobs/job_rules/
- Control how jobs run (job control) — https://docs.gitlab.com/ci/jobs/job_control/
- CI/CD variables — https://docs.gitlab.com/ci/variables/
- `strategy: mirror` implementation issue/MR — https://gitlab.com/gitlab-org/gitlab/-/issues/431882 and https://gitlab.com/gitlab-org/gitlab/-/merge_requests/195627

## Issues Found
No technical issues found.

The following claims were individually verified and confirmed accurate:

- **`trigger:` with `project`/`branch`/`strategy: depend`** — correct syntax; `strategy: depend` makes the trigger (bridge) job wait for the downstream pipeline.
- **`forward: yaml_variables / pipeline_variables`** — descriptions match the docs: `yaml_variables` defaults to true, `pipeline_variables` defaults to false.
- **Trigger token API** — `POST /projects/:id/trigger/pipeline` with `token` and `ref` form fields is the correct endpoint and parameters.
- **`CI_PIPELINE_SOURCE == "pipeline"`** — correct value for a downstream pipeline created via the `trigger` keyword (a token-API pipeline would be `"trigger"`).
- **`needs:project` with `job`/`ref`/`artifacts: true`** — correct cross-project artifact-dependency syntax.
- **`include:project` with `ref` and `file` (single and list)** — correct.
- **Job artifacts download API** — `GET /projects/:id/jobs/artifacts/:ref_name/download?job=NAME` with `PRIVATE-TOKEN` header is correct.
- **`parallel:matrix` combined with `trigger`** — supported for fanning out multiple downstream pipelines.
- **Variable expansion in `trigger:project`** (`project: $PROJECT`) — explicitly supported per the downstream pipelines docs.
- **Job-level `when: manual` combined with `rules`** (the production-deploy examples) — verified carefully because it looked suspect. This is correct: when a matched rule does not define its own `when`, it falls back to the job-level `when`, so the job is correctly gated as manual.

## Review Notes
- GitLab introduced a newer `strategy: mirror` (mid-2025) for trigger jobs, which always mirrors the downstream pipeline status. Current docs note that `strategy: depend` is "not recommended" because the bridge job status does not always match the downstream pipeline. However, `strategy: depend` is **not deprecated**, remains valid, and works on all GitLab versions (including older self-managed instances), so the post's consistent use of `depend` is correct and was left unchanged. A future revision could mention `strategy: mirror` as the preferred option on recent GitLab versions.
- The `forward: { yaml_variables: true }` shown in the "Variable Not Available" troubleshooting section is technically redundant (it is the default), but it is not incorrect and is reasonable for explicitness.
- All example job scripts (`npm`, `docker`) are illustrative placeholders and are syntactically valid.
