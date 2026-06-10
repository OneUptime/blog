# Validation Summary: How to Create CircleCI Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- CircleCI (CI/CD platform)
- CircleCI configuration version 2.1 (`.circleci/config.yml`)
- CircleCI workflows, jobs, executors, and commands
- CircleCI orbs (specifically `circleci/path-filtering`)
- Pipeline parameters and conditional workflows
- Workspaces, caching, and artifacts
- Contexts for environment variables
- Scheduled workflows / Scheduled Pipelines
- Matrix jobs
- Branch and tag filters
- Approval jobs
- Convenience images (`cimg/node`)
- YAML configuration
- Cron syntax
- Mermaid diagrams (for illustration)

## Sources Consulted
- CircleCI Configuration Reference: https://circleci.com/docs/configuration-reference/
- CircleCI Workflows / Orchestration: https://circleci.com/docs/workflows/
- CircleCI Pipeline Values and Parameters: https://circleci.com/docs/pipeline-variables/
- CircleCI Schedule Triggers (Scheduled Pipelines): https://circleci.com/docs/guides/orchestrate/schedule-triggers-with-multiple-workflows/
- CircleCI Support article on Dynamic `when` Statements in Workflows: https://support.circleci.com/hc/en-us/articles/30941074884379
- CircleCI Discuss thread on conditional jobs in workflows: https://discuss.circleci.com/t/run-job-within-workflow-conditionally/34125
- circleci/path-filtering orb releases on GitHub: https://github.com/CircleCI-Public/path-filtering-orb/releases

## Issues Found

1. **`when` clause used at per-job level in the "Conditional Workflow Execution" section.** The post originally placed `when: << pipeline.parameters.foo >>` directly under individual job entries within a workflow's `jobs` list. CircleCI does not support per-job `when` in that form — the `when` key is only documented at the workflow level (gating an entire workflow). I rewrote the example to split the conditional jobs into separate workflows, each guarded by its own workflow-level `when` clause, and added a sentence clarifying that this is the supported pattern.

2. **Outdated `circleci/path-filtering` orb version (`1.0.0`).** Updated to `2.1.0`, which is the most current minor release prior to the v3.0.0 breaking change (blobless checkout default). `2.1.0` is broadly compatible and stable.

3. **No mention that the `triggers: schedule:` syntax for scheduled workflows is legacy.** CircleCI now recommends configuring schedules using Scheduled Pipelines (Schedule Triggers) via the UI or API. I left the YAML example intact (the syntax still works for projects that use it), but added a brief note at the top of the "Scheduled Workflows" section explaining that this is the legacy approach and pointing readers toward Scheduled Pipelines as the modern alternative.

## Review Notes

- The `enum` pipeline parameter type and `setup: true` directive for dynamic configuration are both correct and current.
- The `cimg/node` Docker image tags used (`20.10`, `18.19`, `21.6`) are valid; however, Node.js 21 has reached end-of-life as a current release line, so readers writing new pipelines may prefer LTS versions like Node 20 or Node 22.
- The cron example `*/30 * * * *` (every 30 minutes) is included with a "use sparingly" caveat. CircleCI generally honors short intervals but legacy scheduled workflows had platform-side rate limits — readers running production schedules should use Scheduled Pipelines for predictable cadence.
- All other YAML configuration (workspaces, contexts, matrix jobs, approval jobs, branch/tag filters, fan-out/fan-in patterns, reusable executors/commands) matches the CircleCI 2.1 configuration reference.
- The Mermaid diagrams are illustrative and accurately reflect the workflow patterns they accompany.
