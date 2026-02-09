# How to Implement Work Queue Patterns with Kubernetes Jobs and Redis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jobs, Redis, Queue

Description: Learn how to build scalable work queue patterns using Kubernetes Jobs and Redis for distributed task processing and dynamic workload management.

---

Work queue patterns let you process large numbers of tasks using a pool of workers that pull work items from a shared queue. Combining Kubernetes Jobs with Redis creates a flexible, scalable system for batch processing where the number of work items isn't known upfront.

This pattern excels when you have dynamic workloads, tasks arriving continuously, or when you want to decouple work submission from processing. Redis serves as the reliable queue, while Kubernetes Jobs provide the worker pool with automatic scaling and failure handling.

## Setting Up Redis for the Work Queue

First, deploy Redis to serve as your queue backend:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: redis-queue
spec:
  ports:
  - port: 6379
    targetPort: 6379
  selector:
    app: redis-queue
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis-queue
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis-queue
  template:
    metadata:
      labels:
        app: redis-queue
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        volumeMounts:
        - name: redis-data
          mountPath: /data
        command:
        - redis-server
        - --appendonly yes
        - --appendfsync everysec
      volumes:
      - name: redis-data
        persistentVolumeClaim:
          claimName: redis-pvc
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: redis-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 10Gi
```

This configuration enables append-only file persistence so your queue survives Redis restarts. Work items won't be lost even if Redis crashes.

## Populating the Work Queue

Create a script or job to populate Redis with work items:

```python
#!/usr/bin/env python3
import redis
import json
import sys

def populate_queue(items):
    """Push work items into Redis queue"""
    r = redis.Redis(host='redis-queue', port=6379, decode_responses=True)

    # Clear any existing items
    r.delete('work-queue')

    # Push all items to the queue
    for item in items:
        work_data = json.dumps(item)
        r.rpush('work-queue', work_data)

    count = r.llen('work-queue')
    print(f"Queue populated with {count} items")
    return count

def main():
    # Generate work items (in practice, load from database or file)
    work_items = []

    # Example: Process a list of files
    for i in range(1000):
        work_items.append({
            'id': i,
            'type': 'file-processing',
            'file_path': f's3://data-bucket/files/file-{i:04d}.csv',
            'output_path': f's3://results-bucket/processed/file-{i:04d}.json'
        })

    count = populate_queue(work_items)
    print(f"Ready to process {count} items")

if __name__ == "__main__":
    main()
```

Run this as a Kubernetes Job before starting your workers:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: populate-queue
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: populator
        image: queue-populator:latest
        command: ["python3", "/app/populate_queue.py"]
```

## Creating Worker Jobs

Now create a Job that spawns workers to process items from the queue:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: queue-workers
spec:
  completions: 1000      # Match the number of work items
  parallelism: 50        # Run 50 workers concurrently
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: worker
        image: queue-worker:latest
        env:
        - name: REDIS_HOST
          value: "redis-queue"
        - name: REDIS_PORT
          value: "6379"
        command: ["python3", "/app/worker.py"]
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
          limits:
            cpu: "500m"
            memory: "512Mi"
```

Each worker pod pulls one item from the queue, processes it, and exits. Kubernetes tracks completions and starts new pods until all items are processed.

## Implementing the Worker

The worker pulls items from Redis using atomic operations to prevent race conditions:

```python
#!/usr/bin/env python3
import redis
import json
import sys
import time
import traceback

def process_work_item(item):
    """Process a single work item"""
    print(f"Processing item {item['id']}: {item['file_path']}")

    # Simulate file download
    time.sleep(2)

    # Simulate processing
    result = {
        'item_id': item['id'],
        'status': 'success',
        'records_processed': 1234,
        'processed_at': time.time()
    }

    # Simulate upload
    time.sleep(1)

    print(f"Completed item {item['id']}")
    return result

