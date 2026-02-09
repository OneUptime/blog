# How to Use Job completionMode Indexed for Static Work Assignment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Batch Processing

Description: Master the Indexed completion mode in Kubernetes Jobs to assign specific work items to individual pods through deterministic index-based task distribution.

---

The Indexed completion mode transforms how you distribute work in Kubernetes Jobs. Instead of pods pulling tasks from a shared queue, each pod receives a unique completion index from 0 to N-1. This index tells the pod exactly which work item to process, creating a deterministic, predictable work distribution pattern.

This pattern excels when you have a known list of work items that can be mapped to indexes. Processing files from a numbered list, handling database partitions, or running parameter sweeps for simulations all benefit from indexed jobs where each pod knows its exact assignment upfront.

## Enabling Indexed Mode

Set completionMode to Indexed to enable index-based work assignment:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: indexed-processor
spec:
  completions: 10          # Create 10 completions (indexes 0-9)
  parallelism: 3           # Process 3 at a time
  completionMode: Indexed  # Enable indexed mode
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: processor:latest
        command:
        - /bin/bash
        - -c
        - |
          echo "Processing index: $JOB_COMPLETION_INDEX"
          ./process-item.sh $JOB_COMPLETION_INDEX
```

Kubernetes automatically assigns each pod an index through the JOB_COMPLETION_INDEX environment variable and the batch.kubernetes.io/job-completion-index annotation.

## Processing File Lists

Map each index to a specific file:

```python
#!/usr/bin/env python3
import os
import sys

# Define all files to process
FILES = [
    "/data/input/january.csv",
    "/data/input/february.csv",
    "/data/input/march.csv",
    "/data/input/april.csv",
    "/data/input/may.csv",
    "/data/input/june.csv",
    "/data/input/july.csv",
    "/data/input/august.csv",
    "/data/input/september.csv",
    "/data/input/october.csv",
]

def process_file(filepath):
    """Process a single data file"""
    print(f"Starting processing: {filepath}")

    with open(filepath, 'r') as f:
        lines = f.readlines()

    # Process each line
    results = []
    for line in lines:
        # Your processing logic
        processed = line.strip().upper()
        results.append(processed)

    # Write output
    output_path = filepath.replace('input', 'output').replace('.csv', '.processed.csv')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w') as f:
        f.write('\\n'.join(results))

    print(f"Completed: {filepath} -> {output_path}")
    return len(results)

def main():
    # Get assigned index
    index = int(os.getenv('JOB_COMPLETION_INDEX', '0'))

    if index >= len(FILES):
        print(f"Error: Index {index} out of range (max {len(FILES)-1})")
        sys.exit(1)

    # Process the assigned file
    filepath = FILES[index]
    count = process_file(filepath)

    print(f"Index {index} complete: processed {count} records from {filepath}")

if __name__ == "__main__":
    main()
```

Deploy with completions matching the file count:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: file-processor
spec:
  completions: 10  # Must match len(FILES)
  parallelism: 5
  completionMode: Indexed
  template:
    spec:
      restartPolicy: OnFailure
      volumes:
      - name: data
        persistentVolumeClaim:
          claimName: data-pvc
      containers:
      - name: processor
        image: file-processor:latest
        volumeMounts:
        - name: data
          mountPath: /data
        command: ["python3", "/app/process.py"]
```

Each pod processes exactly one file, with no coordination needed.

## Database Partition Processing

Divide database records into ranges by index:

