# How to Implement Map-Reduce Patterns Using Kubernetes Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Map-Reduce, Batch Processing

Description: Learn how to implement map-reduce patterns in Kubernetes using Jobs for distributed data processing, including map phase parallelization and reduce phase aggregation.

---

Map-reduce is a powerful pattern for processing large datasets by dividing work into parallel map tasks and then aggregating results in a reduce phase. Kubernetes Jobs provide a natural platform for implementing map-reduce workflows, with indexed jobs handling the map phase and a final job performing reduction.

This pattern works exceptionally well for data analysis, log processing, report aggregation, and any scenario where you can split work into independent chunks, process them in parallel, and combine the results.

## Basic Map-Reduce Architecture

A Kubernetes-based map-reduce consists of three phases: split the input data into chunks, run parallel map jobs to process each chunk, and run a reduce job to aggregate the results.

```yaml
# Phase 1: Split data (one-time job)
apiVersion: batch/v1
kind: Job
metadata:
  name: splitter
spec:
  template:
    spec:
      restartPolicy: OnFailure
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: mapreduce-data
      containers:
      - name: splitter
        image: splitter:latest
        volumeMounts:
        - name: data
          mountPath: /data
        command: ["python3", "/app/split.py"]
---
# Phase 2: Map (parallel processing)
apiVersion: batch/v1
kind: Job
metadata:
  name: mapper
spec:
  completions: 100
  parallelism: 20
  completionMode: Indexed
  template:
    spec:
      restartPolicy: OnFailure
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: mapreduce-data
      containers:
      - name: mapper
        image: mapper:latest
        volumeMounts:
        - name: data
          mountPath: /data
        command: ["python3", "/app/map.py"]
---
# Phase 3: Reduce (aggregation)
apiVersion: batch/v1
kind: Job
metadata:
  name: reducer
spec:
  template:
    spec:
      restartPolicy: OnFailure
      serviceAccountName: job-waiter
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: mapreduce-data
      initContainers:
      - name: wait-for-mappers
        image: bitnami/kubectl:latest
        command: ["kubectl", "wait", "--for=condition=complete", "--timeout=2h", "job/mapper"]
      containers:
      - name: reducer
        image: reducer:latest
        volumeMounts:
        - name: data
          mountPath: /data
        command: ["python3", "/app/reduce.py"]
```

## Implementing Word Count

The classic map-reduce example counts word frequencies across documents:

```python
#!/usr/bin/env python3
# split.py - Split large text file into chunks
import os

def split_file(input_file, num_chunks=100):
    """Split file into chunks for parallel processing"""
    with open(input_file, 'r') as f:
        lines = f.readlines()

    chunk_size = len(lines) // num_chunks
    os.makedirs('/data/chunks', exist_ok=True)

    for i in range(num_chunks):
        start = i * chunk_size
        end = start + chunk_size if i < num_chunks - 1 else len(lines)

        chunk_file = f'/data/chunks/chunk_{i:04d}.txt'
        with open(chunk_file, 'w') as f:
            f.writelines(lines[start:end])

    print(f"Split into {num_chunks} chunks")

if __name__ == "__main__":
    split_file('/data/input/large_text.txt')
```

Map phase processes each chunk:

```python
#!/usr/bin/env python3
# map.py - Count words in assigned chunk
import os
import json
from collections import Counter

def map_word_count(chunk_index):
    """Count words in a specific chunk"""
    chunk_file = f'/data/chunks/chunk_{chunk_index:04d}.txt'

    with open(chunk_file, 'r') as f:
        text = f.read().lower()

    # Split into words and count
    words = text.split()
    counts = Counter(words)

    # Write intermediate results
    output_file = f'/data/intermediate/map_{chunk_index:04d}.json'
    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    with open(output_file, 'w') as f:
        json.dump(counts, f)

    print(f"Mapped chunk {chunk_index}: {len(counts)} unique words")

if __name__ == "__main__":
    index = int(os.getenv('JOB_COMPLETION_INDEX', '0'))
    map_word_count(index)
```

Reduce phase aggregates results:

```python
#!/usr/bin/env python3
# reduce.py - Aggregate word counts from all mappers
import json
import os
from collections import Counter

def reduce_word_counts():
    """Aggregate all intermediate results"""
    total_counts = Counter()

    # Read all mapper outputs
    for filename in sorted(os.listdir('/data/intermediate')):
        if filename.startswith('map_') and filename.endswith('.json'):
            filepath = os.path.join('/data/intermediate', filename)

            with open(filepath, 'r') as f:
                counts = json.load(f)
                total_counts.update(counts)

    # Write final results
    with open('/data/output/word_counts.json', 'w') as f:
        json.dump(dict(total_counts.most_common()), f, indent=2)

    print(f"Reduced to {len(total_counts)} unique words")
    print(f"Top 10 words: {total_counts.most_common(10)}")

if __name__ == "__main__":
    os.makedirs('/data/output', exist_ok=True)
    reduce_word_counts()
```

## Log Analysis Map-Reduce

Process large log files to extract statistics:

```python
#!/usr/bin/env python3
# log_mapper.py - Extract metrics from log chunk
import os
import json
import re
from datetime import datetime

def parse_log_line(line):
    """Extract structured data from log line"""
    # Example: "2026-02-09 10:23:45 INFO [api] Request processed in 123ms"
    pattern = r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}) (\w+) \[(\w+)\] (.+) in (\d+)ms'
    match = re.match(pattern, line)

    if match:
        return {
            'timestamp': match.group(1),
            'level': match.group(2),
            'component': match.group(3),
            'duration_ms': int(match.group(5))
        }
    return None

def map_log_analysis(chunk_index):
    """Analyze log chunk"""
    chunk_file = f'/data/chunks/logs_{chunk_index:04d}.txt'

    stats = {
        'total_requests': 0,
        'errors': 0,
        'total_duration': 0,
        'max_duration': 0,
        'components': {}
    }

    with open(chunk_file, 'r') as f:
        for line in f:
            entry = parse_log_line(line.strip())
            if not entry:
                continue

            stats['total_requests'] += 1

            if entry['level'] == 'ERROR':
                stats['errors'] += 1

            duration = entry['duration_ms']
            stats['total_duration'] += duration
            stats['max_duration'] = max(stats['max_duration'], duration)

            component = entry['component']
            if component not in stats['components']:
                stats['components'][component] = 0
            stats['components'][component] += 1

    # Write intermediate stats
    output_file = f'/data/intermediate/stats_{chunk_index:04d}.json'
    with open(output_file, 'w') as f:
        json.dump(stats, f)

    print(f"Mapped chunk {chunk_index}: {stats['total_requests']} requests")

if __name__ == "__main__":
    index = int(os.getenv('JOB_COMPLETION_INDEX', '0'))
    os.makedirs('/data/intermediate', exist_ok=True)
    map_log_analysis(index)
```

Reduce aggregates statistics:

```python
#!/usr/bin/env python3
# log_reducer.py - Aggregate log statistics
import json
import os

def reduce_log_stats():
    """Combine stats from all mappers"""
    combined = {
        'total_requests': 0,
        'errors': 0,
        'total_duration': 0,
        'max_duration': 0,
        'components': {}
    }

    for filename in sorted(os.listdir('/data/intermediate')):
        if not filename.startswith('stats_'):
            continue

        with open(f'/data/intermediate/{filename}') as f:
            stats = json.load(f)

        combined['total_requests'] += stats['total_requests']
        combined['errors'] += stats['errors']
        combined['total_duration'] += stats['total_duration']
        combined['max_duration'] = max(combined['max_duration'], stats['max_duration'])

        for component, count in stats['components'].items():
            combined['components'][component] = combined['components'].get(component, 0) + count

    # Calculate averages
    if combined['total_requests'] > 0:
        combined['avg_duration'] = combined['total_duration'] / combined['total_requests']
        combined['error_rate'] = combined['errors'] / combined['total_requests']

    with open('/data/output/log_summary.json', 'w') as f:
        json.dump(combined, f, indent=2)

    print(f"Total requests: {combined['total_requests']}")
    print(f"Error rate: {combined.get('error_rate', 0):.2%}")
    print(f"Avg duration: {combined.get('avg_duration', 0):.2f}ms")

if __name__ == "__main__":
    reduce_log_stats()
```