def main():
    r = redis.Redis(host='redis-queue', port=6379, decode_responses=True)

    # Atomically pop one item from queue
    work_json = r.lpop('work-queue')

    if work_json is None:
        print("No work available")
        sys.exit(0)

    try:
        # Parse work item
        work_item = json.loads(work_json)

        # Process the item
        result = process_work_item(work_item)

        # Store result in Redis for later retrieval
        result_key = f"result:{work_item['id']}"
        r.setex(result_key, 86400, json.dumps(result))  # Keep for 24 hours

        # Increment success counter
        r.incr('stats:completed')

        print(f"Success: {work_item['id']}")
        sys.exit(0)

    except Exception as e:
        print(f"Error processing work item: {e}")
        traceback.print_exc()

        # Push failed item to error queue for manual review
        error_data = {
            'work_item': work_json,
            'error': str(e),
            'traceback': traceback.format_exc(),
            'timestamp': time.time()
        }
        r.rpush('error-queue', json.dumps(error_data))

        # Increment error counter
        r.incr('stats:errors')

        sys.exit(1)

if __name__ == "__main__":
    main()
```

This worker implementation handles several important scenarios. It atomically pops items to prevent two workers from grabbing the same item. It stores results in Redis for retrieval. It pushes failed items to an error queue for later investigation.

## Monitoring Queue Progress

Track how many items remain and how fast they're being processed:

```python
#!/usr/bin/env python3
import redis
import time

def monitor_queue():
    """Monitor queue processing progress"""
    r = redis.Redis(host='redis-queue', port=6379, decode_responses=True)

    last_completed = 0
    start_time = time.time()

    while True:
        queue_length = r.llen('work-queue')
        completed = int(r.get('stats:completed') or 0)
        errors = int(r.get('stats:errors') or 0)

        # Calculate processing rate
        elapsed = time.time() - start_time
        rate = completed / elapsed if elapsed > 0 else 0

        # Estimate time remaining
        if rate > 0 and queue_length > 0:
            eta_seconds = queue_length / rate
            eta_minutes = eta_seconds / 60
            eta_str = f"{eta_minutes:.1f} minutes"
        else:
            eta_str = "unknown"

        print(f"Queue: {queue_length} | Completed: {completed} | "
              f"Errors: {errors} | Rate: {rate:.2f}/sec | ETA: {eta_str}")

        if queue_length == 0:
            print("Queue empty, processing complete")
            break

        time.sleep(5)

if __name__ == "__main__":
    monitor_queue()
```

Run this as a separate pod to watch progress in real-time.

## Handling Variable Workloads

One advantage of the work queue pattern is handling variable workloads. You can add items while workers are running:

```python
#!/usr/bin/env python3
import redis
import json

def add_urgent_work(items):
    """Add high-priority items to front of queue"""
    r = redis.Redis(host='redis-queue', port=6379, decode_responses=True)

    # Use lpush to add to front instead of rpush to back
    for item in items:
        work_data = json.dumps(item)
        r.lpush('work-queue', work_data)  # Add to front

    print(f"Added {len(items)} urgent items to front of queue")

def add_normal_work(items):
    """Add normal-priority items to back of queue"""
    r = redis.Redis(host='redis-queue', port=6379, decode_responses=True)

    for item in items:
        work_data = json.dumps(item)
        r.rpush('work-queue', work_data)  # Add to back

    print(f"Added {len(items)} items to queue")
```

Workers don't need to know about priority. They just keep pulling from the front of the queue.

## Dynamic Parallelism Adjustment

Adjust worker count while jobs are running based on queue depth:

```bash
#!/bin/bash
# scale-workers.sh - Adjust parallelism based on queue size

REDIS_HOST="redis-queue"
JOB_NAME="queue-workers"

