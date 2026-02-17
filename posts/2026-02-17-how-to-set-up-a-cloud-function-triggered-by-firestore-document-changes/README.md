# How to Set Up a Cloud Function Triggered by Firestore Document Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Firestore, Triggers, Serverless

Description: Step-by-step guide to creating Google Cloud Functions that automatically respond to Firestore document creates, updates, and deletes using Eventarc triggers.

---

Firestore triggers are one of the most useful features in the Google Cloud ecosystem. Instead of polling for changes or building complex event systems, you can have a Cloud Function fire automatically whenever a document is created, updated, or deleted. This is perfect for things like sending notifications, syncing data to other systems, maintaining denormalized counts, or running validation logic.

Let me walk you through setting this up properly, including the gotchas that the documentation does not always make clear.

## Prerequisites

Make sure you have these APIs enabled in your project:

```bash
# Enable the required APIs
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable firestore.googleapis.com
gcloud services enable eventarc.googleapis.com
gcloud services enable run.googleapis.com
```

You also need a Firestore database. If you have not created one yet:

```bash
# Create a Firestore database in Native mode
gcloud firestore databases create --location=us-central1
```

## Understanding Firestore Trigger Events

Firestore triggers support four event types:

- `google.cloud.firestore.document.v1.created` - A new document is created
- `google.cloud.firestore.document.v1.updated` - An existing document is modified
- `google.cloud.firestore.document.v1.deleted` - A document is deleted
- `google.cloud.firestore.document.v1.written` - Any of the above (catch-all)

The `written` event type is the most flexible since it fires on creates, updates, and deletes. But if you only care about new documents, use `created` to avoid unnecessary invocations.

## Writing the Cloud Function

Let me start with a practical example. Say you have a `users` collection and want to send a welcome email whenever a new user document is created.

Here is the function code for Gen 2 Cloud Functions:

```javascript
// index.js - Firestore trigger that sends welcome emails for new users
const functions = require('@google-cloud/functions-framework');
const { Firestore } = require('@google-cloud/firestore');

// Initialize Firestore client for reading additional data if needed
const firestore = new Firestore();

// Register the CloudEvent handler for Firestore triggers
functions.cloudEvent('onUserCreated', async (cloudEvent) => {
  // Extract the Firestore event data
  const firestoreData = cloudEvent.data;

  // The document data after the change
  // For 'created' events, oldValue will be empty
  const newValue = firestoreData.value;
  const oldValue = firestoreData.oldValue;

  // Get the document path from the event
  const documentPath = cloudEvent.subject;
  console.log(`New document created at: ${documentPath}`);

  // Extract field values from the document
  // Firestore events use a structured format for field values
  const fields = newValue.fields;
  const email = fields.email?.stringValue;
  const name = fields.displayName?.stringValue;

  if (!email) {
    console.log('No email found in document, skipping');
    return;
  }

  console.log(`Sending welcome email to ${name} at ${email}`);

  // Your email sending logic here
  // await sendWelcomeEmail(email, name);

  // Optionally update the document to mark the email as sent
  const docRef = firestore.doc(documentPath.replace('/documents/', ''));
  await docRef.update({
    welcomeEmailSent: true,
    welcomeEmailSentAt: Firestore.FieldValue.serverTimestamp()
  });
});
```

And the package.json:

```json
{
  "name": "firestore-trigger-function",
  "version": "1.0.0",
  "dependencies": {
    "@google-cloud/functions-framework": "^3.0.0",
    "@google-cloud/firestore": "^7.0.0"
  }
}
```

## Deploying with gcloud

Deploy the function with a Firestore trigger using the `--trigger-event-filters` flags:

```bash
# Deploy with a Firestore document created trigger
# The document pattern uses {userId} as a wildcard for any document ID
gcloud functions deploy on-user-created \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=onUserCreated \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.created" \
  --trigger-event-filters="database=(default)" \
  --trigger-event-filters-path-pattern="document=users/{userId}" \
  --memory=256Mi \
  --timeout=60s
```

The `--trigger-event-filters-path-pattern` flag is important. It uses a path pattern with wildcards wrapped in curly braces. The `{userId}` wildcard matches any document ID in the `users` collection.

## Working with Nested Collections

If you need to trigger on subcollection documents, extend the path pattern:

```bash
# Trigger on documents in a subcollection
# This fires when any order document is created under any user
gcloud functions deploy on-order-created \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=onOrderCreated \
  --trigger-event-filters="type=google.cloud.firestore.document.v1.created" \
  --trigger-event-filters="database=(default)" \
  --trigger-event-filters-path-pattern="document=users/{userId}/orders/{orderId}" \
  --memory=256Mi
```

## Handling Update Events with Before/After Data

