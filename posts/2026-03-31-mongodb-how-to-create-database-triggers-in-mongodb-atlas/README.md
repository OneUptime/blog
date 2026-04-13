# How to Create Database Triggers in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Trigger, Serverless, App Service

Description: Learn how to create database triggers in MongoDB Atlas to automatically run JavaScript functions in response to document changes.

---

## What Are Database Triggers?

Database triggers in MongoDB Atlas execute custom JavaScript functions automatically when documents in a collection are inserted, updated, deleted, or replaced. They run on the Atlas App Services platform (formerly Realm) and are fully managed - no servers to provision.

Use cases include:
- Sending notifications when data changes
- Maintaining derived data or audit logs
- Integrating with external services (email, Slack, webhooks)
- Enforcing business rules on writes

## Prerequisites

- MongoDB Atlas account with a cluster
- Atlas App Services enabled for your project

## Step 1: Open Atlas App Services

1. Log in to Atlas and navigate to your project
2. Click **App Services** in the top navigation
3. Create a new App or select an existing one
4. In the left sidebar, click **Triggers**

## Step 2: Create a Database Trigger

Click **Add a Trigger** and select **Database** as the trigger type.

Configure the basic settings:
- **Trigger Name**: `onOrderInserted`
- **Enabled**: On
- **Cluster Name**: Your cluster
- **Database Name**: `store`
- **Collection Name**: `orders`
- **Operation Type**: Insert

## Step 3: Write the Trigger Function

In the function editor, write your handler:

```javascript
exports = async function(changeEvent) {
  const order = changeEvent.fullDocument;

  // Send confirmation email
  const emailService = context.services.get("EmailService");
  await emailService.send({
    to: order.customerEmail,
    subject: `Order #${order._id} confirmed`,
    body: `Thank you for your order of ${order.items.length} item(s).`
  });

  // Write to audit log
  const mongodb = context.services.get("mongodb-atlas");
  const auditLog = mongodb.db("store").collection("order_audit");
  await auditLog.insertOne({
    orderId: order._id,
    event: "ORDER_CREATED",
    timestamp: new Date(),
    customerId: order.customerId
  });
};
```

## Step 4: Enable Full Document in the Change Event

By default, the trigger receives the change event document. To get the full inserted/updated document, enable **Full Document**:

- Check **Full Document** in the trigger configuration

For updates, also enable **Full Document Before Change** if you need the pre-update state.

## Step 5: Handle Update Triggers

Create a trigger that fires on updates:

```javascript
exports = async function(changeEvent) {
  const { fullDocument, updateDescription } = changeEvent;

  // Only react to status field changes
  if (!updateDescription.updatedFields.status) {
    return;
  }

  const newStatus = fullDocument.status;

  if (newStatus === "SHIPPED") {
    const http = context.http;
    await http.post({
      url: "https://api.myservice.com/webhooks/order-shipped",
      headers: { "Content-Type": ["application/json"] },
      body: {
        orderId: fullDocument._id.toString(),
        trackingNumber: fullDocument.trackingNumber
      },
      encodeBodyAsJSON: true
    });
  }
};
```

## Step 6: Use Match Expressions to Filter Events

Avoid unnecessary function invocations by using a match expression to filter which documents trigger the function:

```json
{
  "fullDocument.amount": { "$gt": 100 }
}
```

In the trigger configuration UI, paste this into the **Match Expression** field. Only documents with `amount > 100` will invoke the function.

## Step 7: Create Triggers via the App Services API

```bash
curl -X POST \
  "https://services.cloud.mongodb.com/api/admin/v3.0/groups/{groupId}/apps/{appId}/triggers" \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "onOrderInserted",
    "type": "DATABASE",
    "config": {
      "service_name": "mongodb-atlas",
      "database": "store",
      "collection": "orders",
      "operation_types": ["INSERT"],
      "full_document": true
    },
    "function_name": "handleOrderInserted",
    "disabled": false
  }'
```

## Step 8: Monitor Trigger Execution

View execution logs in the Atlas UI under **App Services > Logs**. Each invocation shows:
- Execution time
- Status (success or error)
- Log output from `console.log()`
- Error messages if the function threw

## Step 9: Handle Errors and Retries

Triggers may become suspended due to network disruptions or cluster changes. Atlas sends email notifications when a trigger is suspended. You can configure `tolerate_resume_errors` to allow automatic resumption without reprocessing missed events. For application-level failures, use error handling:

```javascript
exports = async function(changeEvent) {
  try {
    const doc = changeEvent.fullDocument;
    await processDocument(doc);
  } catch (err) {
    console.error("Trigger failed:", err.message);
    // Store failed events for manual review
    const mongodb = context.services.get("mongodb-atlas");
    await mongodb.db("store").collection("failed_triggers").insertOne({
      changeEvent,
      error: err.message,
      timestamp: new Date()
    });
  }
};
```

## Summary

Atlas database triggers execute serverless JavaScript functions automatically when documents change in a collection. Configure trigger type (insert, update, delete), enable full document access, use match expressions to filter relevant events, and write handler functions using Atlas App Services context to call external APIs, send notifications, or maintain derived data - all without managing any infrastructure.
