# Validation Summary: How to Build CI/CD Pipelines with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions workflow syntax
- GitHub Actions jobs, steps, conditions, and job dependencies
- GitHub Actions environments and secrets
- GitHub Container Registry
- Docker GitHub Actions (`docker/login-action`, `docker/metadata-action`, `docker/build-push-action`)
- Node.js CI workflows with npm
- Slack webhook notifications
- Scheduled GitHub Actions workflows

## Sources Consulted
- GitHub Docs: Workflow syntax for GitHub Actions - https://docs.github.com/actions/using-workflows/workflow-syntax-for-github-actions
- GitHub Docs: Using jobs in a workflow - https://docs.github.com/actions/using-jobs/using-jobs-in-a-workflow
- GitHub Docs: Contexts reference - https://docs.github.com/en/actions/reference/workflows-and-actions/contexts
- GitHub Docs: Secrets reference - https://docs.github.com/en/actions/reference/security/secrets
- GitHub Docs: Publishing Docker images - https://docs.github.com/actions/guides/publishing-docker-images
- GitHub Docs: Publishing and installing a package with GitHub Actions - https://docs.github.com/en/packages/managing-github-packages-using-github-actions-workflows/publishing-and-installing-a-package-with-github-actions
- GitHub Docs: Skipping workflow runs - https://docs.github.com/actions/managing-workflow-runs/skipping-workflow-runs
- GitHub Docs: Control the concurrency of workflows and jobs - https://docs.github.com/actions/writing-workflows/choosing-what-your-workflow-does/control-the-concurrency-of-workflows-and-jobs
- GitHub Actions `actions/checkout` repository - https://github.com/actions/checkout
- GitHub Actions `actions/setup-node` repository - https://github.com/actions/setup-node
- Docker Build GitHub Actions documentation - https://docs.docker.com/build/ci/github-actions/
- Docker Docs: Manage tags and labels with GitHub Actions - https://docs.docker.com/build/ci/github-actions/manage-tags-labels/
- `Mattraks/delete-workflow-runs` action documentation - https://github.com/Mattraks/delete-workflow-runs

## Issues Found
- The Docker image publishing workflow used `GITHUB_TOKEN` to push to GitHub Container Registry without declaring package write permissions. Added workflow-level `permissions` with `contents: read` and `packages: write`, matching GitHub's documented requirement for publishing packages from Actions.
- The text said the `deploy` job directly waits for both `test` and `build`, but the YAML sets `deploy.needs: build` while `build.needs: test`. Reworded the explanation to describe the actual dependency chain.
- The commented `kubectl set image` example used the metadata action's multiline `tags` output as if it were a single image reference. Replaced it with a placeholder for a single image reference to avoid suggesting an invalid deployment command.
- The conditional example used a negated expression in a quoted string. GitHub documents `${{ ! ... }}` as the clearest form for conditions beginning with `!`, so the example was updated to `if: ${{ !contains(...) }}`.
- The path filtering example combined `paths` and `paths-ignore` under the same `push` event, which GitHub Actions does not allow. Changed the example to use negative `!` patterns inside `paths`, as documented by GitHub.
- The scheduled workflow used `Mattraks/delete-workflow-runs` without declaring `actions: write`, which is required for deleting workflow runs with the default token in repositories with restricted token permissions. Added job-level `permissions` with `actions: write` and `contents: read`.

## Review Notes
The examples use current major versions for the referenced first-party and Docker actions as of the review date. The post intentionally remains a generic tutorial; real production workflows should pin actions to immutable commit SHAs when supply-chain hardening is required.