```javascript
// Node.js example for partitioned database processing
const { Pool } = require('pg');

// Each index handles a specific ID range
const PARTITION_SIZE = 100000;

async function processPartition(index) {
  const pool = new Pool({
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  // Calculate ID range for this partition
  const startId = index * PARTITION_SIZE + 1;
  const endId = (index + 1) * PARTITION_SIZE;

  console.log(`Processing partition ${index}: IDs ${startId} to ${endId}`);

  // Process in batches to avoid memory issues
  const batchSize = 1000;
  let processed = 0;

  for (let currentId = startId; currentId <= endId; currentId += batchSize) {
    const maxId = Math.min(currentId + batchSize - 1, endId);

    const result = await pool.query(
      `UPDATE orders
       SET processed = true, processed_at = NOW()
       WHERE id >= $1 AND id <= $2 AND processed = false`,
      [currentId, maxId]
    );

    processed += result.rowCount;

    if (processed % 10000 === 0) {
      console.log(`Partition ${index} progress: ${processed} records`);
    }
  }

  await pool.end();

  console.log(`Partition ${index} complete: ${processed} records processed`);
  return processed;
}

async function main() {
  const index = parseInt(process.env.JOB_COMPLETION_INDEX || '0');

  try {
    const count = await processPartition(index);
    console.log(`Success: Index ${index} processed ${count} records`);
    process.exit(0);
  } catch (error) {
    console.error(`Failed to process partition ${index}:`, error);
    process.exit(1);
  }
}

main();
```

Calculate completions based on total records:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-processor
spec:
  completions: 50  # 5 million records / 100k per partition
  parallelism: 10
  completionMode: Indexed
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: db-processor:latest
        env:
        - name: DB_HOST
          value: postgres
        - name: DB_NAME
          value: production
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: db-creds
              key: username
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: db-creds
              key: password
```

## Parameter Sweep Simulations

Run simulations with different parameters per index:

```go
package main

import (
    "fmt"
    "os"
    "strconv"
)

type SimConfig struct {
    Index       int
    Temperature float64
    Pressure    float64
    Catalyst    string
    Duration    int
}

func getConfigurations() []SimConfig {
    // Define all parameter combinations
    return []SimConfig{
        {0, 273.15, 101.325, "platinum", 3600},
        {1, 298.15, 101.325, "platinum", 3600},
        {2, 323.15, 101.325, "platinum", 3600},
        {3, 273.15, 101.325, "palladium", 3600},
        {4, 298.15, 101.325, "palladium", 3600},
        {5, 323.15, 101.325, "palladium", 3600},
        {6, 273.15, 200.000, "platinum", 3600},
        {7, 298.15, 200.000, "platinum", 3600},
        {8, 323.15, 200.000, "platinum", 3600},
        {9, 273.15, 200.000, "palladium", 3600},
    }
}

func runSimulation(config SimConfig) error {
    fmt.Printf("Running simulation %d\\n", config.Index)
    fmt.Printf("  Temperature: %.2f K\\n", config.Temperature)
    fmt.Printf("  Pressure: %.2f kPa\\n", config.Pressure)
    fmt.Printf("  Catalyst: %s\\n", config.Catalyst)
    fmt.Printf("  Duration: %d s\\n", config.Duration)

    // Your simulation code here
    // ...

    // Save results
    filename := fmt.Sprintf("/results/simulation_%03d.json", config.Index)
    // Write results to file

    fmt.Printf("Simulation %d complete, results saved to %s\\n",
        config.Index, filename)

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
        fmt.Printf("Error parsing index: %v\\n", err)
        os.Exit(1)
    }

    configs := getConfigurations()
    if index >= len(configs) {
        fmt.Printf("Error: Index %d exceeds configuration count\\n", index)
        os.Exit(1)
    }

    config := configs[index]
    if err := runSimulation(config); err != nil {
        fmt.Printf("Simulation failed: %v\\n", err)
        os.Exit(1)
    }
}
```

## Accessing Index via Annotation

You can also read the index from pod annotations:

```python
#!/usr/bin/env python3
import os

# Method 1: Environment variable (recommended)
index_from_env = os.getenv('JOB_COMPLETION_INDEX')

# Method 2: Downward API with annotation
# Configure in pod spec:
# env:
# - name: COMPLETION_INDEX
#   valueFrom:
#     fieldRef:
#       fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']

index_from_annotation = os.getenv('COMPLETION_INDEX')

