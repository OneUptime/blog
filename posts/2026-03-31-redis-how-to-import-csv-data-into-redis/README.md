# How to Import CSV Data into Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CSV, Data Import, Pipeline, Node.js

Description: Import CSV files into Redis efficiently using pipelining and batch processing, with strategies for Strings, Hashes, and Sets based on data structure.

---

## When to Import CSV into Redis

CSV import into Redis is useful for:
- Seeding lookup tables (zip codes, product catalogs)
- Loading configuration data for fast access
- Importing historical data for time-series analysis
- Populating leaderboards from exports

## Method 1: Redis CLI Mass Insertion

Redis CLI supports a special pipe mode for fast bulk imports using the inline command format:

```bash
# Convert CSV to Redis inline protocol
# Input: id,name,price
# 1,Widget,9.99
# 2,Gadget,19.99

awk -F',' 'NR>1 {
  print "HSET product:" $1 " id " $1 " name " $2 " price " $3
}' products.csv | redis-cli --pipe
```

## Method 2: Node.js with csv-parse and Pipelining

```bash
npm install csv-parse ioredis
```

```javascript
const fs = require('fs');
const { parse } = require('csv-parse');
const Redis = require('ioredis');

const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost' });

async function importCSVToRedis(filePath, options = {}) {
  const {
    keyField = 'id',
    keyPrefix = 'record',
    batchSize = 1000,
    ttl = null,
  } = options;

  const parser = fs.createReadStream(filePath).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true })
  );

  let batch = [];
  let totalImported = 0;
  let pipeline = redis.pipeline();

  for await (const record of parser) {
    const key = `${keyPrefix}:${record[keyField]}`;

    pipeline.hset(key, record);
    if (ttl) {
      pipeline.expire(key, ttl);
    }

    batch.push(record);

    if (batch.length >= batchSize) {
      await pipeline.exec();
      totalImported += batch.length;
      console.log(`Imported ${totalImported} records...`);
      pipeline = redis.pipeline();
      batch = [];
    }
  }

  // Flush remaining records
  if (batch.length > 0) {
    await pipeline.exec();
    totalImported += batch.length;
  }

  console.log(`Import complete: ${totalImported} total records imported`);
  return totalImported;
}

// Example usage
await importCSVToRedis('products.csv', {
  keyField: 'id',
  keyPrefix: 'product',
  batchSize: 500,
  ttl: 3600,
});
```

## Method 3: Import as Sorted Set (for rankings)

```javascript
async function importCSVToSortedSet(filePath, setKey, scoreField, memberField) {
  const parser = fs.createReadStream(filePath).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true })
  );

  let pipeline = redis.pipeline();
  let count = 0;
  const BATCH = 500;

  for await (const record of parser) {
    const score = parseFloat(record[scoreField]);
    const member = record[memberField];

    if (!isNaN(score) && member) {
      pipeline.zadd(setKey, score, member);
      count++;

      if (count % BATCH === 0) {
        await pipeline.exec();
        pipeline = redis.pipeline();
        console.log(`Added ${count} members to sorted set`);
      }
    }
  }

  if (count % BATCH !== 0) {
    await pipeline.exec();
  }

  console.log(`Sorted set import complete: ${count} members in ${setKey}`);
}

// Import sales leaderboard from CSV (name,revenue)
await importCSVToSortedSet('sales.csv', 'leaderboard:sales', 'revenue', 'name');
```

## Method 4: Python with redis-py

```python
import csv
import redis

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def import_csv(filename, key_prefix='record', key_field='id', batch_size=1000):
    with open(filename, newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        pipeline = r.pipeline()
        count = 0
        total = 0

        for row in reader:
            key = f"{key_prefix}:{row[key_field]}"
            pipeline.hset(key, mapping=row)
            count += 1
            total += 1

            if count >= batch_size:
                pipeline.execute()
                pipeline = r.pipeline()
                count = 0
                print(f"Imported {total} records...")

        if count > 0:
            pipeline.execute()

    print(f"Import complete: {total} records")
    return total

import_csv('products.csv', key_prefix='product', key_field='sku')
```

## Validating the Import

```bash
# Count imported keys
redis-cli DBSIZE

# Check a specific record
redis-cli HGETALL product:1

# Scan all keys with prefix
redis-cli --scan --pattern "product:*" | wc -l
```

```javascript
async function validateImport(keyPrefix, expectedCount) {
  let count = 0;
  let cursor = '0';

  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', `${keyPrefix}:*`, 'COUNT', 100);
    cursor = newCursor;
    count += keys.length;
  } while (cursor !== '0');

  console.log(`Expected: ${expectedCount}, Found: ${count}`);
  return count === expectedCount;
}
```

## Handling Errors and Duplicates

```javascript
async function importCSVWithUpsert(filePath, options) {
  const { keyField, keyPrefix, batchSize = 500 } = options;
  const errors = [];

  const parser = fs.createReadStream(filePath).pipe(
    parse({ columns: true, skip_empty_lines: true })
  );

  let pipeline = redis.pipeline();
  let count = 0;

  for await (const record of parser) {
    try {
      const key = `${keyPrefix}:${record[keyField]}`;
      // HSET is idempotent - safe for upserts
      pipeline.hset(key, record);
      count++;

      if (count % batchSize === 0) {
        await pipeline.exec();
        pipeline = redis.pipeline();
      }
    } catch (err) {
      errors.push({ record, error: err.message });
    }
  }

  await pipeline.exec();

  if (errors.length > 0) {
    console.error(`${errors.length} errors during import`);
  }

  return { imported: count, errors };
}
```

## Summary

Importing CSV data into Redis is most efficient using pipeline batching to minimize round trips. For simple key-value imports use HSET to store CSV rows as Hashes, for ranked data use ZADD to build Sorted Sets, and for bulk CLI imports use the `redis-cli --pipe` mode with the inline command format. Always process in batches of 500-1000 records to balance memory usage and throughput.
