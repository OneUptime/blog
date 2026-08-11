# Why Does “Run Pipeline” Spin Forever in Woodpecker? Add the `manual` Event and Check Forge Connectivity

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Woodpecker CI, CI/CD, Manual Pipelines, Troubleshooting, Git

Description: Fix a stalled manual Woodpecker run by allowing the manual event and tracing the server's access to the selected forge revision.

---

Woodpecker's **Run pipeline** action does not replay a push event. It creates a new pipeline whose event is `manual`. That distinction explains the most common failure: a workflow restricted to `push`, `pull_request`, or `tag` does not match the new event. A second class of failures occurs before scheduling, when the server cannot resolve the selected branch or fetch its configuration from the forge.

Current Woodpecker releases report more manual-run configuration errors than older versions did, so the exact UI symptom may be an error instead of an endless spinner. The diagnostic sequence is still the same: prove that at least one workflow accepts `manual`, then prove that the Woodpecker server can reach and authenticate to the forge.

## Manual Is Its Own Event

Woodpecker 3.x recognizes events including `push`, `pull_request`, `tag`, `release`, `deployment`, `cron`, and `manual`. Conditions compare the actual pipeline event; clicking a button does not pretend that the branch was just pushed.

Consider a workflow with this global condition:

~~~yaml
when:
  event: push
  branch: main

steps:
  - name: test
    image: node:24-alpine
    commands:
      - npm ci
      - npm test
~~~

It is eligible only for a push to `main`. Selecting `main` in **Run pipeline** changes the branch metadata, not the event, so the workflow remains excluded.

Allow both events explicitly:

~~~yaml
when:
  event: [push, manual]
  branch: main

steps:
  - name: test
    image: node:24-alpine
    commands:
      - npm ci
      - npm test
~~~

At workflow level, `event` and `branch` are combined with AND. The event list itself is an OR. The result is “a push or manual run, and the branch must be main.”

## Check Both Workflow-Level and Step-Level Filters

Woodpecker supports `when` at two levels:

- A global workflow condition determines whether the workflow is included in the pipeline at all.
- A step condition determines whether a step inside an included workflow runs.

Fixing only one level can produce confusing results. This workflow is created for a manual run, but its deploy step is still skipped:

~~~yaml
when:
  event: [push, manual]
  branch: main

steps:
  - name: build
    image: alpine:3.22
    commands:
      - ./scripts/build.sh

  - name: deploy
    image: alpine:3.22
    commands:
      - ./scripts/deploy.sh
    when:
      - event: push
        branch: main
~~~

If manual deployment is intended, add `manual` to the step:

~~~yaml
    when:
      - event: [push, manual]
        branch: main
~~~

If manual deployment is not intended, leave it excluded and make that policy obvious with a separate validation step. Do not broaden secret-bearing or production steps just to stop a spinner.

## Use a Dedicated Manual Workflow for Risky Operations

For release, recovery, or maintenance jobs, a separate workflow is easier to reason about than adding `manual` everywhere:

~~~yaml
when:
  event: manual
  branch: main

steps:
  - name: show-context
    image: alpine:3.22
    commands:
      - echo "event=$CI_PIPELINE_EVENT"
      - echo "branch=$CI_COMMIT_BRANCH"
      - echo "sha=$CI_COMMIT_SHA"

  - name: maintenance
    image: alpine:3.22
    commands:
      - ./scripts/maintenance.sh
    environment:
      MAINTENANCE_TOKEN:
        from_secret: maintenance_token
~~~

Place it in a directly configured workflow file such as `.woodpecker/maintenance.yaml`. Protect the branch at the forge, limit the secret to the necessary event and image, and use Woodpecker's approval controls where appropriate. Manual means user-triggered; it does not inherently mean approved or safe.

## Why the Forge Still Matters

A manual event does not arrive through a forge webhook, but Woodpecker still depends on the forge. The server must identify the selected repository and branch, resolve a commit, fetch the workflow configuration at that revision, and provide clone credentials. The clone step later needs network access to the repository too.

This creates two different connectivity paths:

1. **Server to forge API and repository configuration**: needed to construct the pipeline.
2. **Agent or clone container to forge Git endpoint**: needed after a workflow is scheduled.

An endless UI request with no pipeline number usually points to the first path. A pipeline with a failed clone step points to the second.

## Trace a Stalled Button Click

Open browser developer tools before clicking **Run pipeline**. Inspect the request that creates the pipeline:

- A long pending request suggests that the server is waiting on the forge or another upstream.
- `401` or `403` suggests the user's forge token or permissions are no longer sufficient.
- `404` can mean a stale repository identity, renamed repository, or wrong reverse-proxy prefix.
- `409` or a clear configuration response should be read literally rather than treated as a network timeout.
- `5xx` requires correlation with Woodpecker server logs.

