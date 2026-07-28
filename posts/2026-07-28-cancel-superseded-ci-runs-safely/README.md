# How to Cancel Superseded CI Runs Without Canceling the Latest Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CI/CD, GitHub Action, GitLab CI, Deployment, Concurrency

Description: Scope cancellation by workflow and ref, keep deployment serialization separate, and add stale-candidate guards around external side effects.

---

Canceling an old lint or test run after a newer commit arrives is usually safe. Canceling a deployment halfway through traffic switching may not be.

Design two policies:

- supersession for read-only or reconstructible CI work;
- serialization and staleness checks for state-changing deployment work.

Do not apply one repository-wide cancellation key to both.

## Scope a GitHub Concurrency Group Precisely

For branch CI:

```yaml
name: Pull Request CI

on:
  pull_request:
  push:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Including `github.workflow` prevents a run in another workflow with the same ref from sharing the group. GitHub concurrency group names are repository-wide and case-insensitive; a key based only on `${{ github.ref }}` can make a documentation workflow cancel a release workflow.

The ref separates branches, tags, and pull-request merge refs. If using an event-specific value such as `github.head_ref`, provide a fallback for events where it is undefined.

GitHub's default concurrency behavior permits one running and one pending run per group, replacing an older pending run when a new one arrives. Current GitHub.com documentation also supports `queue: max` for queuing pending runs, but it cannot be combined with `cancel-in-progress: true`. GitHub Enterprise Server 3.20 does not list this option, so verify support before using it on GHES. Queued runs are processed FIFO by when they began waiting, not by workflow dispatch time, so exact dispatch ordering is not guaranteed. Choose supersession or an expanded queue deliberately.

## Keep Deployment Concurrency Separate

Use a job-level deployment group:

```yaml
jobs:
  deploy:
    if: ${{ github.ref == 'refs/heads/main' }}
    environment: production
    concurrency:
      group: production-deploy
      queue: max
    runs-on: ubuntu-latest
    steps:
      - run: ./scripts/deploy
```

This serializes production while allowing other jobs in the workflow to proceed. GitHub environments and concurrency are independent: using an environment does not automatically serialize all workflows that deploy to it. Every deployment path must use the agreed concurrency policy.

If the organization wants "latest production candidate wins," do not assume interruption is safe. Prefer leaving the active deployment to reach a known state, then skip obsolete queued candidates before they start. An expanded queue may deploy intermediate versions; a custom queue or deployment controller can coalesce them when that behavior is required.

## Add a Stale-Candidate Guard

Cancellation occurs at a moment in time. A runner or external deployment service may already have accepted work. Immediately before each irreversible boundary, ask whether the candidate is still authorized:

```bash
candidate_sha="$1"
latest_sha="$(./scripts/latest-approved-production-sha)"

if [ "$candidate_sha" != "$latest_sha" ]; then
  echo "candidate $candidate_sha is stale; latest is $latest_sha"
  exit 0
fi

./scripts/switch-production "$candidate_sha"
```

The source of "latest" must match policy: latest main commit, latest approved release, or latest artifact admitted by a deployment controller. A raw branch head is wrong when approvals intentionally allow an older candidate.

Check before provisioning and again before traffic or alias mutation. Use compare-and-swap or deployment-generation mechanisms offered by the target platform where possible.

## Make Side Effects Idempotent and Observable

A canceled shell process does not prove remote work stopped. Cloud APIs may continue an operation, package uploads may finish, and processes deliberately detached from the runner's process tree on a persistent self-hosted runner may outlive the job.

General engineering recommendations:

- attach a unique deployment ID and artifact digest to every operation;
- make repeated requests converge on the same desired state;
- poll remote operation state after cancellation;
- write a final deployment record only after verification;
- use atomic tag/alias or traffic switching when the platform supports it;
- design rollback or roll-forward for every interrupted phase.

These are system design requirements, not CI-provider guarantees.

## Preserve Release and Scheduled Runs

It is often useful to cancel pull-request or feature-branch work while retaining:

- tagged releases;
- protected release branches;
- default-branch qualification;
- scheduled full suites;
- production deployments.

GitHub permits an expression for `cancel-in-progress`. Keep the group stable, but make cancellation conditional. For example, retain tags and `main` while canceling other branch refs:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: ${{ github.ref_type == 'branch' && github.ref_name != 'main' }}
```

Validate expressions against every event the workflow handles. Undefined context values are a common source of surprising grouping.

## Configure GitLab Interruptibility

GitLab can auto-cancel redundant pipelines on the same branch. With the Auto-cancel redundant pipelines feature enabled, mark jobs that can be stopped and place deployment in a later stage:

```yaml
stages:
  - test
  - deploy

lint:
  stage: test
  interruptible: true
  script: ./scripts/lint

unit:
  stage: test
  interruptible: true
  script: ./scripts/unit

deploy:
  stage: deploy
  interruptible: false
  script: ./scripts/deploy
```

With the default `workflow:auto_cancel:on_new_commit: conservative` behavior, after a job with `interruptible: false` starts, the entire pipeline is no longer considered interruptible. In `on_new_commit: interruptible` mode, GitLab instead cancels only jobs marked `interruptible: true`. Place non-interruptible jobs after required validation so stale pipelines can be canceled while they are still doing safe CI work.

Review parent/child pipeline behavior and trigger strategies as part of the design; cancellation does not automatically mean every downstream external pipeline or service stopped.

## Do Not Fight Cancellation with Unconditional Jobs

On GitHub, `always()` returns true even when a workflow is canceled. It is useful for narrowly scoped diagnostic or cleanup steps, but a job using it can delay normal cancellation. GitHub recommends `!cancelled()` when work should run after success or failure but not after cancellation.

Use:

- `failure()` for failure-only evidence;
- `cancelled()` for exact cancellation cleanup;
- `!cancelled()` for aggregators;
- normal success semantics for deployment.

Put timeouts around cleanup and target exact resources derived from the run. Never let cancellation cleanup delete a newer deployment's namespace.

## Test with a Controlled Race

Create a non-production workflow whose jobs:

1. record candidate A;
2. wait at a controllable gate;
3. trigger candidate B in the same group;
4. observe A's cancellation and B's start;
5. verify only B can cross the simulated mutation boundary.

Also test:

- two different branches do not cancel each other;
- two different workflows on one branch do not collide;
- a release run is retained;
- an older pending run is replaced or queued according to policy;
- cancellation during artifact upload;
- external deployment work continuing after runner cancellation;
- cleanup from A cannot touch B.

Log the concurrency key, commit, artifact digest, deployment ID, and target environment in every run.

## A Safe Default Policy

For pull-request checks, group by workflow and ref and enable `cancel-in-progress`. For production, use a separate deployment concurrency group, serialize operations, keep active state transitions non-interruptible unless proven otherwise, and check candidate freshness before mutation.

That saves runner time without confusing "the job was canceled" with "the system was rolled back."

## Official Documentation

- [GitHub Actions concurrency control](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [GitHub Actions concurrency concepts](https://docs.github.com/en/actions/concepts/workflows-and-actions/concurrency)
- [Deploying with GitHub Actions](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments)
- [GitHub Actions expressions](https://docs.github.com/en/actions/reference/workflows-and-actions/expressions)
- [GitLab pipeline settings and auto-cancel](https://docs.gitlab.com/ci/pipelines/settings/)
- [GitLab `interruptible`](https://docs.gitlab.com/ci/yaml/#interruptible)
- [GitLab downstream pipelines](https://docs.gitlab.com/ci/pipelines/downstream_pipelines/)
