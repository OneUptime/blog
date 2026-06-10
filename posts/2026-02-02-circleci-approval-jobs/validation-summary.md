# Validation Summary: How to Implement CircleCI Approval Jobs

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- CircleCI (config version 2.1)
- CircleCI API v2 (workflow approve, workflow cancel, pipeline, project endpoints)
- CircleCI CLI (`circleci` command)
- CircleCI orbs (`circleci/slack`)
- YAML configuration (`.circleci/config.yml`)
- Pipeline parameters (`boolean`, `enum` types)
- Scheduled workflows (`triggers: schedule`)
- Contexts (security/credential restrictions)
- Bash / curl / jq (API automation scripts)
- Docker images (`cimg/node:20.10`, `cimg/base:stable`)
- Slack Block Kit notifications

## Sources Consulted
- CircleCI Configuration Reference: https://circleci.com/docs/configuration-reference/
- CircleCI API v2 Documentation: https://circleci.com/docs/api/v2/
- CircleCI workflow approve endpoint announcement: https://discuss.circleci.com/t/new-v2-api-endpoint-job-approval/35834
- CircleCI CLI Reference: https://circleci-public.github.io/circleci-cli/
- CircleCI CLI GitHub repository: https://github.com/CircleCI-Public/circleci-cli
- Reusable config / parameters reference: https://circleci.com/docs/reference/reusing-config/
- Slack orb releases: https://github.com/CircleCI-Public/slack-orb/releases
- Migrate scheduled workflows to schedule triggers: https://circleci.com/docs/guides/orchestrate/migrate-scheduled-workflows-to-schedule-triggers/
- Homebrew formula for CircleCI CLI: https://formulae.brew.sh/formula/circleci

## Issues Found

1. **Non-existent CircleCI CLI subcommands** — The "Using the CircleCI CLI" section claimed that `circleci workflow list --project-slug ...` and `circleci workflow approve --workflow-id ... --job-id ...` exist. The official CircleCI CLI has no `workflow` subcommand at all (verified via the CLI source and reference documentation). Approvals can only be triggered through the web UI or the API. Rewrote the section to show curl-based shell helpers (`list_workflows`, `approve_workflow`) and clarified that the CLI itself doesn't ship with approval commands. Kept the section heading and the `brew install circleci` / `circleci setup` references since those are real and useful for working with config and orbs.

2. **Incorrect API endpoint usage in the "Approval Job Timeouts" script** — The stale-approvals cleanup script used `GET /api/v2/insights/{project-slug}/workflows` and expected to receive individual workflow runs with a `status` field. That endpoint returns aggregated workflow metrics (success rate, throughput, MTTR, etc.), not individual runs with `on_hold` status. The project-slug format was also wrong because it was missing the VCS prefix (`gh/`). Replaced the script with a two-step iteration that fetches recent pipelines from `GET /api/v2/project/{project-slug}/pipeline?branch=main` and then queries `GET /api/v2/pipeline/{pipeline-id}/workflow` for each, filtering by `status == "on_hold"` and `created_at` against a threshold timestamp. The cancel endpoint (`POST /api/v2/workflow/{id}/cancel`) was already correct and was preserved.

## Review Notes

- The CircleCI API v2 endpoint `POST /workflow/{workflow-id}/approve/{approval-request-id}` used throughout the post is correct.
- The `enum` parameter syntax (`type: enum`, `enum: [...]`, `default: "..."`) is correct per the official reusable-config reference.
- The `circleci/slack@4.12.5` orb version is a valid historical release. The current latest at the time of review is in the 6.x series (e.g., 6.1.3). The 4.12.5 example still works but readers may want to pin to a current major version; left as-is to avoid potentially changing untested Block Kit payload semantics across major versions.
- The legacy scheduled-workflows syntax (`triggers: - schedule: cron: ...`) used in the "Approval Job Timeouts" example is technically deprecated in favor of scheduled pipelines (configured via API/UI), but CircleCI has postponed its removal with no firm timeline and the syntax still functions. Left in place.
- Context-based approval gating (only users with access to the downstream context can approve) is accurate.
- All Docker images referenced (`cimg/node:20.10`, `cimg/base:stable`) are valid published CircleCI convenience images.
- All Mermaid diagrams are syntactically valid and accurately reflect the workflows described.
