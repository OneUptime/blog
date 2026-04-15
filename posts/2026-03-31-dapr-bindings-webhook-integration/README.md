# How to Use Dapr Bindings for Webhook Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Webhook, HTTP, Integration

Description: Learn how to use the Dapr HTTP output binding and input bindings to send and receive webhook events, enabling event-driven integrations with third-party services.

---

## Dapr Bindings and Webhooks

Webhooks are HTTP callbacks that external systems use to push events to your service. Dapr bindings work well in this context: the HTTP output binding lets you send webhook payloads to external URLs, while Dapr's input bindings can receive events from systems like GitHub, Stripe, or Slack.

## Sending Webhooks with the HTTP Output Binding

Configure the HTTP binding to point to an external webhook URL:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: slack-notifier
spec:
  type: bindings.http
  version: v1
  metadata:
    - name: url
      value: "https://hooks.slack.com/services/T00000/B00000/XXXXXXXX"
    - name: MTLSRootCA
      value: ""
```

Send a message to the webhook:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function notifySlack(message, channel) {
  await client.binding.send("slack-notifier", "post", {
    text: message,
    channel,
    username: "DeployBot",
    icon_emoji: ":rocket:",
  });
}

await notifySlack("Deployment to production completed!", "#deployments");
```

## Sending to Multiple Webhook Destinations

Define one HTTP binding per destination or make the URL configurable via metadata:

```javascript
async function sendWebhook(bindingName, payload, headers = {}) {
  try {
    await client.binding.send(bindingName, "post", payload, {
      "Content-Type": "application/json",
      ...headers,
    });
    console.log(`Webhook sent to ${bindingName}`);
  } catch (err) {
    console.error(`Webhook to ${bindingName} failed:`, err.message);
    throw err;
  }
}

// Send to multiple destinations in parallel
await Promise.all([
  sendWebhook("slack-notifier", slackPayload),
  sendWebhook("teams-notifier", teamsPayload),
  sendWebhook("pagerduty-notifier", pdPayload),
]);
```

## Receiving Webhooks via HTTP Endpoints

Your Dapr application can receive webhooks by exposing HTTP endpoints directly. Note that the `bindings.http` component is output-only and cannot act as an input binding. To receive webhooks, define a route handler for the webhook path:

```javascript
const express = require("express");
const app = express();
app.use(express.json());

// Dapr routes incoming binding events to POST /{binding-name}
app.post("/github-events", async (req, res) => {
  const event = req.body;
  const eventType = req.headers["x-github-event"];
  const signature = req.headers["x-hub-signature-256"];

  // Verify the webhook signature
  if (!verifyGitHubSignature(signature, JSON.stringify(event))) {
    return res.status(401).send("Invalid signature");
  }

  switch (eventType) {
    case "push":
      await handlePushEvent(event);
      break;
    case "pull_request":
      await handlePREvent(event);
      break;
    default:
      console.log(`Unhandled GitHub event: ${eventType}`);
  }

  res.status(200).send("OK");
});

function verifyGitHubSignature(signature, body) {
  const crypto = require("crypto");
  const hmac = crypto.createHmac("sha256", process.env.GITHUB_WEBHOOK_SECRET);
  const expected = "sha256=" + hmac.update(body).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
```

## Retry and Timeout Configuration

Webhook delivery often requires retry logic. Apply a Dapr Resiliency policy:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: webhook-resiliency
spec:
  policies:
    retries:
      webhook-retry:
        policy: exponential
        maxInterval: 60s
        maxRetries: 3
    timeouts:
      webhook-timeout: 5s
  targets:
    components:
      slack-notifier:
        outbound:
          retry: webhook-retry
          timeout: webhook-timeout
```

## Summary

Dapr bindings simplify webhook integration by providing a consistent interface for both sending events to external services via the HTTP output binding and receiving events through input binding handlers. Combined with resiliency policies and proper signature verification, this approach builds reliable webhook pipelines with minimal boilerplate code.
