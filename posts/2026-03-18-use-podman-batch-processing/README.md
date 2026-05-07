# How to Use Podman for Batch Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Batch Processing, Automation, Data Processing

Description: Learn how to use Podman to run batch processing workloads in isolated containers with parallel execution, resource management, and reliable error handling.

---

> Podman turns batch processing from a fragile, environment-dependent operation into a reliable, reproducible workflow where each job runs in its own isolated container with controlled resources.

Batch processing involves executing a series of jobs without manual intervention. Whether you are processing uploaded files, transforming datasets, generating reports, or running ETL pipelines, these workloads benefit enormously from containerization. Podman gives you the ability to run each batch job in isolation, control resource usage precisely, parallelize work across multiple containers, and handle failures gracefully without affecting other jobs.

---

## Batch Processing Fundamentals with Podman

The simplest batch processing pattern is running a container for each unit of work:

```bash
# Process a single file

podman run --rm \
  -v /input:/input:ro,Z \
  -v /output:/output:Z \
  processor:latest \
  /scripts/process_csv.py /input/file001.csv

# Process all files in a directory
for file in /input/*.csv; do
    filename=$(basename "$file")
    podman run --rm \
      -v /input:/input:ro,Z \
      -v /output:/output:Z \
      processor:latest \
      /scripts/process_csv.py "/input/$filename"
done
```

## Building a Batch Processing Image

Create a robust container image for your batch jobs:

```dockerfile
FROM python:3.12-slim

RUN pip install --no-cache-dir \
    pandas \
    openpyxl \
    sqlalchemy \
    psycopg2-binary

COPY scripts/ /scripts/
RUN chmod +x /scripts/process_csv.py

WORKDIR /workspace

ENTRYPOINT ["python3"]
```

A sample processing script:

```python
#!/usr/bin/env python3
# scripts/process_csv.py

import sys
import pandas as pd
import os
from datetime import datetime

def process_file(input_path, output_dir):
    filename = os.path.basename(input_path)
    print(f"[{datetime.now()}] Processing {filename}...")

    df = pd.read_csv(input_path)

    # Apply transformations
    df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]
    df = df.dropna(subset=['id'])
    df['processed_at'] = datetime.now().isoformat()

    output_path = os.path.join(output_dir, f"processed_{filename}")
    df.to_csv(output_path, index=False)

    print(f"[{datetime.now()}] Output: {output_path} ({len(df)} rows)")
    return len(df)

if __name__ == '__main__':
    input_file = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else '/output'
    process_file(input_file, output_dir)
```

## Parallel Batch Processing

Process multiple files simultaneously using background containers:

```bash
#!/bin/bash
# parallel-batch.sh

set -euo pipefail

INPUT_DIR="/input"
OUTPUT_DIR="/output"
MAX_PARALLEL=4
IMAGE="processor:latest"

PIDS=()
RUNNING=0
TOTAL=0
FAILED=0

for file in "$INPUT_DIR"/*.csv; do
    # Wait if we have reached the parallel limit
    while [ $RUNNING -ge $MAX_PARALLEL ]; do
        for i in "${!PIDS[@]}"; do
            if ! kill -0 "${PIDS[$i]}" 2>/dev/null; then
                wait "${PIDS[$i]}" || FAILED=$((FAILED + 1))
                unset 'PIDS[$i]'
                RUNNING=$((RUNNING - 1))
            fi
        done
        sleep 0.5
    done

    filename=$(basename "$file")
    echo "Starting: $filename"

    podman run --rm \
      --memory 1g \
      --cpus 1.0 \
      -v "$INPUT_DIR:/input:ro,Z" \
      -v "$OUTPUT_DIR:/output:Z" \
      "$IMAGE" \
      /scripts/process_csv.py "/input/$filename" /output &

    PIDS+=($!)
    RUNNING=$((RUNNING + 1))
    TOTAL=$((TOTAL + 1))
done

# Wait for remaining jobs
for pid in "${PIDS[@]}"; do
    wait "$pid" || FAILED=$((FAILED + 1))
done

echo "Batch complete: $TOTAL total, $((TOTAL - FAILED)) succeeded, $FAILED failed"
```

## Job Queue with Podman

For more sophisticated batch processing, implement a simple job queue:

```bash
#!/bin/bash
# job-queue.sh

QUEUE_DIR="/var/spool/batch-jobs"
PROCESSING_DIR="$QUEUE_DIR/processing"
DONE_DIR="$QUEUE_DIR/done"
FAILED_DIR="$QUEUE_DIR/failed"

mkdir -p "$PROCESSING_DIR" "$DONE_DIR" "$FAILED_DIR"

process_job() {
    local job_file="$1"
    local job_name=$(basename "$job_file")

    # Move to processing
    mv "$job_file" "$PROCESSING_DIR/$job_name"

    # Read job configuration
    source "$PROCESSING_DIR/$job_name"

    echo "[$(date)] Processing job: $job_name (image: $JOB_IMAGE)"

    if podman run --rm \
      --memory "${JOB_MEMORY:-512m}" \
      --cpus "${JOB_CPUS:-1.0}" \
      ${JOB_VOLUMES:+$JOB_VOLUMES} \
      ${JOB_ENV:+$JOB_ENV} \
      "$JOB_IMAGE" \
      $JOB_COMMAND; then
        mv "$PROCESSING_DIR/$job_name" "$DONE_DIR/$job_name"
        echo "[$(date)] Job $job_name completed"
    else
        mv "$PROCESSING_DIR/$job_name" "$FAILED_DIR/$job_name"
        echo "[$(date)] Job $job_name FAILED"
    fi
}

# Process jobs from the queue
while true; do
    for job in "$QUEUE_DIR"/*.job; do
        [ -f "$job" ] || continue
        process_job "$job"
    done
    sleep 5
done
```

