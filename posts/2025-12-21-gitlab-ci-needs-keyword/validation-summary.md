# Validation Summary: How to Use Needs Keyword for Job Dependencies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml`)
- The `needs` keyword and DAG (directed acyclic graph) pipelines
- Job dependencies, artifact passing, optional needs, empty needs
- Parallel jobs (`parallel: N`) and matrix jobs (`parallel:matrix`)
- Trigger / child pipeline jobs

## Sources Consulted
- GitLab CI/CD YAML syntax reference — `needs`, `needs:artifacts`, `needs:optional`, `needs:parallel:matrix` (https://docs.gitlab.com/ci/yaml/)
- GitLab "Control how jobs run" / job control docs (https://docs.gitlab.com/ci/jobs/job_control/)
- GitLab matrix expressions docs (https://docs.gitlab.com/ci/yaml/matrix_expressions/)

## Issues Found
- **"Parallel Jobs with Needs" section — incorrect `needs:parallel:matrix` usage.** The original example used a numeric `parallel: 3` job and then tried to depend on it with:
  ```yaml
  needs:
    - job: build
      parallel:
        matrix:
          - CI_NODE_INDEX: [1, 2, 3]
  ```
  This is invalid. The `needs:parallel:matrix` syntax matches against the matrix variables of the upstream job, and it only works when the upstream job itself uses `parallel:matrix`. A numeric `parallel: N` job does not define any matrix variables — `CI_NODE_INDEX` is a runtime predefined variable, not a matrix dimension, so it cannot be used as a selector in `needs`. The correct way to depend on all instances of a numeric parallel job is to reference it by name (`needs: - build`), which waits for every instance and downloads all of their artifacts. I rewrote the example to use `needs: - build` and updated the surrounding explanatory text to clarify the distinction from `parallel:matrix` (covered in the next section).

## Review Notes
- All other examples were verified as correct:
  - Default stage-based behavior and the DAG explanation are accurate.
  - `needs:artifacts` defaults to `true`; `artifacts: true` / `artifacts: false` usage is correct.
  - `needs:optional: true` behavior (job still runs if the dependency did not run) is correct.
  - `needs: []` to start a job immediately is correct.
  - The "Matrix Jobs with Needs" section correctly uses `needs:parallel:matrix` against an upstream `parallel:matrix` job, both for a single variant (`PLATFORM: linux`) and all variants.
  - Using `needs` with a `trigger` job (`strategy: depend`) is valid.
  - The performance optimization math is correct: `max(2m + 5m, 3m + 5m) + 2m = 10m`.
- Mermaid diagrams render and accurately reflect the described dependency graphs.
