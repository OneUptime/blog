# Validation Summary: How to Set Up Matrix Builds in GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- GitHub Actions matrix strategies
- GitHub Actions reusable workflows
- GitHub Actions service containers
- Node.js CI workflows
- PostgreSQL service containers
- npm
- JSON and GitHub Actions expressions

## Sources Consulted
- GitHub Docs: Running variations of jobs in a workflow - https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/run-job-variations
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub Docs: Reuse workflows - https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GitHub Docs: Creating PostgreSQL service containers - https://docs.github.com/en/actions/tutorials/use-containerized-services/create-postgresql-service-containers
- GitHub Docs: Workflow commands for GitHub Actions - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands
- GitHub Docs: Expressions - https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- GitHub Docs: Contexts reference - https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- actions/setup-node README - https://github.com/actions/setup-node

## Issues Found
- The dynamic matrix example read a pretty-printed JSON file and wrote it to `$GITHUB_OUTPUT` with `echo "matrix=$MATRIX"`, which can produce a multi-line output value in an invalid format. Changed the command to `jq -c . .github/test-matrix.json` and quoted `$GITHUB_OUTPUT` so the output is written as a single-line JSON value compatible with `fromJSON`.
- The dynamic matrix example used `fromJson`; changed it to the official `fromJSON` capitalization used in GitHub documentation.
- The include/exclude example used an `experimental` field only on the included matrix entry and handled it at the step level. Changed the example to define `experimental: [false]`, use documented job-level `continue-on-error: ${{ matrix.experimental }}`, and keep the excluded combination explicit.
- The text said `include` adds new combinations, but GitHub Actions can also use `include` to augment existing matrix combinations. Updated the sentence to say `include` can add or augment combinations.
- The metrics example reported `"duration": "${{ github.event.workflow_run.run_started_at }}"`, but that value is an event-specific start timestamp, not a duration and not generally available for push or pull request workflows. Changed the example to report `"run_id": "${{ github.run_id }}"` and adjusted the surrounding sentence to discuss tracking build results rather than duration.

## Review Notes
- The examples use Node.js 18 as one matrix target. Node.js 18 is past upstream end-of-life as of this review date, but it can still be a valid compatibility target for projects that intentionally support older runtimes.
