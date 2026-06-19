# Validation Summary: How to Control Concurrency in GitHub Actions

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GitHub Actions workflow concurrency
- GitHub Actions job-level concurrency
- GitHub Actions matrix strategies
- GitHub Actions environments and reusable workflows
- GitHub CLI
- YAML workflow configuration

## Sources Consulted
- GitHub Docs: Control the concurrency of workflows and jobs - https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs
- GitHub Docs: Concurrency concepts - https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Docs: Workflow cancellation reference - https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation
- GitHub Docs: Running variations of jobs in a workflow - https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow
- GitHub Docs: Reuse workflows - https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows
- GitHub Docs: Reusing workflow configurations - https://docs.github.com/en/actions/reference/workflows-and-actions/reusing-workflow-configurations
- GitHub CLI manual: gh run list - https://cli.github.com/manual/gh_run_list
- GitHub actions/checkout repository and releases - https://github.com/actions/checkout

## Issues Found
- The post stated that `cancel-in-progress: false` makes new runs queue and execute FIFO. GitHub Actions keeps only one pending run by default and replaces older pending runs unless `queue: max` is configured. Added `queue: max` to deployment, release, migration, and documentation examples where the text promises queued runs, and updated the explanation to avoid a strict dispatch-order guarantee.
- The PR/main concurrency example used `github.sha` as the fallback group key, which made each main-branch push use a unique concurrency group and therefore would not prevent concurrent main runs. Changed the fallback to `github.ref` so pushes to the same branch share a group.
- The queue management example said `timeout-minutes` prevents runs from waiting forever. GitHub documents `timeout-minutes` as a job execution timeout, not a concurrency queue wait timeout. Updated the comment to say it limits deployment execution after the job starts.
- The reusable workflow section said the reusable workflow inherits the caller's concurrency settings. GitHub documents reusable workflow calls as jobs and supports concurrency on calling jobs and called workflows, but a called workflow may need its own concurrency configuration. Clarified that the caller's concurrency gates the invoking job and that concurrency can also be added inside the reusable workflow.

## Review Notes
- `actions/checkout@v6` is current and valid as of the review date.
- `gh run list --status queued`, `gh run list --status in_progress`, and `gh run list --workflow deploy.yml --limit 10` match the current GitHub CLI manual.
- `queue: max` cannot be combined with `cancel-in-progress: true`; examples that cancel in-progress PR builds intentionally do not use `queue: max`.
