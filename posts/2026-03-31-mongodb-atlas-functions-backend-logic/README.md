# How to Write Atlas Functions for Backend Logic

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Function, Serverless, Backend

Description: Learn how to write MongoDB Atlas Functions to run server-side JavaScript logic without managing infrastructure, triggered by HTTP endpoints, triggers, or directly from clients.

---

Atlas Functions are serverless JavaScript functions that run inside MongoDB Atlas App Services. They let you execute backend logic - data validation, transformation, third-party API calls - without provisioning servers.

## What Atlas Functions Can Do

- Query and write to MongoDB collections using the `context.services` API
- Call external HTTP services
- Access environment variables and secrets
- Be invoked from HTTP Endpoints, Triggers, Device Sync, or client SDKs

## Write Your First Function

In the Atlas UI, navigate to **App Services > Functions** and click **Create New Function**. Write the function body in JavaScript:

```javascript
exports = async function(payload) {
  const db = context.services.get("mongodb-atlas").db("myApp")
  const users = db.collection("users")

  const { userId, email } = payload

  // Validate input
  if (!userId || !email) {
    throw new Error("userId and email are required")
  }

  // Update user profile
  const result = await users.updateOne(
    { _id: new BSON.ObjectId(userId) },
    { $set: { email: email, updatedAt: new Date() } }
  )

  return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }
}
```

## Call Another Service from a Function

Atlas Functions can make HTTP requests to external APIs:

```javascript
exports = async function(orderId) {
  // Call an external fulfillment API
  const response = await context.http.post({
    url: "https://api.fulfillment.example.com/orders",
    headers: { "Authorization": [`Bearer ${context.values.get("FULFILLMENT_API_KEY")}`] },
    body: JSON.stringify({ orderId })
  })

  if (response.statusCode !== 200) {
    throw new Error(`Fulfillment API error: ${response.statusCode}`)
  }

  return EJSON.parse(response.body.text())
}
```

Store the API key as a Secret in App Services and reference it with `context.values.get()`.

## Use Functions as HTTP Endpoints

Expose a Function as an HTTPS endpoint:

1. Go to **App Services > HTTPS Endpoints**
2. Create a new endpoint, select your function, and choose HTTP method (POST, GET, etc.)
3. Configure authentication (API key, JWT, or anonymous)

The generated URL can be called from any HTTP client:

```bash
curl -X POST https://us-east-1.aws.data.mongodb-api.com/app/myapp/endpoint/updateUser \
  -H "apiKey: <YOUR_API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"userId": "64f1a2b3c4d5e6f7a8b9c0d1", "email": "new@example.com"}'
```

## Test Functions Locally

You can test function logic locally before deploying using the Atlas CLI:

```bash
appservices function run \
  --name updateUserEmail \
  --args '{"userId": "64f1a2b3c4d5e6f7a8b9c0d1", "email": "test@example.com"}' \
  --user "<USER_ID>"
```

## Manage Function Configuration

Store functions in your version-controlled App Services configuration:

```text
functions/
  updateUserEmail/
    config.json
    source.js
```

```json
{
  "name": "updateUserEmail",
  "private": false,
  "run_as_system": false,
  "run_as_user_id": "",
  "run_as_user_id_script_source": ""
}
```

Deploy with:

```bash
appservices push --remote="<App ID>"
```

## Summary

Atlas Functions provide serverless JavaScript execution inside MongoDB App Services. They can query MongoDB, call external APIs, and be exposed as HTTP endpoints or triggered by database events. Store function source in version control alongside your App Services configuration and deploy with the CLI for reproducible environments.
