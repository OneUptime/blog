# Validation Summary: How to Cancel Superseded CI Runs Without Canceling the Latest Deployment

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- CI/CD run supersession and deployment serialization
- GitHub Actions workflow- and job-level concurrency
- GitHub Actions environments, expressions, and cancellation behavior
- GitLab CI/CD auto-cancel and `interruptible`
- Bash stale-candidate deployment guards
- Idempotent deployment and cleanup design

## Sources Consulted

- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax)
- [GitHub Actions concurrency control](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [GitHub Actions concurrency concepts](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency)
- [GitHub Actions limits](https://docs.github.com/en/actions/reference/limits)
- [GitHub Actions contexts reference](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts)
- [Deploying with GitHub Actions](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments)
- [GitHub Actions expression evaluation](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions)
- [GitHub Actions workflow cancellation reference](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-cancellation)
- [GitHub Enterprise Server 3.20 concurrency control](https://docs.github.com/en/enterprise-server@3.20/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [GitLab pipeline settings and auto-cancel](https://docs.gitlab.com/ci/pipelines/settings/)
- [GitLab CI/CD YAML syntax reference](https://docs.gitlab.com/ci/yaml/#interruptible)
- [GitLab downstream pipelines](https://docs.gitlab.com/ci/pipelines/downstream_pipelines/)

## Issues Found

- The GitHub Actions discussion described `queue: max` as ordered queuing without the documented ordering caveat. It now explains that queued work is processed FIFO by the time it begins waiting, not by workflow dispatch time, so exact dispatch ordering is not guaranteed. It also notes that GitHub Enterprise Server 3.20 does not document `queue: max`, although the current GitHub.com documentation does.
- The self-hosted-runner statement implied that ordinary child processes can survive cancellation. GitHub documents that the runner escalates signals and ultimately kills the step's process tree. The statement was narrowed to deliberately detached processes that escape that tree on a persistent self-hosted runner.
- The conditional GitHub cancellation example retained tags and `main`, but the surrounding list could be read as saying that the same expression retained every listed release and scheduled-run category. The introduction to the example now states its exact scope.
- The GitLab example put all three jobs in GitLab's default `test` stage. That allowed the non-interruptible deployment to start at the same time as lint and unit tests, preventing the intended early cancellation behavior and allowing deployment before validation succeeded. Explicit `test` and `deploy` stages were added.
- The post did not state that GitLab's `interruptible` keyword has no effect when Auto-cancel redundant pipelines is disabled. The prerequisite is now explicit.
- The GitLab statement that one started `interruptible: false` job makes the whole pipeline non-interruptible applies to the default `workflow:auto_cancel:on_new_commit: conservative` mode, not to every mode. The text now identifies that scope and explains that `on_new_commit: interruptible` cancels only jobs marked `interruptible: true`.
- The conclusion called the production concurrency group “environment-level,” although GitHub documents that environments and concurrency are independent and the example configures concurrency at job level. It now calls this a deployment concurrency group.

## Review Notes

The GitHub Actions YAML, GitLab CI/CD YAML, and Bash snippets are syntactically valid after correction. `queue: max` currently allows up to 100 pending jobs or workflow runs per group on GitHub.com and cannot be combined with `cancel-in-progress: true`. The conditional GitHub example intentionally retains only tags and `main`; repositories that must also retain protected release branches or scheduled suites need to extend the expression for their event and branch policies. The stale-candidate helper scripts are project-specific placeholders, and their authority source must match the deployment approval policy as the post states.
