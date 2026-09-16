# How to Stop Duplicate Buildkite Runs from Overwriting GitHub Commit Status Links

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Buildkite, GitHub, CI/CD, Troubleshooting, Automation

Description: Identify duplicate status writers by commit and context, reduce duplicate Buildkite triggers, and preserve stable GitHub check ownership.

---

A GitHub status link suddenly points to another Buildkite build, although the commit has not changed. This usually means two builds published the same status context for the same repository commit. The later status becomes the visible result for that context, including its target URL.

Fix the ownership of the status. Renaming a Buildkite step label or rerunning the preferred build does not prevent the other writer from posting again.

## Identify the collision

A commit status has several relevant fields: commit SHA, context, state, target URL, and description. For this investigation, the effective identity is the repository, commit, and context. Branch names are not a separate namespace for commit statuses.

GitHub's [commit status API](https://docs.github.com/en/rest/commits/statuses) distinguishes the history of statuses from the combined view, which uses the latest status for each context. This explains how the link can change while the original Buildkite build remains intact.

If you use GitHub CLI, inspect the status history with a read-only request:

```bash
gh api --paginate repos/OWNER/REPOSITORY/commits/FULL_SHA/statuses \
  --jq '.[] | [.created_at, .context, .state, .target_url] | @tsv'
```

Replace the repository and full commit SHA. Keep the output scoped to these fields. Group records by context and compare the target URLs with the Buildkite build numbers. This reveals whether the writers are two builds in one pipeline or separate pipelines sharing a name.

## Trace why both builds exist

Compare the builds' creation source, branch, commit, pull-request metadata, and webhook delivery times. Common causes include a manual build plus a webhook build, overlapping API automation, multiple pipelines with the same repository, or duplicate webhook subscriptions.

Do not assume every push and pull-request event creates two builds. Current Buildkite GitHub integration handles same-repository pushes and pull-request synchronization together in documented ways, and has duplicate-prevention settings. Read the actual build sources before changing event subscriptions.

In the pipeline's GitHub settings, inspect **Skip when pull request has existing build for commit and branch**. It is intended to suppress a matching duplicate pull-request build and is enabled by default. The [GitHub integration reference](https://buildkite.com/docs/pipelines/source-control/github) describes the current behavior and related options.

Check external automation separately. A bot that calls the build API after every webhook can bypass your intention even when Buildkite's native webhook handling is configured correctly.

## Remove unintended duplicate writers

Decide which event should own the CI build. If the native integration already creates it, remove the redundant API trigger from the external workflow. If two pipelines intentionally serve different purposes, give their reported statuses different contexts.

For example, put this in the application pipeline's initial YAML settings:

```yaml
notify:
  - github_commit_status:
      context: "ci/application"

steps:
  - command: "buildkite-agent pipeline upload .buildkite/pipeline.yml"
```

A separate benchmark pipeline could publish `ci/benchmarks`. The names should describe different contracts, not merely create unique links. Keep a single clear owner for each required context.

Review the built-in pipeline status settings and custom `notify` blocks together. A pipeline can publish more than one status, and removing a custom context does not necessarily remove its built-in Buildkite context. Conversely, a custom context copied across repositories or pipelines can create an unexpected collision.

## Keep required checks stable

Do not append `BUILDKITE_BUILD_NUMBER` to a required status context as a deduplication fix. That creates a new name on every build, which cannot serve as a stable branch rule.

If both workflows are required, use two stable contexts and require both. If only one matters for merging, make that ownership explicit and keep the optional workflow's result separate.

The [GitHub rules documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets) describes required status checks and expected sources. Update the branch rule alongside a deliberate context rename so pull requests do not remain blocked waiting for the abandoned name.

Also distinguish GitHub commit statuses from GitHub check runs. They have different APIs and user interfaces. Diagnose the object your Buildkite integration actually publishes before applying a solution intended for the other type.

## Handle intentional rebuilds

An intentional rebuild of the same commit may reasonably replace the status link. Document whether the newest attempt is the authoritative result. That is different from two unrelated workflows repeatedly racing to publish the same context.

If different branch configurations test the same SHA differently, consider separate pipelines or contexts for those contracts. A commit appearing on two branches does not make its status contexts branch-specific.

## Verify without racing the next build

Create one ordinary push and confirm only the expected Buildkite build appears. Open or update its pull request and check whether another build is intentional. Inspect status history again and confirm each context points to its designated pipeline.

Finally, run a deliberate rebuild and verify the link changes in the expected way. The goal is predictable status ownership, so a link change tells reviewers about a new attempt rather than an accidental duplicate workflow.
