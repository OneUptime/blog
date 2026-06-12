# Validation Summary: How to Debug GitLab CI Pipeline Failures

## Status
validated

## Post Type
Guide / Troubleshooting checklist

## Technologies Covered
- GitLab CI/CD
- GitLab Runner
- Docker (as container executor / local reproduction)
- YAML (`.gitlab-ci.yml` configuration)

## Sources Consulted
- GitLab CI/CD variables — `CI_DEBUG_TRACE` documentation: https://docs.gitlab.com/ee/ci/variables/variables_troubleshooting.html#enable-debug-logging
- GitLab CI/CD `.gitlab-ci.yml` keyword reference (`artifacts:when`, `artifacts:paths`, `retry`): https://docs.gitlab.com/ee/ci/yaml/index.html
- GitLab `retry` keyword (valid values are 0, 1, 2): https://docs.gitlab.com/ee/ci/yaml/index.html#retry
- Docker CLI `docker run` reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker official `node` image (tag `20`): https://hub.docker.com/_/node

## Issues Found
No technical issues found.

- `CI_DEBUG_TRACE: "true"` is the correct GitLab CI variable to enable verbose shell tracing of the job script.
- `artifacts.when: always` with `paths:` is valid YAML for the `artifacts` keyword and will upload artifacts regardless of job success or failure.
- `retry: 2` is within the allowed range (0–2) for the `retry` keyword.
- `docker run --rm -it node:20 bash` is a valid command for interactively reproducing a job environment locally.

## Review Notes
- The post is intentionally brief and presents a high-level checklist rather than an in-depth tutorial. The technical claims are accurate but readers may want to consult the GitLab docs for more advanced retry configuration (e.g., `retry: { max: 2, when: runner_system_failure }`) and artifact expiration (`artifacts:expire_in`).
- `CI_DEBUG_TRACE` can expose secrets in logs; a future revision could warn that debug tracing should be used carefully on protected/private projects.
- The claim "Most failures are in the last 20 lines" is a heuristic, not a guarantee — it is presented as general advice and is reasonable in that framing.