Record the request time, repository ID, selected branch, user, and response body. Then inspect Woodpecker server logs for the same timestamp. Temporarily use `WOODPECKER_LOG_LEVEL=debug` only if normal logs do not identify the failing forge call, and return to the normal level after diagnosis.

## Test Connectivity from the Correct Network Namespace

A forge URL that works in a workstation browser may fail from the Woodpecker server container. Execute read-only network checks from the server's network:

~~~bash
getent hosts git.example.com
curl --fail --show-error --head https://git.example.com/
openssl s_client -connect git.example.com:443 -servername git.example.com </dev/null
~~~

Check:

- internal versus public DNS answers;
- outbound firewall and proxy policy;
- a private certificate authority mounted into the server;
- certificate names and expiration;
- reverse-proxy routes for the forge API;
- the configured forge base URL, including scheme and port.

Avoid “fixing” TLS by setting a forge `*_SKIP_VERIFY` option except as a short diagnostic in an isolated environment. Install the correct CA and keep verification enabled.

For Gitea or Forgejo in containers on the same host, server and agent connectivity can differ. The official configuration guidance explains the Docker network needed for cloning, while the server still needs its own route to the forge API. Test both components separately.

## Refresh Repository and OAuth State

Woodpecker authorizes users through the forge. Tokens can expire, be revoked, lose scopes, or point at an old repository identity after a rename or transfer.

Use this recovery sequence:

1. Sign out and back in to refresh the user session where supported.
2. Confirm the OAuth application callback URL and client credentials are correct.
3. Synchronize the repository list.
4. Confirm the user still has push access; Woodpecker requires at least push access for manual operational actions such as cron management.
5. Open the repository through its current Woodpecker entry rather than an old bookmark.
6. Repair the repository hook if push events also fail, although a hook repair alone does not fix server-to-forge API connectivity.

If only one branch fails, verify that it still exists and that its name is passed exactly. If every branch in one repository fails, suspect repository permissions or identity. If every repository on one forge fails, suspect the forge configuration, OAuth application, DNS, or TLS.

## Confirm Configuration at the Selected Revision

The manual run uses the configuration present at the selected commit. Adding `manual` on a feature branch does not enable a manual run of `main` until that change is on `main`.

Check the remote branch:

~~~bash
git fetch origin main
git show origin/main:.woodpecker.yaml
git ls-tree -r --name-only origin/main | grep '^.woodpecker/'
~~~

If Project settings contains a custom pipeline path, inspect that exact path. With the default empty setting, Woodpecker looks in the workflow directory and then the two root files documented by Project settings.

Also lint with the same major/minor CLI version as the server. A 2.x workflow that still uses `secrets:` or list-form `environment` will not become valid merely because the event filter now includes `manual`.

## Distinguish a Stalled Creation from a Pending Workflow

Once a pipeline number and workflow appear, forge configuration discovery has completed. A `pending` workflow is waiting for a matching agent or concurrency slot. Check:

- workflow `labels` versus `WOODPECKER_AGENT_LABELS`;
- platform and backend labels;
- whether the agent is connected;
- `WOODPECKER_MAX_WORKFLOWS`;
- workflow concurrency limits;
- approval requirements.

Do not keep editing `event: manual` after the workflow is visibly queued. At that point, the condition already matched.

## Minimal Diagnostic Workflow

Commit this temporary workflow to the branch you select in the UI:

~~~yaml
when:
  event: manual

steps:
  - name: manual-context
    image: alpine:3.22
    commands:
      - env | sort | grep '^CI_'
~~~

If it runs, the manual-event and forge-resolution path are healthy, and the fault lies in filters or dependencies in the original workflow. Remove or restrict this diagnostic workflow after testing because environment listings can reveal non-secret operational metadata.

## Official Documentation

- [Woodpecker: Workflow events and conditions](https://woodpecker-ci.org/docs/usage/workflow-syntax)
- [Woodpecker: Built-in environment variables](https://woodpecker-ci.org/docs/usage/environment)
- [Woodpecker: Project settings and pipeline path](https://woodpecker-ci.org/docs/usage/project-settings)
- [Woodpecker: Forge configuration overview](https://woodpecker-ci.org/docs/administration/configuration/forges/overview)
- [Woodpecker: Server configuration](https://woodpecker-ci.org/docs/administration/configuration/server)
- [Woodpecker releases](https://github.com/woodpecker-ci/woodpecker/releases)

## Conclusion

Treat **Run pipeline** as a new `manual` event, not a replay of `push`. First ensure a workflow at the selected revision accepts that event, including any relevant step filters. If pipeline creation still stalls, trace the Woodpecker server's DNS, TLS, OAuth, and API access to the forge. Once a workflow is visible as pending, stop debugging the button and move to agent scheduling.
