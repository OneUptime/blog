# How to Use the google-cloud/tasks npm Package to Schedule Delayed HTTP Callbacks from Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Tasks, Node.js, Scheduling, Callbacks, Google Cloud

Description: Schedule delayed HTTP callbacks from Node.js applications using the google-cloud/tasks npm package for deferred processing and timed workflows.

---

There are plenty of situations where you need something to happen later - send a reminder email in 24 hours, retry a failed webhook in 5 minutes, expire a temporary access token after an hour, or check if a user completed onboarding after 3 days. Google Cloud Tasks lets you schedule HTTP callbacks with precise delays, and the `@google-cloud/tasks` npm package makes it easy to create these scheduled callbacks from any Node.js application.

In this post, I will show you how to set up delayed HTTP callbacks using Cloud Tasks, including precise scheduling, payload handling, authentication, and practical patterns for common use cases.

## How Delayed Callbacks Work

When you create a Cloud Task with a `scheduleTime`, the task sits in the queue until that time arrives. Once the scheduled time passes, Cloud Tasks delivers the task as an HTTP request to your specified URL. If the target returns a non-2xx response, Cloud Tasks retries according to the queue's retry configuration.

Think of it as a reliable `setTimeout` that survives server restarts, scales across instances, and handles retries automatically.

## Setting Up the Queue

Create a Cloud Tasks queue optimized for scheduled callbacks.

```bash
# Create a queue for scheduled callbacks
gcloud tasks queues create scheduled-callbacks \
  --location=us-central1 \
  --max-dispatches-per-second=50 \
  --max-concurrent-dispatches=20 \
  --max-attempts=5 \
  --min-backoff=30s \
  --max-backoff=600s
```

## Basic Delayed Callback

Here is the core function to schedule a callback at a specific time in the future.

```javascript
// scheduler.js - Schedule delayed HTTP callbacks
const { CloudTasksClient } = require('@google-cloud/tasks');

const client = new CloudTasksClient();

const PROJECT_ID = process.env.PROJECT_ID || 'your-project-id';
const LOCATION = process.env.LOCATION || 'us-central1';
const QUEUE = process.env.QUEUE || 'scheduled-callbacks';
const SERVICE_URL = process.env.SERVICE_URL || 'https://your-service.run.app';

// Build the queue path once
const queuePath = client.queuePath(PROJECT_ID, LOCATION, QUEUE);

// Schedule an HTTP callback after a specified delay
async function scheduleCallback(path, payload, delaySeconds) {
  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url: `${SERVICE_URL}${path}`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: Buffer.from(JSON.stringify(payload)).toString('base64'),
    },
    // Schedule the task for the future
    scheduleTime: {
      seconds: Math.floor(Date.now() / 1000) + delaySeconds,
    },
  };

  const [response] = await client.createTask({
    parent: queuePath,
    task,
  });

  console.log(`Scheduled callback to ${path} in ${delaySeconds}s: ${response.name}`);
  return response.name;
}

module.exports = { scheduleCallback };
```

## Scheduling at a Specific Time

Sometimes you want the callback to fire at an exact time rather than a relative delay.

```javascript
// Schedule a callback at an exact datetime
async function scheduleAt(path, payload, targetDate) {
  // Accept a Date object or ISO string
  const date = targetDate instanceof Date ? targetDate : new Date(targetDate);

  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url: `${SERVICE_URL}${path}`,
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify(payload)).toString('base64'),
    },
    scheduleTime: {
      seconds: Math.floor(date.getTime() / 1000),
    },
  };

  const [response] = await client.createTask({
    parent: queuePath,
    task,
  });

  return response.name;
}

// Usage examples
// Schedule for tomorrow at 9 AM
const tomorrow9am = new Date();
tomorrow9am.setDate(tomorrow9am.getDate() + 1);
tomorrow9am.setHours(9, 0, 0, 0);

await scheduleAt('/callbacks/send-reminder', {
  userId: 'user-123',
  type: 'daily_digest',
}, tomorrow9am);

// Schedule for a specific ISO timestamp
await scheduleAt('/callbacks/expire-token', {
  tokenId: 'tok-abc',
}, '2026-03-01T15:00:00Z');
```

## Practical Use Cases

### Sending Reminder Emails

```javascript
// Schedule a reminder email after user signup
const express = require('express');
const { scheduleCallback } = require('./scheduler');
const app = express();
app.use(express.json());

app.post('/api/users/signup', async (req, res) => {
  const { email, name } = req.body;
  const userId = createUser(email, name);

  // Send welcome email immediately
  await sendWelcomeEmail(email, name);

  // Schedule a follow-up email in 24 hours
  await scheduleCallback('/callbacks/follow-up-email', {
    userId,
    email,
    name,
    type: 'onboarding_day1',
  }, 24 * 60 * 60);

  // Schedule an engagement check in 3 days
  await scheduleCallback('/callbacks/engagement-check', {
    userId,
    email,
  }, 3 * 24 * 60 * 60);

  res.status(201).json({ userId });
});

// Handler for the delayed follow-up email
app.post('/callbacks/follow-up-email', async (req, res) => {
  const { userId, email, name, type } = req.body;

  try {
    await sendFollowUpEmail(email, name, type);
    console.log(`Sent ${type} email to ${email}`);
    res.status(200).json({ status: 'sent' });
  } catch (error) {
    console.error('Email send failed:', error);
    // Return 500 to trigger retry
    res.status(500).json({ error: 'Failed to send email' });
  }
});
```

