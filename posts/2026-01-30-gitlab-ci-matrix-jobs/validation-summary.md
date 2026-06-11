# Validation Summary: How to Create GitLab CI Matrix Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD
- GitLab CI `parallel:matrix`
- GitLab CI `rules`, `needs`, `services`, `tags`, `artifacts`, `retry`, and `workflow:auto_cancel`
- Node.js, npm, Yarn, Deno
- Python, pytest, pytest-cov
- PostgreSQL, MySQL, SQLite
- Playwright

## Sources Consulted
- GitLab CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab CI job control and matrix jobs: https://docs.gitlab.com/ci/jobs/job_control/
- GitLab CI rules documentation: https://docs.gitlab.com/ci/jobs/job_rules/
- GitLab CI variables usage reference: https://docs.gitlab.com/ci/variables/where_variables_can_be_used/
- GitLab CI `needs` documentation: https://docs.gitlab.com/ci/yaml/needs/
- GitLab matrix expressions documentation: https://docs.gitlab.com/ci/yaml/matrix_expressions/
- Node.js official releases page: https://nodejs.org/en/about/previous-releases
- Node.js EOL information: https://nodejs.org/en/about/eol

## Issues Found
- The post stated that matrix job names can be customized with a job-level `name` keyword. GitLab CI does not provide a general job-level `name` keyword for this purpose, so the text now explains that the YAML job key is the base job name and GitLab appends matrix values.
- One example used shell parameter expansion in `image: node:${RUNTIME#node-}`. GitLab variable expansion in `image` supports CI/CD variable substitution, not shell parameter expansion, so the example now uses full Docker image values in the matrix.
- The Python coverage example declared a Cobertura coverage report at `coverage.xml` but did not generate that file. The pytest command now includes `--cov-report=xml:coverage.xml`.
- The database services example used an empty service image for SQLite and claimed the service would only start when the image was non-empty. GitLab still expands `services:name`, so an empty image is not a valid conditional service. SQLite is now shown as a separate job without a service.
- The matrix artifact example used `needs` without selecting the matching matrix job, which would depend on all parallel jobs. It now uses `needs:parallel:matrix` with matrix expressions for the 1:1 build-to-test dependency and includes build artifacts in the reporting job.
- The post claimed numeric `parallel` can be combined with `parallel:matrix` in one job. GitLab uses `parallel` as one keyword whose value is either a number or a matrix configuration, so the example now models test shards as a matrix dimension.
- The fail-fast section used `interruptible`, which cancels redundant pipelines on newer commits rather than canceling the rest of a pipeline after a job failure. It now uses `workflow:auto_cancel:on_job_failure: all`.
- The Node.js lifecycle comments described Node 22 as current and Node 18/20 as LTS. These were updated to reflect current Node.js lifecycle status as of June 11, 2026.
- The job-name troubleshooting note now includes GitLab's documented 255-character job name limit and 128-character limit for names used with `needs`.

## Review Notes
The corrected examples are syntactically valid YAML. Many snippets are illustrative and still assume project-specific scripts, lockfiles, test configuration, and runners exist.
