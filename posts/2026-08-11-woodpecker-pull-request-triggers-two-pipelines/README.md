# Why One Pull Request Triggers Two Woodpecker Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, CI/CD, Pull Requests, Webhook, Workflow Design

Description: Prevent duplicate Woodpecker work by assigning push and pull-request events to distinct workflow responsibilities.

---

When a contributor pushes to a branch that already has an open pull request, the forge can emit two legitimate notifications: a branch `push` and a `pull_request` synchronization event. Woodpecker represents those as different pipeline events. If the same workflow accepts both without a deliberate division of responsibility, one commit can be tested twice.

This is usually not a duplicated webhook. It is one Git action producing two event contexts. Before deleting hooks or enabling cancellation, inspect the event shown on each Woodpecker pipeline. If one says `push` and the other says `pull_request`, event filtering is the correct fix.

## Understand the Two Contexts

A push pipeline answers, “What happened to this branch when commits were pushed?” A pull-request pipeline answers, “What is the proposed change against its target branch?”

They can refer to the same source commit but carry different metadata:

- `CI_PIPELINE_EVENT` is `push` or `pull_request`.
- `CI_COMMIT_BRANCH` is the pushed branch for a push; for a pull request it equals the target branch.
- `CI_COMMIT_SOURCE_BRANCH` is set for a pull request and names its source branch.
- `CI_COMMIT_TARGET_BRANCH` is set for a pull request and names its target.
- Changed-file calculation for a pull request covers all files changed by the pull request, not merely the most recent pushed commit.

Those differences are useful. They are also why treating both events as interchangeable eventually creates a branch-filter or path-filter surprise.

## Confirm That It Is Event Duplication

Open both pipelines and record:

1. event;
2. commit SHA;
3. source and target branch;
4. workflow names;
5. pipeline creation times, then correlate them with delivery IDs and timestamps in the forge's webhook-delivery log if needed.

If the events differ, Woodpecker is responding to two intentional forge events. If both are `push` or both are `pull_request`, inspect the forge for duplicate Woodpecker hooks, webhook retries or redeliveries where the forge supports them, or multiple Woodpecker instances subscribed to the repository. Do not apply event filters to conceal a truly duplicated hook.

Fork pull requests behave differently from same-repository branches. A push to a fork is not necessarily an event for the upstream Woodpecker repository. Diagnose using the actual pipeline metadata rather than assuming every pull request will be doubled.

## Pattern 1: Pull Requests Validate, Default-Branch Pushes Publish

A common policy is:

- pull requests run lint and tests;
- pushes to the default branch run packaging, publishing, or deployment;
- feature-branch push pipelines are unnecessary because the open pull request already validates them.

In a single workflow:

On Woodpecker 3.x, the instance administrator must allow this exact plugin image with `WOODPECKER_PLUGINS_PRIVILEGED=woodpeckerci/plugin-docker-buildx:6.1.1`; the allowlist runs the plugin in privileged mode.

~~~yaml
steps:
  - name: test
    image: golang:1.26
    commands:
      - go test ./...
    when:
      - event: pull_request

  - name: publish
    image: woodpeckerci/plugin-docker-buildx:6.1.1
    settings:
      repo: registry.example.com/acme/api
      registry: registry.example.com
      tags: latest
      username:
        from_secret: registry_username
      password:
        from_secret: registry_password
    when:
      - event: push
        branch: main
~~~

This stops the steps from doing duplicate work, but the workflow itself can still be created and cloned for both events. Multiple workflow files with global conditions are cleaner and save agent work.

`.woodpecker/pr.yaml`:

~~~yaml
when:
  event: pull_request
  branch: main

steps:
  - name: test
    image: golang:1.26
    commands:
      - go test ./...
~~~

`.woodpecker/main.yaml`:

~~~yaml
when:
  event: push
  branch: main

steps:
  - name: publish
    image: woodpeckerci/plugin-docker-buildx:6.1.1
    settings:
      repo: registry.example.com/acme/api
      registry: registry.example.com
      tags: latest
      username:
        from_secret: registry_username
      password:
        from_secret: registry_password
~~~

The global conditions prevent irrelevant workflows from entering the pipeline.

## Branch Means Target Branch on a Pull Request

This condition is frequently misread:

~~~yaml
when:
  event: pull_request
  branch: main
~~~

For a pull request, it means “the target branch is `main`.” It does not mean the contributor's source branch is named `main`.

To select a particular source branch, use `evaluate` with the pull-request source variable:

~~~yaml
when:
  evaluate: 'CI_PIPELINE_EVENT == "pull_request" && CI_COMMIT_SOURCE_BRANCH == "release/next"'
~~~

Use the current expression-language documentation when writing more complex expressions, and test them with representative metadata. Keep normal event and target-branch checks in ordinary keys when possible; they are easier to read.

## Pattern 2: Keep Push Feedback for Branches Without Pull Requests