Update triggers give you both the old and new document state, which is great for detecting specific field changes:

```javascript
// Handler that reacts to user profile updates
functions.cloudEvent('onUserUpdated', async (cloudEvent) => {
  const data = cloudEvent.data;

  // Get old and new document values
  const oldFields = data.oldValue?.fields || {};
  const newFields = data.value?.fields || {};

  // Check if a specific field changed
  const oldEmail = oldFields.email?.stringValue;
  const newEmail = newFields.email?.stringValue;

  if (oldEmail !== newEmail) {
    console.log(`Email changed from ${oldEmail} to ${newEmail}`);
    // Send email verification to the new address
    // await sendVerificationEmail(newEmail);
  }

  // Check if the subscription tier changed
  const oldTier = oldFields.subscriptionTier?.stringValue;
  const newTier = newFields.subscriptionTier?.stringValue;

  if (oldTier !== newTier) {
    console.log(`Subscription changed from ${oldTier} to ${newTier}`);
    // Update billing, notify team, etc.
  }
});
```

## Parsing Firestore Field Values

One thing that trips people up is the structured format Firestore uses in event payloads. Fields are not plain values - they are wrapped in type descriptors:

```javascript
// Helper function to extract plain values from Firestore event fields
function extractValue(field) {
  if (!field) return null;

  // Handle different Firestore value types
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return parseInt(field.integerValue);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.timestampValue !== undefined) return new Date(field.timestampValue);
  if (field.nullValue !== undefined) return null;
  if (field.arrayValue) {
    return (field.arrayValue.values || []).map(extractValue);
  }
  if (field.mapValue) {
    const result = {};
    for (const [key, val] of Object.entries(field.mapValue.fields || {})) {
      result[key] = extractValue(val);
    }
    return result;
  }
  return null;
}

// Convert entire fields object to a plain JS object
function fieldsToObject(fields) {
  const result = {};
  for (const [key, val] of Object.entries(fields)) {
    result[key] = extractValue(val);
  }
  return result;
}

// Usage in your handler
functions.cloudEvent('onDocumentWritten', async (cloudEvent) => {
  const newFields = cloudEvent.data.value?.fields || {};
  const doc = fieldsToObject(newFields);

  // Now doc is a plain JavaScript object
  console.log(doc.email);  // "user@example.com" instead of {stringValue: "user@example.com"}
});
```

## Handling Delete Events

Delete triggers give you the old document state so you can perform cleanup:

```javascript
// Clean up related data when a user document is deleted
functions.cloudEvent('onUserDeleted', async (cloudEvent) => {
  const deletedFields = cloudEvent.data.oldValue?.fields || {};
  const userId = cloudEvent.subject.split('/').pop();

  console.log(`User ${userId} was deleted, cleaning up...`);

  // Delete related subcollections, storage files, etc.
  const firestore = new Firestore();

  // Delete all orders for this user
  const ordersRef = firestore.collection(`users/${userId}/orders`);
  const orders = await ordersRef.listDocuments();

  const batch = firestore.batch();
  orders.forEach(doc => batch.delete(doc));
  await batch.commit();

  console.log(`Cleaned up ${orders.length} orders for user ${userId}`);
});
```

## Avoiding Infinite Loops

A common mistake is writing a Firestore trigger that updates the same document it was triggered by. This creates an infinite loop where the update triggers the function again, which updates the document again, and so on.

```javascript
// DANGEROUS: This creates an infinite loop
functions.cloudEvent('onUpdate', async (cloudEvent) => {
  const docPath = cloudEvent.subject.replace('/documents/', '');
  const firestore = new Firestore();

  // This update triggers this same function again!
  await firestore.doc(docPath).update({ processedAt: new Date() });
});

// SAFE: Check if the update was already processed
functions.cloudEvent('onUpdate', async (cloudEvent) => {
  const newFields = cloudEvent.data.value?.fields || {};

  // Skip if we already processed this document
  if (newFields.processedAt) {
    console.log('Already processed, skipping to prevent loop');
    return;
  }

  const docPath = cloudEvent.subject.replace('/documents/', '');
  const firestore = new Firestore();
  await firestore.doc(docPath).update({ processedAt: new Date() });
});
```

## Monitoring Your Triggers

Once your triggers are deployed, monitor them using Cloud Logging to catch issues early. Set up alerts in OneUptime to track function error rates and execution times. Firestore triggers can fail silently if the event payload format changes or if your function hits memory limits processing large documents. Having proper monitoring ensures you catch these issues before they affect your users.

Firestore triggers are powerful but need careful handling. Test with realistic data volumes, handle all the field types properly, guard against infinite loops, and you will have a solid event-driven architecture running on top of your Firestore data.
