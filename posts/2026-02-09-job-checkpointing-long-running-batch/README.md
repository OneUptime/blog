# How to Implement Job Checkpointing for Long-Running Batch Processes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Batch Processing, Checkpointing

Description: Learn how to implement checkpointing in Kubernetes Jobs to save progress of long-running batch processes, enabling recovery from failures without losing work.

---

Long-running batch jobs face a critical problem: if the pod fails or gets evicted after hours of processing, all that work is lost. Checkpointing solves this by periodically saving progress, allowing jobs to resume from the last checkpoint rather than starting over.

This pattern is essential for jobs that process large datasets, perform complex computations, or run for hours. Without checkpointing, a failure near completion means repeating all the work. With checkpointing, you resume within minutes of where you left off.

## Basic Checkpointing Pattern

The core idea is simple: save progress markers to persistent storage and check for them at startup.

```python
#!/usr/bin/env python3
import os
import json
import time

CHECKPOINT_FILE = '/data/checkpoint.json'

def save_checkpoint(progress):
    """Save current progress to checkpoint file"""
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(progress, f)
    print(f"Checkpoint saved: {progress}")

def load_checkpoint():
    """Load checkpoint if it exists"""
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE, 'r') as f:
            progress = json.load(f)
        print(f"Resuming from checkpoint: {progress}")
        return progress
    return None

def process_items(items):
    """Process items with checkpointing"""
    checkpoint = load_checkpoint()

    # Determine starting point
    if checkpoint:
        start_index = checkpoint['last_processed_index'] + 1
        print(f"Resuming from index {start_index}")
    else:
        start_index = 0
        print("Starting from beginning")

    # Process items
    for i in range(start_index, len(items)):
        item = items[i]

        print(f"Processing item {i}: {item}")
        # Do actual work here
        time.sleep(1)

        # Save checkpoint every 10 items
        if i % 10 == 0:
            save_checkpoint({
                'last_processed_index': i,
                'timestamp': time.time()
            })

    # Final checkpoint
    save_checkpoint({
        'last_processed_index': len(items) - 1,
        'completed': True,
        'timestamp': time.time()
    })

    print("Processing complete")

if __name__ == "__main__":
    # Load items to process
    items = list(range(1000))  # Example: 1000 items

    process_items(items)
```

Deploy with persistent storage:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: batch-checkpoint
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: batch/v1
kind: Job
metadata:
  name: checkpointed-job
spec:
  backoffLimit: 10  # Allow multiple retries
  template:
    spec:
      restartPolicy: OnFailure
      volumes:
      - name: checkpoint
        persistentVolumeClaim:
          claimName: batch-checkpoint
      containers:
      - name: processor
        image: processor:latest
        volumeMounts:
        - name: checkpoint
          mountPath: /data
        command: ["python3", "/app/process.py"]
```

## Database Checkpointing

Store checkpoint state in a database:

```python
#!/usr/bin/env python3
import psycopg2
import os

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(os.getenv('DATABASE_URL'))

def initialize_checkpoint_table():
    """Create checkpoint table if it doesn't exist"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS job_checkpoints (
            job_name VARCHAR(255) PRIMARY KEY,
            last_processed_id INTEGER,
            last_update TIMESTAMP DEFAULT NOW(),
            metadata JSONB
        )
    """)

    conn.commit()
    conn.close()

def save_checkpoint_db(job_name, last_id, metadata=None):
    """Save checkpoint to database"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO job_checkpoints (job_name, last_processed_id, metadata)
        VALUES (%s, %s, %s)
        ON CONFLICT (job_name)
        DO UPDATE SET
            last_processed_id = EXCLUDED.last_processed_id,
            last_update = NOW(),
            metadata = EXCLUDED.metadata
    """, (job_name, last_id, json.dumps(metadata or {})))

    conn.commit()
    conn.close()

