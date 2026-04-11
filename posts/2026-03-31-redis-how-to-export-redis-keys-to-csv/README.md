# How to Export Redis Keys to CSV

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, CSV, Data Export, Node.js, Python

Description: Export Redis keys and their values to CSV files using SCAN for safe key enumeration and streaming writes for large datasets without memory issues.

---

## Why Export Redis Data to CSV

Exporting Redis data to CSV is useful for:
- Analysis in spreadsheet tools
- Data migration to other systems
- Audit reports
- Backup of structured data stored as Hashes

## Method 1: Redis CLI One-Liner

For simple String keys:

```bash
# Export all keys matching a pattern with their values
redis-cli --scan --pattern "user:*" | while read key; do
  value=$(redis-cli GET "$key")
  echo "$key,$value"
done > users.csv
```

For Hash keys:

```bash
# Export Hash fields as CSV rows
redis-cli --scan --pattern "product:*" | while read key; do
  redis-cli HGETALL "$key" | paste - - | awk '{print "'"$key"'," $1 "," $2}'
done > products.csv
```

## Method 2: Node.js with Streaming CSV

```bash
npm install ioredis csv-stringify
```

```javascript
const Redis = require('ioredis');
const { stringify } = require('csv-stringify');
const fs = require('fs');

const redis = new Redis({ host: process.env.REDIS_HOST || 'localhost' });

async function exportHashesToCSV(pattern, outputFile) {
  const writeStream = fs.createWriteStream(outputFile);
  const csvStringifier = stringify({ header: true });
  csvStringifier.pipe(writeStream);

  let cursor = '0';
  let exportedCount = 0;
  let headersWritten = false;

  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
    cursor = newCursor;

    for (const key of keys) {
      const type = await redis.type(key);
      if (type !== 'hash') continue;

      const data = await redis.hgetall(key);

      if (!headersWritten) {
        // Use the first key's fields as headers
        csvStringifier.write({ key, ...data });
        headersWritten = true;
      } else {
        csvStringifier.write({ key, ...data });
      }

      exportedCount++;
    }
  } while (cursor !== '0');

  csvStringifier.end();

  await new Promise((resolve) => writeStream.on('finish', resolve));
  console.log(`Exported ${exportedCount} records to ${outputFile}`);
}

// Export all product hashes
await exportHashesToCSV('product:*', 'products.csv');
await redis.quit();
```

## Method 3: Export Sorted Set Leaderboard to CSV

```javascript
async function exportSortedSetToCSV(key, outputFile, withScores = true) {
  const writeStream = fs.createWriteStream(outputFile);

  // Write CSV header
  writeStream.write(withScores ? 'rank,member,score\n' : 'rank,member\n');

  const total = await redis.zcard(key);
  const BATCH = 500;

  for (let start = 0; start < total; start += BATCH) {
    const end = Math.min(start + BATCH - 1, total - 1);
    const entries = await redis.zrange(key, start, end, 'REV', 'WITHSCORES');

    for (let i = 0; i < entries.length; i += 2) {
      const rank = start + Math.floor(i / 2) + 1;
      const member = entries[i].replace(/"/g, '""'); // Escape double quotes for CSV
      const score = entries[i + 1];

      writeStream.write(withScores ? `${rank},"${member}",${score}\n` : `${rank},"${member}"\n`);
    }
  }

  writeStream.end();
  await new Promise((resolve) => writeStream.on('finish', resolve));
  console.log(`Exported ${total} entries from ${key} to ${outputFile}`);
}

await exportSortedSetToCSV('leaderboard:global', 'leaderboard.csv');
```

## Method 4: Python Export with csv Module

```python
import redis
import csv

r = redis.Redis(host='localhost', port=6379, decode_responses=True)

def export_hashes_to_csv(pattern, output_file):
    all_fields = set()
    records = []

    cursor = 0
    while True:
        cursor, keys = r.scan(cursor, match=pattern, count=100)
        for key in keys:
            data = r.hgetall(key)
            data['_key'] = key
            records.append(data)
            all_fields.update(data.keys())
        if cursor == 0:
            break

    # Write CSV with consistent columns
    fieldnames = ['_key'] + sorted(all_fields - {'_key'})

    with open(output_file, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(records)

    print(f"Exported {len(records)} records to {output_file}")
    return len(records)

export_hashes_to_csv('user:*', 'users.csv')
```

## Batch Export with Memory Efficiency

```javascript
async function* scanKeys(redis, pattern, batchSize = 100) {
  let cursor = '0';
  do {
    const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', batchSize);
    cursor = newCursor;
    if (keys.length > 0) yield keys;
  } while (cursor !== '0');
}

async function exportLargeDatasetToCSV(pattern, outputFile) {
  const writeStream = fs.createWriteStream(outputFile);
  let rowCount = 0;

  for await (const keys of scanKeys(redis, pattern, 200)) {
    // Fetch all hashes in parallel for this batch
    const pipeline = redis.pipeline();
    for (const key of keys) {
      pipeline.hgetall(key);
    }
    const results = await pipeline.exec();

    for (let i = 0; i < keys.length; i++) {
      const data = results[i][1];
      if (!data) continue;

      if (rowCount === 0) {
        writeStream.write('key,' + Object.keys(data).join(',') + '\n');
      }

      const values = [keys[i], ...Object.values(data).map(v => `"${v}"`)];
      writeStream.write(values.join(',') + '\n');
      rowCount++;
    }
  }

  writeStream.end();
  await new Promise((resolve) => writeStream.on('finish', resolve));
  console.log(`Exported ${rowCount} records`);
}
```

## Summary

Exporting Redis keys to CSV requires safe key enumeration using SCAN (never KEYS in production) and streaming writes to handle large datasets without memory issues. Use pipeline batching to fetch multiple Hash values in parallel, and always handle edge cases like missing fields or varied field sets across records by collecting all unique field names before writing the CSV header.
