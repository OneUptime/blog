# How to Use Indexed Jobs for Parallel Processing with Unique Work Items

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Parallel Processing

Description: Learn how to use Kubernetes Indexed Jobs to assign unique work items to parallel pods for efficient batch processing and data parallelization.

---

Indexed Jobs in Kubernetes provide a powerful pattern for parallel processing where each pod needs to work on a specific, unique piece of work. Unlike regular parallel jobs where pods pull work from a shared queue, indexed jobs assign each pod a unique completion index from 0 to N-1.

This pattern is perfect for scenarios like processing specific files from a list, handling distinct database partitions, or running simulations with different parameters. Each pod knows exactly which work item it should handle based on its assigned index.

## Understanding Indexed Jobs

When you create an indexed job, Kubernetes automatically assigns each pod a completion index through environment variables and annotations. Your application reads this index and determines which specific work item to process.

The completion index is exposed in two ways. First, through the `JOB_COMPLETION_INDEX` environment variable available inside the pod. Second, through the `batch.kubernetes.io/job-completion-index` annotation on the pod itself.

## Creating a Basic Indexed Job

Here's how to define an indexed job that processes 10 unique work items in parallel:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: data-processor
spec:
  completions: 10          # Total number of work items
  parallelism: 3           # Process 3 items at a time
  completionMode: Indexed  # Enable indexed mode
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: my-processor:latest
        env:
        - name: WORK_INDEX
          valueFrom:
            fieldRef:
              fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
        command:
        - /bin/bash
        - -c
        - |
          # The completion index tells us which work item to process
          echo "Processing work item: $JOB_COMPLETION_INDEX"
          ./process-item.sh $JOB_COMPLETION_INDEX
```

In this configuration, Kubernetes creates pods with indexes 0 through 9. At any given time, three pods run in parallel. When one completes, Kubernetes starts the next pending pod with its assigned index.

## Processing Files by Index

A common use case is processing a known list of files. Each pod processes one specific file based on its index:

```python
#!/usr/bin/env python3
import os
import sys

# Files we need to process
files = [
    "data/january.csv",
    "data/february.csv",
    "data/march.csv",
    "data/april.csv",
    "data/may.csv",
    "data/june.csv",
    "data/july.csv",
    "data/august.csv",
    "data/september.csv",
    "data/october.csv"
]

def process_file(filepath):
    """Process a single data file"""
    print(f"Processing {filepath}")

    # Read and process the file
    with open(filepath, 'r') as f:
        lines = f.readlines()

    # Do your processing here
    processed_count = 0
    for line in lines:
        # Process each line
        processed_count += 1

    print(f"Processed {processed_count} records from {filepath}")
    return processed_count

def main():
    # Get the completion index from environment
    index = int(os.getenv('JOB_COMPLETION_INDEX', '0'))

    if index >= len(files):
        print(f"Error: Index {index} exceeds file list length")
        sys.exit(1)

    # Process the file assigned to this index
    target_file = files[index]
    total = process_file(target_file)

    print(f"Successfully processed index {index}: {target_file} ({total} records)")

if __name__ == "__main__":
    main()
```

This approach ensures each file gets processed exactly once, with no overlap between pods. You know upfront how many files you have, so you set completions to match.

## Database Partition Processing

Another powerful pattern is processing database partitions. Each pod handles a specific range of IDs or a particular shard:

```javascript
// Node.js example for processing database partitions
const { Pool } = require('pg');

// Database connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Define partition boundaries (could also be loaded from config)
const partitions = [
  { start: 1, end: 100000 },
  { start: 100001, end: 200000 },
  { start: 200001, end: 300000 },
  { start: 300001, end: 400000 },
  { start: 400001, end: 500000 },
];

async function processPartition(partition) {
  const { start, end } = partition;
  console.log(`Processing IDs from ${start} to ${end}`);

  // Process records in batches to avoid memory issues
  const batchSize = 1000;
  let processed = 0;

  for (let currentId = start; currentId <= end; currentId += batchSize) {
    const maxId = Math.min(currentId + batchSize - 1, end);

    const result = await pool.query(
      'UPDATE users SET processed = true WHERE id >= $1 AND id <= $2 AND processed = false',
      [currentId, maxId]
    );

    processed += result.rowCount;

    if (processed % 10000 === 0) {
      console.log(`Progress: ${processed} records processed`);
    }
  }

  console.log(`Partition complete: ${processed} total records processed`);
  return processed;
}