def load_checkpoint_db(job_name):
    """Load checkpoint from database"""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT last_processed_id, metadata
        FROM job_checkpoints
        WHERE job_name = %s
    """, (job_name,))

    row = cursor.fetchone()
    conn.close()

    if row:
        return {'last_id': row[0], 'metadata': row[1]}
    return None

def process_database_records():
    """Process database records with checkpointing"""
    job_name = os.getenv('JOB_NAME', 'data-processor')
    batch_size = 1000

    initialize_checkpoint_table()
    checkpoint = load_checkpoint_db(job_name)

    # Determine starting point
    if checkpoint:
        start_id = checkpoint['last_id'] + 1
        print(f"Resuming from ID {start_id}")
    else:
        start_id = 0
        print("Starting from beginning")

    conn = get_db_connection()
    cursor = conn.cursor()

    # Process in batches
    current_id = start_id
    while True:
        # Fetch batch
        cursor.execute("""
            SELECT id, data
            FROM large_table
            WHERE id >= %s
            ORDER BY id
            LIMIT %s
        """, (current_id, batch_size))

        rows = cursor.fetchall()
        if not rows:
            break

        # Process batch
        for row_id, data in rows:
            # Do processing
            process_record(data)
            current_id = row_id

        # Save checkpoint after each batch
        save_checkpoint_db(job_name, current_id)
        print(f"Processed up to ID {current_id}")

    conn.close()
    print("Processing complete")
```

## File-Based Checkpointing with Markers

Track processed files using marker files:

```bash
#!/bin/bash
# process-with-checkpoints.sh

CHECKPOINT_DIR="/data/checkpoints"
INPUT_DIR="/data/input"
OUTPUT_DIR="/data/output"

mkdir -p "$CHECKPOINT_DIR"

# Get list of all input files
find "$INPUT_DIR" -name "*.csv" | sort > /tmp/all_files.txt

while IFS= read -r input_file; do
  filename=$(basename "$input_file")
  checkpoint_file="$CHECKPOINT_DIR/$filename.done"

  # Skip if already processed
  if [ -f "$checkpoint_file" ]; then
    echo "Skipping $filename (already processed)"
    continue
  fi

  echo "Processing $filename..."

  # Process the file
  if ./process-file.sh "$input_file" "$OUTPUT_DIR/$filename"; then
    # Mark as complete
    touch "$checkpoint_file"
    echo "$filename complete"
  else
    echo "Error processing $filename"
    exit 1
  fi
done < /tmp/all_files.txt

echo "All files processed"
```

## Stateful Set for Checkpointing

Use StatefulSets for jobs that need stable storage:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: batch-processor
spec:
  serviceName: batch-processor
  replicas: 1
  selector:
    matchLabels:
      app: batch-processor
  template:
    metadata:
      labels:
        app: batch-processor
    spec:
      containers:
      - name: processor
        image: processor:latest
        volumeMounts:
        - name: checkpoint
          mountPath: /data
        command:
        - /bin/bash
        - -c
        - |
          # Run until complete
          python3 /app/process_with_checkpoints.py

          # Signal completion
          touch /data/COMPLETED

          # Keep pod alive for result inspection
          sleep 3600
  volumeClaimTemplates:
  - metadata:
      name: checkpoint
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

## Multi-Stage Checkpointing

Track progress through multiple stages:

```python
#!/usr/bin/env python3
import json
import os

CHECKPOINT_FILE = '/data/checkpoint.json'

def load_checkpoint():
    if os.path.exists(CHECKPOINT_FILE):
        with open(CHECKPOINT_FILE) as f:
            return json.load(f)
    return {
        'stage': 'extract',
        'extract_progress': 0,
        'transform_progress': 0,
        'load_progress': 0
    }

def save_checkpoint(checkpoint):
    with open(CHECKPOINT_FILE, 'w') as f:
        json.dump(checkpoint, f)

def run_pipeline():
    checkpoint = load_checkpoint()

    # Stage 1: Extract
    if checkpoint['stage'] == 'extract':
        print("Running extract stage...")
        extract_data(checkpoint['extract_progress'])
        checkpoint['stage'] = 'transform'
        checkpoint['extract_progress'] = 100
        save_checkpoint(checkpoint)

    # Stage 2: Transform
    if checkpoint['stage'] == 'transform':
        print("Running transform stage...")
        transform_data(checkpoint['transform_progress'])
        checkpoint['stage'] = 'load'
        checkpoint['transform_progress'] = 100
        save_checkpoint(checkpoint)

    # Stage 3: Load
    if checkpoint['stage'] == 'load':
        print("Running load stage...")
        load_data(checkpoint['load_progress'])
        checkpoint['stage'] = 'complete'
        checkpoint['load_progress'] = 100
        save_checkpoint(checkpoint)

    print("Pipeline complete!")
```

## Checkpointing with Redis

Use Redis for distributed checkpointing:

```python
#!/usr/bin/env python3
import redis
import json
import os

def get_redis():
    return redis.Redis(host='redis', port=6379, decode_responses=True)

def save_checkpoint_redis(job_id, progress):
    """Save checkpoint to Redis"""
    r = get_redis()
    checkpoint_key = f"checkpoint:{job_id}"

    r.set(checkpoint_key, json.dumps(progress))
    r.expire(checkpoint_key, 86400 * 7)  # Keep for 7 days

def load_checkpoint_redis(job_id):
    """Load checkpoint from Redis"""
    r = get_redis()
    checkpoint_key = f"checkpoint:{job_id}"

    data = r.get(checkpoint_key)
    if data:
        return json.loads(data)
    return None

def process_with_redis_checkpoint():
    job_id = os.getenv('JOB_ID', 'default-job')
    checkpoint = load_checkpoint_redis(job_id)

    start_index = checkpoint['last_index'] + 1 if checkpoint else 0

    for i in range(start_index, 10000):
        # Process item
        process_item(i)

        # Checkpoint every 100 items
        if i % 100 == 0:
            save_checkpoint_redis(job_id, {'last_index': i})
```

## Automatic Cleanup

Clean up checkpoints after successful completion:

```python
def cleanup_checkpoint():
    """Remove checkpoint file after successful completion"""
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)
        print("Checkpoint removed")

# At end of successful run
try:
    process_items(items)
    cleanup_checkpoint()
except Exception as e:
    print(f"Job failed, checkpoint preserved: {e}")
    raise
```

Checkpointing is essential for long-running Kubernetes Jobs. Store progress regularly to persistent storage, resume from the last checkpoint on restart, and clean up checkpoints after successful completion. This pattern makes batch processing resilient to pod failures and cluster disruptions.