while true; do
  # Get current queue size
  QUEUE_SIZE=$(kubectl run -it --rm redis-cli --image=redis:7-alpine \
    --restart=Never -- redis-cli -h $REDIS_HOST LLEN work-queue 2>/dev/null | tail -1)

  # Calculate desired parallelism
  if [ "$QUEUE_SIZE" -gt 1000 ]; then
    PARALLELISM=100
  elif [ "$QUEUE_SIZE" -gt 500 ]; then
    PARALLELISM=50
  elif [ "$QUEUE_SIZE" -gt 100 ]; then
    PARALLELISM=25
  else
    PARALLELISM=10
  fi

  # Update job parallelism
  kubectl patch job $JOB_NAME -p "{\"spec\":{\"parallelism\":$PARALLELISM}}"

  echo "Queue size: $QUEUE_SIZE, Set parallelism to: $PARALLELISM"

  sleep 30
done
```

This automatically scales workers up when the queue is large and down when it's small, optimizing resource usage.

## Implementing Retry Logic

Handle transient failures by re-queuing items:

```python
#!/usr/bin/env python3
import redis
import json
import sys
import time

MAX_RETRIES = 3

def process_with_retry(work_item, r):
    """Process item with retry tracking"""
    retry_count = work_item.get('retry_count', 0)

    try:
        # Process the work
        result = process_work_item(work_item)
        return result

    except TransientError as e:
        # Retriable error
        if retry_count < MAX_RETRIES:
            # Increment retry count and re-queue
            work_item['retry_count'] = retry_count + 1
            work_item['last_error'] = str(e)

            # Use rpush to add back to end of queue
            r.rpush('work-queue', json.dumps(work_item))

            print(f"Retriable error, re-queued (attempt {retry_count + 1}/{MAX_RETRIES})")
            sys.exit(0)  # Exit successfully, item is back in queue
        else:
            # Max retries exceeded
            r.rpush('error-queue', json.dumps({
                'work_item': work_item,
                'error': f"Max retries exceeded: {e}"
            }))
            print(f"Max retries exceeded")
            sys.exit(1)

    except PermanentError as e:
        # Non-retriable error, send to error queue immediately
        r.rpush('error-queue', json.dumps({
            'work_item': work_item,
            'error': str(e)
        }))
        print(f"Permanent error: {e}")
        sys.exit(1)
```

This pattern ensures transient failures get retried automatically while permanent errors go straight to the error queue.

## Collecting Results

Retrieve all results after processing completes:

```python
#!/usr/bin/env python3
import redis
import json

def collect_results():
    """Gather all processing results"""
    r = redis.Redis(host='redis-queue', port=6379, decode_responses=True)

    results = []

    # Scan for all result keys
    for key in r.scan_iter(match='result:*'):
        result_json = r.get(key)
        if result_json:
            result = json.loads(result_json)
            results.append(result)

    print(f"Collected {len(results)} results")

    # Save to file
    with open('all_results.json', 'w') as f:
        json.dump(results, f, indent=2)

    # Calculate statistics
    total_records = sum(r.get('records_processed', 0) for r in results)
    print(f"Total records processed: {total_records}")

if __name__ == "__main__":
    collect_results()
```

Run this as a final cleanup job after all workers complete.

## Complete Pipeline Example

Here's a complete pipeline from queue population to result collection:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: pipeline-step-1-populate
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: populator
        image: queue-manager:latest
        command: ["python3", "/app/populate_queue.py"]
---
apiVersion: batch/v1
kind: Job
metadata:
  name: pipeline-step-2-workers
spec:
  completions: 1000
  parallelism: 50
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: worker
        image: queue-worker:latest
        env:
        - name: REDIS_HOST
          value: "redis-queue"
        command: ["python3", "/app/worker.py"]
---
apiVersion: batch/v1
kind: Job
metadata:
  name: pipeline-step-3-collect
spec:
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: collector
        image: queue-manager:latest
        command: ["python3", "/app/collect_results.py"]
```

Chain these together with job dependencies or a workflow engine like Argo Workflows for fully automated processing.

The work queue pattern with Redis and Kubernetes Jobs provides a robust, scalable solution for batch processing. It handles dynamic workloads, provides natural retry mechanisms, and scales efficiently to process millions of tasks.
