# Validation Summary: How to Set Up Basic GitLab CI Pipeline

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- `.gitlab-ci.yml` configuration syntax
- GitLab Runner
- Docker images (node:18-alpine)
- npm (Node.js build/test tooling)
- GitLab CI Lint API

## Sources Consulted
- GitLab CI/CD YAML syntax reference — https://docs.gitlab.com/ee/ci/yaml/
- GitLab `.gitlab-ci.yml` keyword reference (`stages`, `script`, `before_script`, `after_script`, `image`, `cache`, `artifacts`, `dependencies`, `coverage`, `retry`, `default`, `rules`, `workflow`, `environment`) — https://docs.gitlab.com/ee/ci/yaml/
- GitLab predefined CI/CD variables (`CI_COMMIT_BRANCH`, `CI_PIPELINE_SOURCE`, `CI_COMMIT_TAG`, `CI_COMMIT_REF_SLUG`, `CI_PROJECT_DIR`, `CI_COMMIT_REF_NAME`) — https://docs.gitlab.com/ee/ci/variables/predefined_variables.html
- GitLab CI Lint API — https://docs.gitlab.com/api/lint/
- GitLab REST API deprecations/removals — https://docs.gitlab.com/update/deprecations/

## Issues Found
1. **Outdated/removed CI Lint API call.** The post used the global endpoint `https://gitlab.com/api/v4/ci/lint` with a multipart form body (`--form "content=@.gitlab-ci.yml"`). The global `POST /ci/lint` endpoint was deprecated in GitLab 15.7 and **removed in 16.0**; the current endpoint is the project-scoped `POST /projects/:id/ci/lint`, which expects **JSON-encoded** YAML content (not a multipart form). Replaced the snippet with the official approach that builds a JSON body (via `jq`) and POSTs it to the project-scoped endpoint with `Content-Type: application/json`.

## Review Notes
- All `.gitlab-ci.yml` examples are syntactically valid and use current, non-deprecated keywords. `stages`/`script`/`before_script`/`after_script`/`image`/`cache`/`artifacts`/`dependencies`/`coverage`/`retry`/`default`/`rules`/`workflow`/`environment` are all correct.
- The `coverage` regex format (`'/Lines\s*:\s*(\d+\.?\d*)%/'`) uses the required surrounding-slash syntax and is valid.
- The `retry.when` values (`runner_system_failure`, `stuck_or_timeout_failure`) are valid GitLab retry conditions.
- The statement that "jobs in the same stage run in parallel, while stages run sequentially" is accurate for the default execution model (without `needs:`-based DAG ordering).
- `node:18-alpine` is used throughout. Node 18 reached end-of-life in April 2025; the image still works but readers starting fresh may prefer a currently-maintained LTS (e.g. node:20/22). Left as-is since it is not technically incorrect and is illustrative only.
- The global `POST /ci/lint` historically accepted form-style content, but since it no longer exists the example would simply fail; the fix is necessary for the command to work.
