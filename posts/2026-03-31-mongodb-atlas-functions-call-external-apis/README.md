# How to Call External APIs from Atlas Functions in MongoDB

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Functions, REST API

Description: Use context.http in MongoDB Atlas Functions to call external REST APIs, handle authentication, process responses, and store results back in your Atlas collections.

---

Atlas Functions can call external HTTP APIs using the built-in `context.http` module. This enables integrations with payment processors, notification services, CRMs, and any REST API without requiring a separate server.

## Basic HTTP GET Request

```javascript
exports = async function() {
  const response = await context.http.get({
    url: "https://api.github.com/repos/mongodb/mongo/releases/latest",
    headers: {
      "Accept": ["application/vnd.github.v3+json"],
      "User-Agent": ["Atlas-Function"]
    }
  });

  if (response.statusCode !== 200) {
    throw new Error(`GitHub API error: ${response.statusCode}`);
  }

  const release = EJSON.parse(response.body.text());
  return { version: release.tag_name, publishedAt: release.published_at };
};
```

## POST Request with Form-Encoded Body

```javascript
exports = async function(orderDocument) {
  const response = await context.http.post({
    url: "https://api.stripe.com/v1/payment_intents",
    headers: {
      "Authorization": [`Bearer ${context.values.get("STRIPE_SECRET_KEY")}`],
      "Content-Type": ["application/x-www-form-urlencoded"]
    },
    body: `amount=${orderDocument.totalCents}&currency=usd&automatic_payment_methods[enabled]=true`
  });

  if (response.statusCode !== 200) {
    const error = EJSON.parse(response.body.text());
    throw new Error(`Stripe error: ${error.error.message}`);
  }

  return EJSON.parse(response.body.text());
};
```

## Storing API Keys Securely

Never hardcode API keys in function code. Store them as Atlas Values/Secrets:

1. In Atlas UI - App Services - Values & Secrets - Create New Secret
2. Name it `STRIPE_SECRET_KEY` and set the value
3. Create a Value that links to the secret

Access in the function:

```javascript
const apiKey = context.values.get("STRIPE_SECRET_KEY");
```

## Sending a Slack Notification

```javascript
exports = async function(message) {
  const webhookUrl = context.values.get("SLACK_WEBHOOK_URL");

  const response = await context.http.post({
    url: webhookUrl,
    headers: {
      "Content-Type": ["application/json"]
    },
    body: JSON.stringify({
      text: message,
      username: "Atlas Bot",
      icon_emoji: ":database:"
    })
  });

  if (response.statusCode !== 200) {
    throw new Error(`Slack webhook failed: ${response.statusCode}`);
  }

  return { notified: true };
};
```

## Sending an HTTP Request to a Webhook on Database Change

Combine with a database trigger to notify external services on every new order:

```javascript
// Trigger function: notifyExternalOnNewOrder
exports = async function(changeEvent) {
  if (changeEvent.operationType !== "insert") return;

  const order = changeEvent.fullDocument;

  const response = await context.http.post({
    url: context.values.get("FULFILLMENT_WEBHOOK_URL"),
    headers: {
      "Content-Type": ["application/json"],
      "X-Signature": [context.values.get("WEBHOOK_SECRET")]
    },
    body: JSON.stringify({
      event: "order.created",
      orderId: order._id.toString(),
      customerId: order.customerId,
      items: order.items,
      total: order.total
    })
  });

  const db = context.services.get("mongodb-atlas").db("production");
  await db.collection("orders").updateOne(
    { _id: order._id },
    {
      $set: {
        webhookSent: response.statusCode === 200,
        webhookSentAt: new Date(),
        webhookStatusCode: response.statusCode
      }
    }
  );
};
```

## Making Multiple Concurrent API Calls

Use `Promise.all` for parallel requests:

```javascript
exports = async function(userId) {
  const [profileResponse, permissionsResponse, billingResponse] = await Promise.all([
    context.http.get({ url: `https://api.crm.com/users/${userId}` }),
    context.http.get({ url: `https://api.auth.com/users/${userId}/permissions` }),
    context.http.get({ url: `https://api.billing.com/customers/${userId}` })
  ]);

  return {
    profile: EJSON.parse(profileResponse.body.text()),
    permissions: EJSON.parse(permissionsResponse.body.text()),
    billing: EJSON.parse(billingResponse.body.text())
  };
};
```

## Handling Rate Limits

```javascript
async function callWithBackoff(url, headers, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await context.http.get({ url, headers });

    if (response.statusCode === 429) {
      const retryAfter = parseInt(response.headers["Retry-After"]?.[0] || "1") * 1000;
      console.warn(`Rate limited. Waiting ${retryAfter}ms`);
      await new Promise(r => setTimeout(r, retryAfter));
      continue;
    }

    return response;
  }
  throw new Error("Max retry attempts exceeded");
}
```

## Summary

`context.http` in Atlas Functions supports GET, POST, PUT, PATCH, and DELETE requests with custom headers and bodies. Store API credentials as Atlas Secrets accessed via `context.values.get()`. Use `Promise.all` for parallel requests to reduce latency, implement retry logic with backoff for rate-limited APIs, and record webhook delivery status back in MongoDB documents for observability.
