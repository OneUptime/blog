# How to Implement Mobile Push Notification Queue with Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Push Notification, Queue, Mobile, Node.js, List

Description: Build a reliable mobile push notification queue with Redis Lists and Streams, supporting batching, retries, and priority routing for iOS and Android.

---

## Why Use Redis for Push Notification Queues?

Mobile push notifications need to be delivered reliably, quickly, and at scale. Redis provides:
- Sub-millisecond enqueue operations with Lists or Streams
- Atomic dequeue so multiple workers don't process the same notification
- Priority queues using Sorted Sets
- Built-in TTL to expire stale notifications
- Persistence options to survive restarts

## Basic Queue with Redis Lists

The simplest approach uses RPUSH to enqueue and BLPOP to dequeue with blocking:

```javascript
const Redis = require('ioredis');
const redis = new Redis();

// Enqueue a notification
async function enqueueNotification(notification) {
  const payload = JSON.stringify({
    ...notification,
    enqueuedAt: Date.now(),
    attempts: 0,
  });
  await redis.rpush('push:queue', payload);
  console.log(`Enqueued notification for device ${notification.deviceToken}`);
}

// Worker: dequeue and send
async function startWorker() {
  console.log('Push worker started');
  while (true) {
    // Block up to 5 seconds waiting for a notification
    const result = await redis.blpop('push:queue', 5);
    if (!result) continue;

    const notification = JSON.parse(result[1]);
    await sendPushNotification(notification);
  }
}

async function sendPushNotification(notification) {
  try {
    // Call your APNs/FCM service here
    await apns.send({
      deviceToken: notification.deviceToken,
      title: notification.title,
      body: notification.body,
    });
    console.log(`Sent to ${notification.deviceToken}`);
  } catch (err) {
    console.error(`Failed to send: ${err.message}`);
    await handleFailedNotification(notification);
  }
}
```

## Priority Queue with Sorted Sets

Use a Sorted Set with priority as the score to process high-priority notifications first:

```javascript
async function enqueueWithPriority(notification, priority = 5) {
  // Lower score = higher priority (1 is highest, 10 is lowest)
  const score = priority * 1000 + Date.now() / 1e9;
  const payload = JSON.stringify(notification);
  await redis.zadd('push:priority_queue', score, payload);
}

async function dequeueHighestPriority() {
  // Atomically pop the item with the lowest score (highest priority)
  const result = await redis.zpopmin('push:priority_queue', 1);
  if (!result || result.length === 0) return null;
  return JSON.parse(result[0]);
}

// Worker loop
async function priorityWorker() {
  while (true) {
    const notification = await dequeueHighestPriority();
    if (notification) {
      await sendPushNotification(notification);
    } else {
      await new Promise(r => setTimeout(r, 100));
    }
  }
}
```

## Reliable Queue with Redis Streams

Redis Streams offer durability and consumer group semantics for reliable delivery:

```javascript
const STREAM_KEY = 'push:stream';
const GROUP = 'push_workers';

// Create consumer group once
async function setupStream() {
  try {
    await redis.xgroup('CREATE', STREAM_KEY, GROUP, '$', 'MKSTREAM');
  } catch (e) {
    if (!e.message.includes('BUSYGROUP')) throw e;
  }
}

// Enqueue
async function enqueueStream(notification) {
  await redis.xadd(STREAM_KEY, '*',
    'deviceToken', notification.deviceToken,
    'platform', notification.platform,   // 'ios' or 'android'
    'title', notification.title,
    'body', notification.body,
    'data', JSON.stringify(notification.data || {}),
    'enqueuedAt', String(Date.now()),
  );
}

// Worker
async function streamWorker(workerName) {
  await setupStream();
  while (true) {
    const messages = await redis.xreadgroup(
      'GROUP', GROUP, workerName,
      'COUNT', '10',
      'BLOCK', '5000',
      'STREAMS', STREAM_KEY, '>'
    );
    if (!messages) continue;

    for (const [, entries] of messages) {
      for (const [id, fields] of entries) {
        const notification = {
          deviceToken: fields[fields.indexOf('deviceToken') + 1],
          platform: fields[fields.indexOf('platform') + 1],
          title: fields[fields.indexOf('title') + 1],
          body: fields[fields.indexOf('body') + 1],
        };

        try {
          await sendPushNotification(notification);
          // Acknowledge success
          await redis.xack(STREAM_KEY, GROUP, id);
        } catch (err) {
          console.error(`Failed to process ${id}:`, err.message);
          // Do not ACK - will be claimed by XPENDING/XCLAIM logic
        }
      }
    }
  }
}
```

## Handling Retries

```javascript
const MAX_ATTEMPTS = 3;
const RETRY_QUEUE = 'push:retry';

async function handleFailedNotification(notification) {
  notification.attempts = (notification.attempts || 0) + 1;
  if (notification.attempts >= MAX_ATTEMPTS) {
    // Move to dead-letter queue
    await redis.rpush('push:dlq', JSON.stringify(notification));
    console.warn(`Notification for ${notification.deviceToken} moved to DLQ after ${MAX_ATTEMPTS} attempts`);
    return;
  }

  // Retry with delay using sorted set (score = future timestamp)
  const retryAt = Date.now() + Math.pow(2, notification.attempts - 1) * 30000; // exponential backoff: 30s, 60s, 120s
  await redis.zadd(RETRY_QUEUE, retryAt, JSON.stringify(notification));
}

// Retry scheduler - runs every 10 seconds
async function retryScheduler() {
  while (true) {
    const now = Date.now();
    const due = await redis.zrangebyscore(RETRY_QUEUE, '-inf', now, 'LIMIT', '0', '50');
    for (const item of due) {
      await redis.zrem(RETRY_QUEUE, item);
      await redis.rpush('push:queue', item);
    }
    await new Promise(r => setTimeout(r, 10000));
  }
}
```

## Monitoring Queue Depth

```bash
# Check queue length
redis-cli LLEN push:queue

# Check stream consumer group lag
redis-cli XINFO GROUPS push:stream

# Check pending (unacknowledged) messages
redis-cli XPENDING push:stream push_workers - + 10
```

## Summary

Redis is an excellent backbone for mobile push notification queues. Use Redis Lists for simplicity, Sorted Sets for priority routing, and Redis Streams for reliable delivery with consumer group semantics. Always implement retry logic with exponential backoff and a dead-letter queue to handle persistently failing deliveries without dropping notifications.