async function main() {
  const index = parseInt(process.env.JOB_COMPLETION_INDEX || '0');

  if (index >= partitions.length) {
    console.error(`Error: Index ${index} exceeds partition count`);
    process.exit(1);
  }

  const partition = partitions[index];
  console.log(`Starting job with index ${index}`);

  try {
    const count = await processPartition(partition);
    console.log(`Successfully completed partition ${index}: ${count} records`);
  } catch (error) {
    console.error(`Failed to process partition ${index}:`, error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
```

## Running Simulations with Different Parameters

Indexed jobs excel at running multiple simulations or experiments with different configurations:

```go
package main

import (
    "fmt"
    "os"
    "strconv"
)

// Simulation parameters for each index
type SimulationConfig struct {
    Index       int
    Temperature float64
    Pressure    float64
    Duration    int
}

func getConfigs() []SimulationConfig {
    return []SimulationConfig{
        {0, 273.15, 101.325, 3600},
        {1, 298.15, 101.325, 3600},
        {2, 323.15, 101.325, 3600},
        {3, 273.15, 200.000, 3600},
        {4, 298.15, 200.000, 3600},
        {5, 323.15, 200.000, 3600},
        {6, 273.15, 50.000, 3600},
        {7, 298.15, 50.000, 3600},
    }
}

func runSimulation(config SimulationConfig) error {
    fmt.Printf("Running simulation %d: T=%.2fK, P=%.2fkPa, Duration=%ds\n",
        config.Index, config.Temperature, config.Pressure, config.Duration)

    // Your simulation logic here
    // This is where you'd run your actual computation

    // Simulate some work
    for i := 0; i < config.Duration; i++ {
        if i%600 == 0 {
            fmt.Printf("Simulation %d progress: %d/%d seconds\n",
                config.Index, i, config.Duration)
        }
        // Do simulation step
    }

    fmt.Printf("Simulation %d complete\n", config.Index)
    return nil
}

func main() {
    indexStr := os.Getenv("JOB_COMPLETION_INDEX")
    if indexStr == "" {
        fmt.Println("Error: JOB_COMPLETION_INDEX not set")
        os.Exit(1)
    }

    index, err := strconv.Atoi(indexStr)
    if err != nil {
        fmt.Printf("Error parsing index: %v\n", err)
        os.Exit(1)
    }

    configs := getConfigs()
    if index >= len(configs) {
        fmt.Printf("Error: Index %d exceeds config count\n", index)
        os.Exit(1)
    }

    config := configs[index]
    if err := runSimulation(config); err != nil {
        fmt.Printf("Simulation failed: %v\n", err)
        os.Exit(1)
    }
}
```

## Monitoring Indexed Job Progress

You can track which indexes have completed and which are still running:

```bash
# Get the job status
kubectl get job data-processor

# See which pods have completed
kubectl get pods -l job-name=data-processor \
  --sort-by=.metadata.annotations.batch\.kubernetes\.io/job-completion-index

# Check logs for a specific index
kubectl logs -l job-name=data-processor,batch.kubernetes.io/job-completion-index=5

# Get detailed status of all indexes
kubectl get pods -l job-name=data-processor -o json | \
  jq -r '.items[] | "\(.metadata.annotations["batch.kubernetes.io/job-completion-index"]): \(.status.phase)"'
```

## Handling Dynamic Work Lists

If your work list comes from an external source, you can load it at runtime using an init container or ConfigMap:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: dynamic-processor
spec:
  completions: 50
  parallelism: 5
  completionMode: Indexed
  template:
    spec:
      restartPolicy: OnFailure
      volumes:
      - name: worklist
        configMap:
          name: work-items
      containers:
      - name: processor
        image: processor:latest
        volumeMounts:
        - name: worklist
          mountPath: /config
        command:
        - /bin/bash
        - -c
        - |
          INDEX=$JOB_COMPLETION_INDEX
          # Read the work item for this index from the config
          WORK_ITEM=$(sed -n "$((INDEX + 1))p" /config/items.txt)
          echo "Processing: $WORK_ITEM"
          ./process.sh "$WORK_ITEM"
```

Indexed jobs give you precise control over parallel processing when you know exactly how many work items you have. Each pod gets a unique assignment, making it perfect for data parallelization, batch processing, and distributed computations where static work assignment makes sense.