## Database Query Map-Reduce

Process large database tables in parallel:

```javascript
// db_mapper.js - Process database partition
const { Pool } = require('pg');
const fs = require('fs');

const PARTITION_SIZE = 100000;

async function mapDatabasePartition() {
  const index = parseInt(process.env.JOB_COMPLETION_INDEX);
  const startId = index * PARTITION_SIZE + 1;
  const endId = (index + 1) * PARTITION_SIZE;

  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
  });

  console.log(`Processing IDs ${startId} to ${endId}`);

  const result = await pool.query(`
    SELECT
      category,
      COUNT(*) as count,
      AVG(amount) as avg_amount,
      SUM(amount) as total_amount
    FROM transactions
    WHERE id >= $1 AND id <= $2
    GROUP BY category
  `, [startId, endId]);

  // Write intermediate results
  const output = {
    partition: index,
    id_range: [startId, endId],
    stats: result.rows
  };

  fs.writeFileSync(
    `/data/intermediate/db_${index.toString().padStart(4, '0')}.json`,
    JSON.stringify(output, null, 2)
  );

  console.log(`Partition ${index} complete: ${result.rows.length} categories`);

  await pool.end();
}

mapDatabasePartition().catch(err => {
  console.error('Mapper failed:', err);
  process.exit(1);
});
```

Reducer combines database statistics:

```javascript
// db_reducer.js - Aggregate database statistics
const fs = require('fs');

function reduceDatabaseStats() {
  const categoryStats = {};

  // Read all mapper outputs
  const files = fs.readdirSync('/data/intermediate')
    .filter(f => f.startsWith('db_') && f.endsWith('.json'))
    .sort();

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(`/data/intermediate/${file}`));

    for (const stat of data.stats) {
      const category = stat.category;

      if (!categoryStats[category]) {
        categoryStats[category] = {
          count: 0,
          total_amount: 0,
          amounts: []
        };
      }

      categoryStats[category].count += parseInt(stat.count);
      categoryStats[category].total_amount += parseFloat(stat.total_amount);
    }
  }

  // Calculate final averages
  const final = {};
  for (const [category, stats] of Object.entries(categoryStats)) {
    final[category] = {
      count: stats.count,
      total_amount: stats.total_amount,
      avg_amount: stats.total_amount / stats.count
    };
  }

  fs.writeFileSync(
    '/data/output/database_summary.json',
    JSON.stringify(final, null, 2)
  );

  console.log('Reduction complete');
  console.log(`Categories processed: ${Object.keys(final).length}`);
}

reduceDatabaseStats();
```

## Monitoring Map-Reduce Progress

Track mapper completion:

```bash
#!/bin/bash
# monitor-mapreduce.sh

JOB_NAME="mapper"
TOTAL_COMPLETIONS=$(kubectl get job $JOB_NAME -o jsonpath='{.spec.completions}')

while true; do
  SUCCEEDED=$(kubectl get job $JOB_NAME -o jsonpath='{.status.succeeded}')
  ACTIVE=$(kubectl get job $JOB_NAME -o jsonpath='{.status.active}')
  FAILED=$(kubectl get job $JOB_NAME -o jsonpath='{.status.failed}')

  PERCENT=$((SUCCEEDED * 100 / TOTAL_COMPLETIONS))

  echo "Map Progress: $SUCCEEDED/$TOTAL_COMPLETIONS ($PERCENT%) | Active: $ACTIVE | Failed: $FAILED"

  if [ "$SUCCEEDED" -eq "$TOTAL_COMPLETIONS" ]; then
    echo "Map phase complete!"
    break
  fi

  sleep 10
done
```

The map-reduce pattern scales naturally in Kubernetes, using indexed jobs for parallel map tasks and standard jobs for reduction. This approach handles massive datasets efficiently by distributing processing across many pods.
