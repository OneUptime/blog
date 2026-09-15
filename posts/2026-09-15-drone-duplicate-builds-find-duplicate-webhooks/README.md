# Why Drone Starts the Same Build Twice-and How to Find Duplicate Webhooks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, Troubleshooting, DevOps, Continuous Integration

Description: Distinguish legitimate push and pull-request builds from duplicate Drone webhook deliveries and remove the redundant integration safely.

Two builds with the same commit SHA are not enough evidence of duplicate delivery. One commit can participate in a branch push, a pull-request update, a tag, or a manually restarted build. A single Drone build can also contain several pipelines.

Before deleting a webhook, establish what happened at each level: provider event, HTTP delivery, Drone build, and pipeline execution.

## Compare the two builds

Create a short incident table using the actual build details:

| Field | First build | Second build |
|---|---|---|
| Build number | 184 | 185 |
| Commit SHA | Same commit | Same commit |
| Event | `push` | `pull_request` |
| Ref | Branch ref | Provider pull-request ref |
| Created time | Recorded timestamp | Recorded timestamp |
| Triggering actor | Recorded actor | Recorded actor |

In this example, the events differ. Drone's trigger model allows both push and pull-request events, so the configuration may legitimately select work twice. Use provider payloads to confirm the relationship rather than inferring it from SHA equality. [Drone trigger reference](https://docs.drone.io/pipeline/docker/syntax/trigger/)

If there is one build number with two pipeline names, inspect the multiple YAML documents in `.drone.yml`. Independent pipelines can execute in parallel. That is configuration behavior, not proof of two webhook requests. [Drone multi-pipeline configuration](https://docs.drone.io/pipeline/configuration/)

## Inventory every route into the receiver

For the affected repository, inspect repository webhooks and any applicable organization, group, application, or system-level integrations. Record:

- Hook identifier and scope.
- Destination URL and whether an old hostname redirects to the new one.
- Subscribed event types and active state.
- Recent delivery timestamps, delivery identifiers, and responses.
- The owner or automation responsible for creating the hook.

Look for a Drone-managed hook plus a manually created hook, two integrations left after migration, or a relay that forwards the same event through two paths. Drone repository activation creates a webhook, and `drone repo repair` recreates managed hooks; inventory the result rather than assuming repeated repair operations are an appropriate diagnostic. [Drone activation](https://docs.drone.io/quickstart/docker/), [webhook repair](https://docs.drone.io/cli/repo/drone-repo-repair/)

Gitea documents delivery headers and hook scope information that can help identify where an event originated. GitLab documents separate event and webhook identifiers; preserve their labels instead of treating every UUID as the same kind of identifier. [Gitea webhook headers](https://docs.gitea.com/usage/repository/webhooks), [GitLab webhook headers](https://docs.gitlab.com/user/project/integrations/webhooks/)

## Correlate deliveries with server requests

Compare provider delivery history against reverse-proxy and Drone logs. Use a narrow time window and retain repository, event, ref, and commit alongside the delivery identifier.

Possible findings include:

| Evidence | Interpretation to investigate |
|---|---|
| Different hooks deliver the same event to Drone | Duplicate integration configuration |
| One provider delivery reaches the proxy twice | Relay or intermediary behavior |
| Same SHA arrives with different event types | Expected event overlap |
| No second provider delivery, but a second build exists | Manual restart, API caller, or another trigger source |
| One build contains multiple pipeline names | Multi-pipeline configuration |

Do not automatically blame provider retries. GitHub explicitly states it does **not** automatically redeliver failed deliveries; users or automation can request redelivery. Other providers have their own delivery behavior. [GitHub redelivery documentation](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/redelivering-webhooks)

## Apply the fix that matches the evidence

For an actual duplicate hook, retain the intended integration and disable the redundant one after confirming its owner and scope. Prefer a reversible disable during verification where the provider supports it. Do not remove an organization hook that serves other repositories merely because it appears in the investigation.

For event overlap, choose a deliberate CI policy. This policy runs pull-request checks targeting `main` and pushes only to `main`, using two separate pipeline documents:

```yaml
kind: pipeline
type: docker
name: pull-request-check
trigger:
  event: [pull_request]
  branch: [main]
steps:
  - name: test
    image: node:24
    commands:
      - npm ci
      - npm test
---
kind: pipeline
type: docker
name: main-check
trigger:
  event: [push]
  branch: [main]
steps:
  - name: test
    image: node:24
    commands:
      - npm ci
      - npm test
```

The example assumes a committed npm lockfile and a test script. It intentionally stops testing direct pushes to feature branches that have no pull request, so adopt it only if that matches your workflow.

Finish with a controlled push and pull-request update. Confirm the expected delivery count, build count, and pipeline names. Make publishing steps safe to retry using immutable artifact identifiers and deployment-side controls; fixing duplicate hooks does not eliminate legitimate rebuilds.
