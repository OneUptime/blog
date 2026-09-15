# Drone Webhooks Arrive but No Build Starts: Check Repository Activation, Signatures, and Trigger Filters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Drone, CI/CD, Troubleshooting, Security, DevOps

Description: Trace incoming Git webhooks through Drone repository activation, authentication, configuration lookup, and pipeline trigger evaluation.

An HTTP success in a Git provider's webhook history does not guarantee a runnable Drone pipeline was created. A request can reach the endpoint but describe an event that is ignored, a disabled repository, or a configuration whose triggers match nothing.

Debug one delivery from end to end. Record its delivery identifier, event type, repository, commit, ref, timestamp, response code, and response body. Compare those details with Drone server logs for the same interval.

## Confirm the request reached the intended Drone instance

Inspect the webhook destination, including scheme, hostname, and path. A stale endpoint after a server migration can send valid hooks to the wrong instance. A reverse proxy can also return its own response without forwarding the request successfully.

Check the upstream destination in proxy logs and then Drone's logs. Do not log secret headers or full private-repository payloads into a public debugging system. Keep a clear distinction between an absent build and a created build whose pipeline is pending; the latter usually requires a scheduling investigation.

## Check repository activation and configuration lookup

Drone's enable operation adds a repository webhook and requires repository administrator privileges. Confirm the exact repository is enabled in the instance receiving the delivery, particularly after a rename, transfer, or migration. [Drone repository setup](https://docs.drone.io/quickstart/docker/)

With an authenticated Drone CLI, inspect the repository:

```bash
drone repo info acme/payments
```

Compare the configured pipeline path with the file committed for the event. The usual path is `.drone.yml`, but Drone supports a customized configuration path. A pipeline file present only in your working tree cannot be fetched for a pushed commit. Also check whether repository settings ignore pull requests or forks. [Drone repository configuration options](https://docs.drone.io/cli/repo/drone-repo-update/)

If the repository's managed webhook is missing, Drone provides:

```bash
drone repo repair acme/payments
```

This recreates repository webhooks. Inspect the provider's hook list first and afterward, especially if someone also installed a manual hook, so a repair does not leave an unintended duplicate route. [Drone webhook repair](https://docs.drone.io/cli/repo/drone-repo-repair/)

## Match authentication to the Git provider

Incoming Git-provider hooks and Drone's outbound system webhooks are different mechanisms. `DRONE_WEBHOOK_SECRET` belongs to outbound system webhook signing; changing it is not a general repair for incoming Git events. [Drone system webhooks](https://docs.drone.io/webhooks/overview/)

Inspect the authentication expected by your installed Drone provider integration:

- GitHub signs the raw request body and documents `X-Hub-Signature-256`. A proxy that changes the body can invalidate verification. [GitHub delivery validation](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- Gitea documents `X-Gitea-Signature` as a hex HMAC-SHA256 digest and also sends compatibility headers. Check the secret on the particular managed hook. [Gitea webhooks](https://docs.gitea.com/usage/repository/webhooks)
- GitLab supports the existing `X-Gitlab-Token` mechanism and, in newer releases, signing-token headers. Do not switch authentication modes without confirming your Drone integration understands the selected mode. [GitLab webhooks](https://docs.gitlab.com/user/project/integrations/webhooks/)

Check for missing headers, mismatched managed-hook configuration, and proxy modifications. Repair the integration instead of disabling webhook authentication.

## Evaluate the actual event against every trigger

For example, this pipeline admits only push events to `main`:

```yaml
kind: pipeline
type: docker
name: push-check

trigger:
  event:
    - push
  branch:
    - main

steps:
  - name: check
    image: alpine:3
    commands:
      - echo "Push pipeline selected"
```

A pull request targeting `main` still fails the `event` filter. A tag also does not satisfy this configuration. Drone combines different trigger categories with AND, evaluates the target branch for pull requests, and does not supply a branch association for tag triggers. Patterns are globs, not regular expressions. [Drone pipeline triggers](https://docs.drone.io/pipeline/docker/syntax/trigger/)

Check every YAML document in a multi-pipeline configuration. A step's `when` block cannot make an excluded pipeline run. Also inspect the commit message for a CI skip directive; Drone documents exceptions for tags, promotions, and manual runs. [Drone skip directives](https://docs.drone.io/pipeline/skipping/)

## Verify with a controlled event

Use a non-deploying test repository or branch and generate one event the configuration explicitly admits. Correlate the provider delivery with a new Drone build and a selected pipeline. Then generate one excluded event and confirm the intended filtering.

A provider redelivery or manual rebuild may execute real deployment steps, so examine the pipeline before using either as a probe. Keep the successful delivery identifier and resulting build number in the incident record; that evidence distinguishes a repaired hook from a coincidental later build.