A job definition file:

```bash
# /var/spool/batch-jobs/transform-data-001.job
JOB_IMAGE="transformer:latest"
JOB_COMMAND="/scripts/transform.sh /input/dataset-001.csv"
JOB_VOLUMES="-v /data/input:/input:ro,Z -v /data/output:/output:Z"
JOB_MEMORY="2g"
JOB_CPUS="2.0"
```

## Batch Processing with Result Collection

Collect and aggregate results from multiple batch containers:

```python
#!/usr/bin/env python3
# batch_orchestrator.py

import subprocess
import json
import os
import concurrent.futures
from datetime import datetime

def run_container(job):
    """Run a single batch job in a container."""
    cmd = [
        'podman', 'run', '--rm',
        '--memory', job.get('memory', '512m'),
        '--cpus', str(job.get('cpus', 1.0)),
        '-v', f'{job["input_dir"]}:/input:ro,Z',
        '-v', f'{job["output_dir"]}:/output:Z',
        job['image'],
    ] + job.get('args', [])

    start = datetime.now()
    result = subprocess.run(cmd, capture_output=True, text=True)
    duration = (datetime.now() - start).total_seconds()

    return {
        'job_id': job['id'],
        'exit_code': result.returncode,
        'duration': duration,
        'stdout': result.stdout[-1000:],
        'stderr': result.stderr[-1000:],
    }

def run_batch(jobs, max_workers=4):
    """Run a batch of jobs with controlled parallelism."""
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {executor.submit(run_container, job): job for job in jobs}
        for future in concurrent.futures.as_completed(futures):
            result = future.result()
            results.append(result)
            status = 'OK' if result['exit_code'] == 0 else 'FAILED'
            print(f"[{status}] Job {result['job_id']} ({result['duration']:.1f}s)")
    return results

if __name__ == '__main__':
    jobs = [
        {
            'id': f'process-{i:03d}',
            'image': 'processor:latest',
            'input_dir': '/data/input',
            'output_dir': '/data/output',
            'args': ['/scripts/process_csv.py', f'/input/chunk_{i:03d}.csv'],
            'memory': '1g',
            'cpus': 1.0,
        }
        for i in range(20)
    ]

    batch_start = datetime.now()
    results = run_batch(jobs, max_workers=4)
    elapsed_time = (datetime.now() - batch_start).total_seconds()

    succeeded = sum(1 for r in results if r['exit_code'] == 0)
    failed = sum(1 for r in results if r['exit_code'] != 0)

    print(f"\nBatch complete: {succeeded} succeeded, {failed} failed, {elapsed_time:.1f}s elapsed")

    with open('/data/output/batch_report.json', 'w') as f:
        json.dump(results, f, indent=2)
```

## Retry Logic for Failed Jobs

Handle transient failures with automatic retries:

```bash
#!/bin/bash
# retry-job.sh

MAX_RETRIES=3
RETRY_DELAY=10

run_with_retry() {
    local image="$1"
    shift
    local attempt=1

    while [ $attempt -le $MAX_RETRIES ]; do
        echo "[$(date)] Attempt $attempt of $MAX_RETRIES"

        if podman run --rm \
          --memory 1g \
          --cpus 1.0 \
          "$image" \
          "$@"; then
            echo "[$(date)] Job succeeded on attempt $attempt"
            return 0
        fi

        echo "[$(date)] Attempt $attempt failed"

        if [ $attempt -lt $MAX_RETRIES ]; then
            echo "Retrying in ${RETRY_DELAY}s..."
            sleep $RETRY_DELAY
            RETRY_DELAY=$((RETRY_DELAY * 2))
        fi

        attempt=$((attempt + 1))
    done

    echo "[$(date)] Job failed after $MAX_RETRIES attempts"
    return 1
}

run_with_retry processor:latest /scripts/process_csv.py "$@"
```

## Cleanup After Batch Runs

Ensure containers and resources are cleaned up after batch runs:

```bash
#!/bin/bash
# batch-cleanup.sh

echo "Cleaning up batch processing resources..."

# Remove all stopped containers
podman container prune -f

# Remove dangling images
podman image prune -f

# Clean up old output files
find /data/output -name "*.tmp" -mtime +1 -delete

echo "Cleanup complete"
```

## Conclusion

Podman provides a solid foundation for batch processing workloads. By running each job in its own container, you get isolation that prevents one job from affecting others, resource limits that prevent runaway processes, and reproducibility that eliminates environment-related failures. Whether you need simple sequential processing, parallel execution with controlled concurrency, or a full job queue with retry logic, Podman gives you the building blocks to construct reliable batch processing systems without the overhead of a container orchestration platform.
