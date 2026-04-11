# How to Export Redis Keys to JSON

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, JSON, Data Export, Node.js, Backup

Description: Export Redis keys and their values to JSON files with type-aware serialization for Strings, Hashes, Lists, Sets, and Sorted Sets.

---

## Use Cases for Redis JSON Export

- Creating backups of Redis data
- Migrating data between Redis instances
- Sharing dataset snapshots
- Debugging production data locally

## Exporting a Single Key by Type

```javascript
const Redis = require('ioredis');
const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost' });

async function exportKey(key) {
  const type = await redis.type(key);
  const ttl = await redis.ttl(key);

  let value;

  switch (type) {
    case 'string':
      value = await redis.get(key);
      break;
    case 'hash':
      value = await redis.hgetall(key);
      break;
    case 'list':
      value = await redis.lrange(key, 0, -1);
      break;
    case 'set':
      value = await redis.smembers(key);
      break;
    case 'zset': {
      const entries = await redis.zrange(key, 0, -1, 'WITHSCORES');
      value = [];
      for (let i = 0; i < entries.length; i += 2) {
        value.push({ member: entries[i], score: parseFloat(entries[i + 1]) });
      }
      break;
    }
    default:
      value = null;
  }

  return { key, type, ttl: ttl > 0 ? ttl : null, value };
}
```

## Exporting Multiple Keys with SCAN

```javascript
const fs = require('fs');

async function exportKeysToJSON(pattern, outputFile, options = {}) {
  const { pretty = true, batchSize = 100 } = options;
  const writeStream = fs.createWriteStream(outputFile);
  writeStream.write('[\n');

  let cursor = '0';
  let firstRecord = true;
  let totalExported = 0;

  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', batchSize);
    cursor = newCursor;

    for (const key of keys) {
      const record = await exportKey(key);

      if (!firstRecord) {
        writeStream.write(',\n');
      }

      writeStream.write(
        pretty ? JSON.stringify(record, null, 2) : JSON.stringify(record)
      );

      firstRecord = false;
      totalExported++;
    }
  } while (cursor !== '0');

  writeStream.write('\n]');
  writeStream.end();

  await new Promise((resolve) => writeStream.on('finish', resolve));
  console.log(`Exported ${totalExported} keys to ${outputFile}`);
}

// Export all keys matching a pattern
await exportKeysToJSON('user:*', 'users.json');
```

## Efficient Batch Export with Pipelining

```javascript
async function exportBatchToJSON(pattern, outputFile) {
  const writeStream = fs.createWriteStream(outputFile);
  let cursor = '0';
  let totalExported = 0;
  let firstRecord = true;

  writeStream.write('[');

  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 200);
    cursor = newCursor;

    if (keys.length === 0) continue;

    // Fetch types in pipeline
    const typePipeline = redis.pipeline();
    const ttlPipeline = redis.pipeline();
    for (const key of keys) {
      typePipeline.type(key);
      ttlPipeline.ttl(key);
    }

    const typeResults = await typePipeline.exec();
    const ttlResults = await ttlPipeline.exec();

    // Fetch values based on types
    const valuePipeline = redis.pipeline();
    for (let i = 0; i < keys.length; i++) {
      const type = typeResults[i][1];
      switch (type) {
        case 'string': valuePipeline.get(keys[i]); break;
        case 'hash': valuePipeline.hgetall(keys[i]); break;
        case 'list': valuePipeline.lrange(keys[i], 0, -1); break;
        case 'set': valuePipeline.smembers(keys[i]); break;
        case 'zset': valuePipeline.zrange(keys[i], 0, -1, 'WITHSCORES'); break;
        default: valuePipeline.get(keys[i]);
      }
    }

    const valueResults = await valuePipeline.exec();

    for (let i = 0; i < keys.length; i++) {
      if (!firstRecord) writeStream.write(',');
      writeStream.write('\n');

      let val = valueResults[i][1];

      // Convert flat zset array to [{member, score}] format
      if (typeResults[i][1] === 'zset' && Array.isArray(val)) {
        const structured = [];
        for (let j = 0; j < val.length; j += 2) {
          structured.push({ member: val[j], score: parseFloat(val[j + 1]) });
        }
        val = structured;
      }

      const record = {
        key: keys[i],
        type: typeResults[i][1],
        ttl: ttlResults[i][1] > 0 ? ttlResults[i][1] : null,
        value: val,
      };

      writeStream.write(JSON.stringify(record, null, 2));
      firstRecord = false;
      totalExported++;
    }
  } while (cursor !== '0');

  writeStream.write('\n]');
  writeStream.end();

  await new Promise((resolve) => writeStream.on('finish', resolve));
  console.log(`Exported ${totalExported} keys`);
}
```

## Re-importing from JSON

```javascript
async function importFromJSON(jsonFile) {
  const data = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
  let pipeline = redis.pipeline();
  let count = 0;

  for (const record of data) {
    const { key, type, ttl, value } = record;

    switch (type) {
      case 'string':
        pipeline.set(key, value);
        break;
      case 'hash':
        pipeline.hset(key, value);
        break;
      case 'list':
        pipeline.del(key);
        if (value.length > 0) pipeline.rpush(key, ...value);
        break;
      case 'set':
        pipeline.del(key);
        if (value.length > 0) pipeline.sadd(key, ...value);
        break;
      case 'zset':
        pipeline.del(key);
        for (const entry of value) {
          pipeline.zadd(key, entry.score, entry.member);
        }
        break;
    }

    if (ttl && ttl > 0) {
      pipeline.expire(key, ttl);
    }

    count++;

    if (count % 500 === 0) {
      await pipeline.exec();
      pipeline = redis.pipeline();
      console.log(`Imported ${count} records...`);
    }
  }

  await pipeline.exec();
  console.log(`Import complete: ${count} records`);
}
```

## Exporting via redis-cli

```bash
# Dump all keys (RDB format) for backup
redis-cli --rdb /tmp/dump.rdb

# Use redis-dump npm package for JSON format
npx redis-dump -h localhost -p 6379 > backup.json
npx redis-load < backup.json
```

## Summary

Exporting Redis data to JSON requires type-aware serialization since Redis supports multiple data types. Use SCAN for safe key enumeration, pipeline batching for efficient value retrieval, and streaming writes to handle exports larger than available memory. The resulting JSON export can be used for debugging, migration, or backup and is re-importable using the same key structure.
