# How to Configure Buildkite Required Checks for GitHub Merge Queues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, GitHub, CI/CD, Testing, DevOps

Description: Connect GitHub merge-group events to Buildkite and publish stable required statuses for the exact speculative merge commit.

---

A pull request can pass every Buildkite test and still stall in GitHub's merge queue. The queue tests a new speculative commit, so a success attached only to the pull request's head commit does not satisfy the check for that merge group.

Configure both the event that creates the build and the status that GitHub requires. Then verify the complete path using a real merge-group commit before making the check mandatory for a busy branch.

## Enable merge-group builds

In the Buildkite pipeline's GitHub settings, enable **Build merge queues**. Ensure the GitHub webhook or integration receives **Merge groups** events. The relevant event is `merge_group`; a normal pull-request webhook is insufficient.

With merge queues enabled, Buildkite handles the merge-group event and ignores the associated ordinary push to the temporary `gh-readonly-queue/*` branch. Without that feature, a branch build may be created from the push, but it lacks the native merge-queue context. The official [merge queue tutorial](https://buildkite.com/docs/pipelines/tutorials/github-merge-queue) describes this event mapping.

Confirm the webhook delivery succeeds and that Buildkite creates the expected build. A missing required check is often an event subscription or pipeline configuration problem, before any test command runs.

## Choose a stable check name

Use one stable status context for the required test contract, for example `ci/application-tests`. Avoid putting the build number, branch name, or commit hash in a required context: GitHub's rule needs a consistent name across builds.

You can define a custom build status in the pipeline's YAML settings:

```yaml
notify:
  - github_commit_status:
      context: "ci/application-tests"

steps:
  - label: "Upload application checks"
    command: "buildkite-agent pipeline upload .buildkite/checks.yml"
```

Place this initial configuration in Buildkite's pipeline settings if you need the status established from the start of the build. A `notify` block introduced later by a pipeline upload is evaluated after the build has started and has different initial reporting behavior. The [GitHub integration guide](https://buildkite.com/docs/pipelines/source-control/github) explains pipeline-level and uploaded build-level status configuration.

Keep any built-in Buildkite status or per-job statuses intentional. Several statuses can coexist, but only mark those with a clear owner and completion contract as required.

## Require the context in GitHub

In the target branch's protection rule or ruleset, configure the required check that the pipeline actually publishes. Where GitHub allows restricting the expected source application, select the Buildkite integration associated with the repository.

Configure the merge queue for that same target branch. GitHub's [merge queue administration guide](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/configuring-pull-request-merges/managing-a-merge-queue) explains how the queue and required checks interact.

Run a sample build before looking for the context in GitHub's selector. Check-name mismatches, duplicate names from other CI systems, and an expected source application that differs from the actual sender can all leave a healthy build unable to satisfy the rule.

## Run checks on the speculative commit

A native Buildkite merge-queue build exposes the speculative head in `BUILDKITE_COMMIT`. Its base is available in `BUILDKITE_MERGE_QUEUE_BASE_COMMIT`, and the target branch in `BUILDKITE_MERGE_QUEUE_BASE_BRANCH`.

Keep normal agent checkout behavior so tests execute the build's commit. Do not replace it with a checkout of the pull request's original branch or the current target branch tip. Either replacement changes what was tested while leaving a status attached to the speculative commit.

If you use step conditions, include merge queues explicitly where needed:

```yaml
steps:
  - label: "Required integration checks"
    command: "./scripts/integration-tests.sh"
    if: build.branch == "main" || build.merge_queue.base_branch == "main"
```

This example is for a pipeline whose required integration suite runs on `main` and its merge queue. Add the repository's normal pull-request checks according to your workflow. A condition that recognizes only `main` can skip every test on the temporary queue branch.

## Keep changed-file logic honest

Merge groups can contain several pull requests. A changed-file filter must compare the correct base and head, not assume the build represents one contributor's latest commit.

Inspect Buildkite's **Use base commit when making `if_changed` comparisons** option for merge queues. The tutorial describes this narrower comparison as safe when GitHub's **Require all queue entries to pass required checks** setting is enabled; do not enable it without verifying that prerequisite. Test changes that affect shared dependencies as well as changes confined to one service. A required aggregate status that passes because every meaningful step was accidentally filtered out is a broken quality gate.

Do not rely on commit skip markers to satisfy merge queues. Buildkite does not support skipping an entire native merge-queue build because GitHub expects a status for the merge-group commit.

## Exercise invalidation and failure

Add two test pull requests to the queue. Confirm each native build checks out its recorded commit and publishes the required context there. Make one test fail and observe the queue behavior under your selected GitHub policy.

Enable cancellation of builds for destroyed merge groups if you want obsolete speculative work stopped. Queue recomposition creates new commits and therefore new checks; an old green status cannot validate a replacement group.

The final acceptance test is a pull request that enters the queue, receives the required result on its speculative commit, and merges through the intended rule without manual bypass.
