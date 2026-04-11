# How to Stream Redis Changes to Elasticsearch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Elasticsearch, Keyspace Notification, Streaming, Node.js

Description: Stream Redis key changes to Elasticsearch in real time using keyspace notifications and Redis Streams for searchable, persistent indexing of Redis data.

---

## Architecture Overview

There are two primary approaches to streaming Redis changes to Elasticsearch:

1. **Keyspace Notifications** - Redis publishes events when keys are modified (SET, DEL, EXPIRE, etc.)
2. **Redis Streams** - Application code explicitly writes change events to a Redis Stream, which consumers index into Elasticsearch

## Approach 1: Keyspace Notifications

Enable keyspace notifications in Redis:

```bash
# Enable all keyevent events (E) and all commands (A)
redis-cli CONFIG SET notify-keyspace-events EA

# Or more specific: Keyevent events (E) + String commands ($) + Hash commands (h) + Generic commands (g) + Expired events (x)
redis-cli CONFIG SET notify-keyspace-events E$hgx
```

```bash
# In redis.conf
notify-keyspace-events EA
```

Subscribe and index to Elasticsearch:

```javascript
const Redis = require('ioredis');
const { Client } = require('@elastic/elasticsearch');

const subscriber = new Redis({ host: process.env.REDIS_HOST || 'localhost' });
const publisher = new Redis({ host: process.env.REDIS_HOST || 'localhost' });
const esClient = new Client({ node: process.env.ES_NODE || 'http://localhost:9200' });

const DB = 0; // Redis database index
const keyPattern = `__keyevent@${DB}__:*`;

await subscriber.psubscribe(keyPattern);

subscriber.on('pmessage', async (pattern, channel, key) => {
  const event = channel.replace(`__keyevent@${DB}__:`, '');

  if (event === 'set' || event === 'hset') {
    await indexKeyToElasticsearch(key, event);
  } else if (event === 'del' || event === 'expired') {
    await deleteFromElasticsearch(key);
  }
});

async function indexKeyToElasticsearch(key, event) {
  const type = await publisher.type(key);
  let value;

  switch (type) {
    case 'string':
      value = { value: await publisher.get(key) };
      break;
    case 'hash':
      value = await publisher.hgetall(key);
      break;
    default:
      return; // Skip other types
  }

  const ttl = await publisher.ttl(key);

  await esClient.index({
    index: 'redis-data',
    id: key,
    document: {
      key,
      type,
      value,
      event,
      ttl: ttl > 0 ? ttl : null,
      indexedAt: new Date().toISOString(),
    },
  });

  console.log(`Indexed key: ${key} (${event})`);
}

async function deleteFromElasticsearch(key) {
  try {
    await esClient.delete({ index: 'redis-data', id: key });
    console.log(`Deleted key from index: ${key}`);
  } catch (err) {
    if (err.meta?.statusCode !== 404) throw err;
  }
}
```

## Approach 2: Redis Streams as Change Log

Write change events explicitly to a Redis Stream from your application:

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: process.env.REDIS_HOST });

const CHANGE_STREAM = 'redis:changes';

// Wrapper that writes to Redis and records the change event
async function setWithChangeLog(key, value, options = {}) {
  const pipeline = redis.pipeline();

  if (options.ex) {
    pipeline.setex(key, options.ex, value);
  } else {
    pipeline.set(key, value);
  }

  pipeline.xadd(
    CHANGE_STREAM,
    '*',
    'operation', 'SET',
    'key', key,
    'value', typeof value === 'object' ? JSON.stringify(value) : value,
    'timestamp', Date.now().toString()
  );

  await pipeline.exec();
}

async function hsetWithChangeLog(key, fields) {
  const pipeline = redis.pipeline();
  pipeline.hset(key, fields);
  pipeline.xadd(
    CHANGE_STREAM,
    '*',
    'operation', 'HSET',
    'key', key,
    'value', JSON.stringify(fields),
    'timestamp', Date.now().toString()
  );
  await pipeline.exec();
}
```

## Stream Consumer to Elasticsearch

```javascript
const Redis = require('ioredis');
const { Client } = require('@elastic/elasticsearch');

const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost' });
const esClient = new Client({ node: process.env.ES_NODE || 'http://localhost:9200' });
const STREAM = 'redis:changes';
const GROUP = 'es-indexers';
const CONSUMER = `indexer-${process.pid}`;

async function setupConsumerGroup() {
  try {
    await redis.xgroup('CREATE', STREAM, GROUP, '$', 'MKSTREAM');
  } catch (err) {
    if (!err.message.includes('BUSYGROUP')) throw err;
  }
}

async function consumeAndIndex() {
  await setupConsumerGroup();

  while (true) {
    const entries = await redis.xreadgroup(
      'GROUP', GROUP, CONSUMER,
      'COUNT', 10,
      'BLOCK', 2000,
      'STREAMS', STREAM, '>'
    );

    if (!entries) continue;

    for (const [stream, messages] of entries) {
      for (const [messageId, fields] of messages) {
        const event = parseFields(fields);

        try {
          await indexChangeEvent(event);
          await redis.xack(STREAM, GROUP, messageId);
        } catch (err) {
          console.error(`Failed to index ${event.key}:`, err.message);
          // Message stays unacknowledged for retry
        }
      }
    }
  }
}

function parseFields(fields) {
  const obj = {};
  for (let i = 0; i < fields.length; i += 2) {
    obj[fields[i]] = fields[i + 1];
  }
  return obj;
}

async function indexChangeEvent(event) {
  await esClient.index({
    index: `redis-changes-${new Date().toISOString().slice(0, 7)}`,
    document: {
      ...event,
      '@timestamp': new Date(parseInt(event.timestamp)).toISOString(),
    },
  });
}

consumeAndIndex();
```

## Elasticsearch Index Mapping

```bash
curl -X PUT http://localhost:9200/redis-data \
  -H 'Content-Type: application/json' \
  -d '{
    "mappings": {
      "properties": {
        "key": { "type": "keyword" },
        "type": { "type": "keyword" },
        "event": { "type": "keyword" },
        "indexedAt": { "type": "date" },
        "ttl": { "type": "integer" },
        "value": { "type": "object", "dynamic": true }
      }
    }
  }'
```

## Summary

Streaming Redis changes to Elasticsearch can be done via keyspace notifications for automatic event capture, or via Redis Streams for explicit change logging with durability and replay capabilities. Redis Streams with consumer groups are preferred in production because they guarantee at-least-once delivery and support multiple parallel indexer instances without message loss.