Woodpecker's standard filters do not express “run push only if this branch has no open pull request” as a built-in condition. The push webhook and pull-request webhook are evaluated independently. You have three practical choices:

1. Accept duplicate lightweight validation while keeping push feedback on every branch.
2. Limit push validation to named long-lived branches such as `main` and `develop`.
3. Query the forge from a custom step or configuration extension, accepting additional credentials, latency, and complexity.

The second is generally simplest:

~~~yaml
when:
  - event: pull_request
  - event: push
    branch: [main, develop]
~~~

That list form is appropriate for a step-level condition: either the pull-request entry matches, or the push-and-branch entry matches. At workflow level, split the policy into separate files so each has a simple global map.

Do not inject a broad forge API token merely to save a few test minutes unless the cost and security tradeoff are justified.

## Path Filters Can Produce Different Results

For a `push`, changed paths are associated with the push event. For a `pull_request`, Woodpecker's documented behavior considers all files changed by the pull request. Therefore a service workflow can run on the pull-request event even if the latest pushed commit only changed documentation, because an earlier commit in that pull request changed the service.

Example:

~~~yaml
when:
  event: pull_request
  path:
    include:
      - services/billing/**
      - shared/**
~~~

That behavior is usually desirable: the pull request still contains a billing change. It also means a push path result and a pull-request path result should not be expected to match exactly.

## Protect Secrets by Event

By default, Woodpecker secrets are not exposed to pull-request events. That is a safety boundary, especially for forks. Do not enable `pull_request` on a publishing secret merely because a duplicated PR pipeline fails while the push pipeline succeeds.

Instead:

- keep validation steps free of deployment credentials;
- restrict publish steps to `push` on a protected branch or to an intentional release event;
- restrict secrets to the minimum events and plugin images;
- use approval requirements for forked repositories.

The two-pipeline symptom can reveal a good security property: the pull-request context is deliberately less trusted than the post-merge push.

## Why “Cancel Previous Pipelines” Does Not Deduplicate Events

Project settings can cancel previous pipelines for selected events and contexts. This is useful when a contributor pushes several revisions quickly. It prevents older work from consuming capacity after a newer revision supersedes it.

It is not a replacement for separating `push` and `pull_request`. They are distinct events and contexts; cancellation may remove an older push in favor of a newer push but still leave the pull-request pipeline for the same SHA. Use cancellation for staleness, event filters for responsibility.

## Repository Hook Settings Versus Workflow Conditions

Project settings can disable pull-request handling for the repository. Workflow conditions are more precise and live in version control.

Prefer workflow conditions when:

- some workflows need push and others need pull requests;
- the policy should be reviewed with code;
- different target branches have different rules.

Use the project-level pull-request setting only when the entire repository has no use for pull-request pipelines. If pull requests are disabled there, no YAML condition can bring them back.

## A Practical Event Matrix

Write the desired policy before editing YAML:

| Responsibility | Event | Branch meaning | Secrets |
| --- | --- | --- | --- |
| PR lint and test | `pull_request` | target branch | none |
| Main packaging | `push` | pushed branch `main` | registry push |
| Release publish | `tag` or `release` | `tag`: branch filter ignored; `release`: release target/ref, forge-dependent | release credentials |
| Operator task | `manual` | selected branch | narrowly scoped |

Then give each responsibility a workflow file and a global `when`. This produces understandable forge statuses and avoids paying for a clone just to skip every step.

## Verify the Fix

Push a new commit to a same-repository branch with an open pull request. Expect two forge events but only the workflows assigned to each:

~~~yaml
# PR workflow
when:
  event: pull_request
  branch: main
~~~

~~~yaml
# Post-merge workflow
when:
  event: push
  branch: main
~~~

Confirm that the pull request runs validation once, the feature-branch push does not publish, and the merge push to `main` runs the publishing workflow once. Also test a fork pull request before enabling any secret for PR events.

## Official Documentation

- [Woodpecker: Workflow events and conditional execution](https://woodpecker-ci.org/docs/usage/workflow-syntax)
- [Woodpecker: Workflows and flow control](https://woodpecker-ci.org/docs/usage/workflows)
- [Woodpecker: Built-in pipeline and commit variables](https://woodpecker-ci.org/docs/usage/environment)
- [Woodpecker: Project event settings](https://woodpecker-ci.org/docs/usage/project-settings)
- [Woodpecker: Secret event filters](https://woodpecker-ci.org/docs/usage/secrets)
- [Woodpecker: Supported forge features](https://woodpecker-ci.org/docs/administration/configuration/forges/overview)

## Conclusion

A branch update with an open pull request can legitimately create both `push` and `pull_request` pipelines. Confirm the event pair, then assign validation to the pull-request context and post-merge or publishing work to protected-branch pushes. Put those rules at workflow level, preserve the stricter PR secret boundary, and use cancellation only for superseded runs-not as event deduplication.
