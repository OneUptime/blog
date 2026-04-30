# How to Configure Git Polling for Auto-Updates in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, GitOps, Git Polling, Auto-Update, Automation

Description: Learn how to configure Portainer to automatically poll a Git repository and redeploy stacks when changes are detected.

## What Is Git Polling?

Git polling is a pull-based update mechanism where Portainer periodically checks a Git repository for new commits. When it detects a change on the configured Git reference (typically a branch), it automatically redeploys the stack.

This is useful when:
- The Git repository host cannot send webhooks to Portainer.
- Portainer is behind a firewall with no inbound webhook access.
- You want simple setup without configuring webhook secrets.

## Enabling Polling When Creating a Stack

1. Create a stack from a Git repository (see deploy from Git guide).
2. Under **GitOps updates**, turn it on.
3. Under **Mechanism**, select **Polling**.
4. Set the **Fetch interval** (minimum: `1m`; for example `5m` or `15m`).
5. Click **Deploy the stack**.

## Enabling Polling on an Existing Stack

1. Navigate to **Stacks** and click the stack name.
2. Click **Edit Git settings**.
3. Under **GitOps updates**, turn it on.
4. Select **Polling** as the **Mechanism** and set the **Fetch interval**.
5. Click **Save settings**.

## Polling Interval Recommendations

| Use Case | Recommended Interval |
|----------|---------------------|
| Development/staging | 1-2 minutes |
| Production (non-critical) | 5-10 minutes |
| Production (stable) | 15-30 minutes |

Shorter intervals mean faster auto-deploys but more API calls to your Git host.

## How Portainer Detects Changes

Portainer compares the deployed commit hash stored in its database with the latest commit on the configured Git reference:

```bash
# Conceptually, Portainer does something like this:

DEPLOYED_SHA="<hash stored by Portainer>"
LATEST_SHA=$(git ls-remote origin refs/heads/main | cut -f1)

if [ "$DEPLOYED_SHA" != "$LATEST_SHA" ]; then
  # Pull and redeploy the stack
fi
```

## Viewing Poll Status in Portainer

After enabling polling, the stack detail page shows:
- **Repo / Ref / File**: The Git repository URL, reference, and Compose file path.
- **Commit**: The deployed Git SHA.
- **Auto-update / Interval**: Whether auto-update is enabled and the polling interval.

## Forcing an Immediate Update

To redeploy without waiting for the next poll:

1. Go to the stack in Portainer.
2. Click **Pull and redeploy**.

Or via API:

```bash
# Force an immediate git pull and redeploy
curl -X PUT "${PORTAINER_URL}/api/stacks/${STACK_ID}/git/redeploy?endpointId=${ENDPOINT_ID}" \
  -H "X-API-Key: ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"RepullImageAndRedeploy": true, "Prune": false}'
```

## Best Practices

- **Use specific branches** (`main`, `production`) rather than tags for polling, since tag polling requires new tags for each deployment.
- **Combine with image tags**: Have your CI pipeline update the image tag in the Compose file and commit to Git - Portainer will detect the change and redeploy.
- **Monitor poll logs**: Check stack events in Portainer to confirm polling is working.

## Polling vs. Webhooks

| Feature | Polling | Webhooks |
|---------|---------|----------|
| Setup | Simple | Requires Git webhook config |
| Latency | Up to poll interval | Near-instant |
| Works without inbound access to Portainer | Yes | No |
| API calls to Git | Regular | Only on push |

## Conclusion

Git polling in Portainer provides a simple pull-based auto-update mechanism that works well when Portainer cannot receive inbound webhooks. Set a polling interval appropriate to your deployment cadence, and combine it with commit-based image tags for a clean GitOps workflow.
