# Validation Summary: How to Build Child Pipelines in GitLab CI

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- GitLab CI/CD (`.gitlab-ci.yml`, `trigger:`, `include:`, `rules:`, `artifacts:`)
- Child pipelines and parent/child orchestration
- Dynamic pipeline generation via artifacts
- `parallel:matrix` for monorepo fan-out
- Mermaid diagrams

## Sources Consulted
- GitLab CI/CD YAML reference — `trigger` keyword: https://docs.gitlab.com/ee/ci/yaml/#trigger
- GitLab CI/CD YAML reference — `rules`: https://docs.gitlab.com/ee/ci/yaml/#rules
- Where variables can be used: https://docs.gitlab.com/ee/ci/variables/where_variables_can_be_used.html
- Dotenv variables (`artifacts:reports:dotenv`): https://docs.gitlab.com/ci/variables/dotenv_variables/
- Downstream / child pipeline docs: https://docs.gitlab.com/ee/ci/pipelines/downstream_pipelines.html

## Issues Found

1. **Debugging section used `before_script` inside a `trigger:` job.** Trigger jobs do not have a runner execution context, so they don't accept `script`, `before_script`, or `after_script`. The example would have failed YAML validation. Replaced it with a separate `debug-trigger` job that runs the diagnostic commands in its own `script:`, then chained the actual trigger job to it with `needs:`. Added a sentence explaining the constraint.

2. **Conditional child pipelines example relied on dotenv variables in `rules:if`.** The original example wrote `FRONTEND_CHANGED=true` to a dotenv report from a detect job, then referenced `$FRONTEND_CHANGED` in a later trigger job's `rules:if`. This does not work in GitLab: `rules:if` is evaluated when the pipeline is created, while dotenv variables only exist after the producing job runs on a runner — the dotenv docs explicitly state "You cannot use dotenv variables in `rules` sections." Rewrote the example to use `rules:changes` (the canonical pattern for path-conditional triggers) and added a short note explaining why the dotenv pattern won't work in `rules:if`.

3. **Missing `##` on the "Resource Management" section heading.** Plain text instead of a Markdown heading, so it would not render in the section navigation. Added `##` to match the surrounding sections.

## Review Notes

- The `Multiple Include Sources` example mixes `local:`, `remote:`, and `project:` — all three are valid `include:` sources for trigger jobs per current GitLab docs.
- The dynamic pipeline example uses `include: - artifact: ... job: ...`, which is the correct syntax for triggering a pipeline from a generated YAML artifact.
- The `parallel:matrix` example for monorepos correctly combines a matrix with `trigger:` and `rules:changes` — this is supported.
- The "Strategy Options" section's description is accurate: without `strategy: depend`, the parent trigger job is marked successful as soon as the child pipeline is created; with `strategy: depend` it waits for the child and reflects its status.
- `resource_group` is correctly listed as supported on trigger jobs.
- The post does not pin a specific GitLab version; all features referenced (child pipelines, `strategy: depend`, dotenv reports, `parallel:matrix` with trigger) have been GA for several years and should work on any reasonably recent self-hosted or SaaS GitLab.