print(f"Index from env: {index_from_env}")
print(f"Index from annotation: {index_from_annotation}")
```

Pod spec with annotation access:

```yaml
spec:
  containers:
  - name: processor
    image: processor:latest
    env:
    - name: JOB_COMPLETION_INDEX  # Automatically available
      # Don't need to specify - Kubernetes sets this
    - name: INDEX_FROM_ANNOTATION
      valueFrom:
        fieldRef:
          fieldPath: metadata.annotations['batch.kubernetes.io/job-completion-index']
```

## Tracking Progress by Index

Monitor which indexes have completed:

```bash
# List pods with their indexes
kubectl get pods -l job-name=indexed-processor \
  -o custom-columns=POD:.metadata.name,INDEX:.metadata.annotations.batch\\.kubernetes\\.io/job-completion-index,STATUS:.status.phase

# Get completed indexes
kubectl get pods -l job-name=indexed-processor \
  --field-selector=status.phase=Succeeded \
  -o jsonpath='{range .items[*]}{.metadata.annotations.batch\.kubernetes\.io/job-completion-index}{"\n"}{end}' | \
  sort -n

# Get failed indexes
kubectl get pods -l job-name=indexed-processor \
  --field-selector=status.phase=Failed \
  -o jsonpath='{range .items[*]}{.metadata.annotations.batch\.kubernetes\.io/job-completion-index}{"\n"}{end}' | \
  sort -n

# Check logs for specific index
kubectl logs -l job-name=indexed-processor,batch.kubernetes.io/job-completion-index=5
```

## Handling Failed Indexes

With Pod Failure Policies, you can fail specific indexes:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: indexed-with-failure-handling
spec:
  completions: 100
  parallelism: 10
  completionMode: Indexed
  backoffLimit: 3
  podFailurePolicy:
    rules:
    # If this specific index has bad input, fail just this index
    - action: FailIndex
      onExitCodes:
        operator: In
        values: [3]  # Invalid input error
    # Config errors fail entire job
    - action: FailJob
      onExitCodes:
        operator: In
        values: [2]  # Config error
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: processor
        image: processor:latest
```

With FailIndex, bad input at index 42 fails only that index while others continue.

## Dynamic Work List Loading

Load work items from ConfigMap or external source:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: work-items
data:
  items.json: |
    [
      {"id": 0, "file": "data/file001.csv"},
      {"id": 1, "file": "data/file002.csv"},
      {"id": 2, "file": "data/file003.csv"},
      {"id": 3, "file": "data/file004.csv"},
      {"id": 4, "file": "data/file005.csv"}
    ]
---
apiVersion: batch/v1
kind: Job
metadata:
  name: dynamic-indexed
spec:
  completions: 5
  completionMode: Indexed
  template:
    spec:
      restartPolicy: OnFailure
      volumes:
      - name: work-items
        configMap:
          name: work-items
      containers:
      - name: processor
        image: python:3.11-slim
        volumeMounts:
        - name: work-items
          mountPath: /config
        command:
        - python3
        - -c
        - |
          import json
          import os

          # Load work items
          with open('/config/items.json') as f:
              items = json.load(f)

          # Get assigned index
          index = int(os.getenv('JOB_COMPLETION_INDEX'))

          # Process assigned item
          item = items[index]
          print(f"Processing {item}")
```

## Best Practices

Always validate that your completion count matches your work item count. Mismatches lead to pods failing or work being skipped.

Use indexed mode when work items are known upfront and can be enumerated. For dynamic work queues, use the standard work queue pattern instead.

Include the index in output filenames or database records to avoid conflicts:

```python
# Good: unique output per index
output_file = f"/results/index_{index:04d}_output.json"

# Bad: all indexes write to same file
output_file = "/results/output.json"  # Race condition!
```

Indexed completion mode provides deterministic work assignment perfect for batch processing known sets of items. Each pod knows exactly which work item it should handle, eliminating coordination overhead and simplifying failure recovery.