### Expiring Temporary Resources

```javascript
// Create a temporary share link that expires
app.post('/api/files/:fileId/share', async (req, res) => {
  const { fileId } = req.params;
  const { expiresInHours = 24 } = req.body;

  // Create the share link
  const shareToken = generateShareToken();
  await saveShareLink(fileId, shareToken, expiresInHours);

  // Schedule cleanup when the link expires
  await scheduleCallback('/callbacks/expire-share', {
    fileId,
    shareToken,
  }, expiresInHours * 60 * 60);

  res.json({
    shareUrl: `https://app.example.com/shared/${shareToken}`,
    expiresIn: `${expiresInHours} hours`,
  });
});

// Handler to expire the share link
app.post('/callbacks/expire-share', async (req, res) => {
  const { fileId, shareToken } = req.body;

  await deleteShareLink(fileId, shareToken);
  console.log(`Expired share link ${shareToken} for file ${fileId}`);

  res.status(200).json({ status: 'expired' });
});
```

### Retry with Backoff for External APIs

```javascript
// Retry a webhook delivery with increasing delays
async function scheduleWebhookRetry(webhookUrl, payload, attempt) {
  // Exponential backoff: 1min, 5min, 30min, 2hr, 12hr
  const delays = [60, 300, 1800, 7200, 43200];
  const delay = delays[Math.min(attempt, delays.length - 1)];

  await scheduleCallback('/callbacks/deliver-webhook', {
    webhookUrl,
    payload,
    attempt: attempt + 1,
    maxAttempts: 5,
  }, delay);
}

app.post('/callbacks/deliver-webhook', async (req, res) => {
  const { webhookUrl, payload, attempt, maxAttempts } = req.body;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    console.log(`Webhook delivered successfully on attempt ${attempt}`);
    res.status(200).json({ status: 'delivered' });
  } catch (error) {
    console.error(`Webhook attempt ${attempt} failed:`, error.message);

    if (attempt < maxAttempts) {
      await scheduleWebhookRetry(webhookUrl, payload, attempt);
      res.status(200).json({ status: 'retry_scheduled' });
    } else {
      // Max retries reached - mark as failed
      await markWebhookFailed(webhookUrl, payload);
      res.status(200).json({ status: 'max_retries_reached' });
    }
  }
});
```

## Canceling Scheduled Callbacks

You can cancel a scheduled task before it executes.

```javascript
// Cancel a previously scheduled callback
async function cancelCallback(taskName) {
  try {
    await client.deleteTask({ name: taskName });
    console.log(`Cancelled task: ${taskName}`);
    return true;
  } catch (error) {
    if (error.code === 5) {
      // NOT_FOUND - task already executed or was already deleted
      console.log('Task not found (may have already executed)');
      return false;
    }
    throw error;
  }
}

// Usage: store the task name when scheduling, then cancel if needed
app.post('/api/subscriptions/:id/cancel', async (req, res) => {
  const sub = await getSubscription(req.params.id);

  // Cancel the scheduled renewal callback
  if (sub.renewalTaskName) {
    await cancelCallback(sub.renewalTaskName);
  }

  await cancelSubscription(req.params.id);
  res.json({ status: 'cancelled' });
});
```

## Adding OIDC Authentication

For production, secure your callback endpoints with OIDC tokens.

```javascript
// Schedule a callback with OIDC authentication
async function scheduleAuthenticatedCallback(path, payload, delaySeconds) {
  const serviceAccountEmail = `${PROJECT_ID}@appspot.gserviceaccount.com`;

  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url: `${SERVICE_URL}${path}`,
      headers: { 'Content-Type': 'application/json' },
      body: Buffer.from(JSON.stringify(payload)).toString('base64'),
      // Include an OIDC token for authentication
      oidcToken: {
        serviceAccountEmail,
        audience: SERVICE_URL,
      },
    },
    scheduleTime: {
      seconds: Math.floor(Date.now() / 1000) + delaySeconds,
    },
  };

  const [response] = await client.createTask({
    parent: queuePath,
    task,
  });

  return response.name;
}
```

Cloud Tasks is an excellent choice for scheduling delayed HTTP callbacks. It is more reliable than in-process timers, cheaper than keeping a server running just to fire scheduled events, and simpler than setting up your own job queue. The key is to make your callback handlers idempotent, store task names if you need cancellation, and use OIDC tokens to secure your endpoints.
