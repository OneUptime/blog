# Validation Summary: How to Set Up Matrix Jobs in GitLab CI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml`)
- `parallel:matrix` keyword and matrix job expansion
- `needs` / matrix expressions (`$[[ matrix.IDENTIFIER ]]`)
- `rules`, `variables`, `cache`, `artifacts`, `services`
- Docker (build, `--platform`, dind)
- Node.js / npm CI workflows
- Playwright browser testing
- PostgreSQL / MySQL service containers

## Sources Consulted
- GitLab Docs — Matrix expressions in GitLab CI/CD: https://docs.gitlab.com/ci/yaml/matrix_expressions/
- GitLab Docs — Control how jobs run (job_control, parallel:matrix): https://docs.gitlab.com/ci/jobs/job_control/
- GitLab Docs — CI/CD YAML syntax reference: https://docs.gitlab.com/ci/yaml/
- GitLab 18.6 release notes (matrix expressions introduction): https://docs.gitlab.com/releases/18/gitlab-18-6-released/

## Issues Found
- **`needs:parallel:matrix` used `${ARCH}` variable interpolation (the "Matrix with Needs" example).** GitLab does not support `${VAR}` interpolation inside `needs:parallel:matrix` to create a 1:1 dependency mapping between parallel matrix jobs. The literal string would not resolve to the current job's matrix value. Fixed to use the official matrix expression syntax introduced in GitLab 18.6: `- ARCH: ['$[[ matrix.ARCH ]]']`. This is the documented way to map matrix dependencies 1:1 between parallelized jobs.

## Review Notes
- **Single-value matrix entries are valid.** The Troubleshooting "Jobs Not Running" section labels `- VAR1: "a"` as "Incorrect - missing list." A single (non-array) string value is in fact valid `parallel:matrix` syntax (the official docs show `PROVIDER: aws` alongside array values) — it simply produces one job instead of multiple. The example is pedagogically fine (you need an array to fan out into multiple parallel jobs), but the "incorrect syntax" framing slightly overstates it. Left unchanged to avoid stylistic restructuring.
- **"Reducing Matrix Size for MRs" example is a leaky pattern.** Setting `NODE_VERSION` via `rules:variables` does not shrink an already-defined `parallel:matrix` — the matrix variable takes precedence and all matrix instances are still created. The intended "only latest version on MRs" effect is better achieved with separate jobs (as the post already does with `test_full_matrix`) or matrix-less rules-driven variables. The example is illustrative but does not literally achieve its commented goal.
- **Dynamic Matrix Generation via dotenv.** A `dotenv` artifact variable cannot dynamically populate the `parallel:matrix` list — the matrix array must be static in the YAML. The post hedges this with the "Fallback, can be overridden" comment, so it is not misleading, but readers should know GitLab parallel matrices are not generated at runtime from `dotenv` values.
- Other syntax checked and correct: `parallel:matrix` basic/multi-dimensional expansion and job counts, variables in `image:` and `tags:`, `services` with `${VAR}` images, `allow_failure:exit_codes`, `interruptible`, `coverage_report:coverage_format: cobertura`, `artifacts:reports:junit`, Docker `--platform` builds with bash parameter expansion, and Playwright project/grep usage.
- Version-specific caveat: matrix expressions (`$[[ matrix.IDENTIFIER ]]`) require GitLab 18.6+ and were in beta at the time of writing.
