# How to Use Podman for Data Processing Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, Data Pipeline, ETL, Data Engineering

Description: Learn how to use Podman to build modular data processing pipelines where each stage runs in its own container, enabling isolation, reusability, and easy debugging.

---

> Data processing pipelines built with Podman treat each transformation stage as an independent container, making pipelines modular, testable, and easy to maintain.

Data processing pipelines move data through a series of transformation stages, from ingestion through cleaning, transformation, enrichment, and loading. When these stages run as monolithic scripts, they become brittle, hard to test, and difficult to maintain. Podman lets you containerize each stage independently, creating modular pipelines where components can be developed, tested, and replaced individually without affecting the rest of the system.

---

## Pipeline Architecture

A containerized data pipeline consists of discrete stages connected through shared volumes or network communication. Each stage is a container with a specific responsibility:

```text
[Extract] -> [Validate] -> [Transform] -> [Enrich] -> [Load]
   |             |              |             |          |
Container 1  Container 2  Container 3  Container 4  Container 5
```

Data flows between stages through shared volumes, with each container reading from an input directory and writing to an output directory.

## Building Pipeline Stage Images

Each pipeline stage gets its own container image. Here is an example ETL pipeline for processing JSON data.

The extraction stage:

```dockerfile
# Containerfile.extract

FROM python:3.12-slim

RUN pip install --no-cache-dir requests boto3

COPY stages/extract.py /app/extract.py

ENTRYPOINT ["python3", "/app/extract.py"]
```

```python
# stages/extract.py
import os
import sys
import requests
import json
from datetime import datetime

def extract(source_url, output_dir):
    print(f"[{datetime.now()}] Extracting data from {source_url}")

    response = requests.get(source_url, timeout=30)
    response.raise_for_status()
    data = response.json()
    os.makedirs(output_dir, exist_ok=True)

    output_file = os.path.join(output_dir, "raw_data.json")
    with open(output_file, 'w') as f:
        json.dump(data, f)

    record_count = len(data) if isinstance(data, list) else 1
    print(f"[{datetime.now()}] Extracted {record_count} records to {output_file}")

    # Write metadata for the next stage
    metadata = {
        "source": source_url,
        "extracted_at": datetime.now().isoformat(),
        "record_count": record_count,
        "output_file": "raw_data.json"
    }
    with open(os.path.join(output_dir, "metadata.json"), 'w') as f:
        json.dump(metadata, f, indent=2)

if __name__ == '__main__':
    source = os.environ.get('SOURCE_URL', sys.argv[1] if len(sys.argv) > 1 else '')
    output = os.environ.get('OUTPUT_DIR', '/output')
    extract(source, output)
```

The transformation stage:

```dockerfile
# Containerfile.transform
FROM python:3.12-slim

RUN pip install --no-cache-dir pandas

COPY stages/transform.py /app/transform.py

ENTRYPOINT ["python3", "/app/transform.py"]
```

```python
# stages/transform.py
import os
import json
import pandas as pd
from datetime import datetime

def transform(input_dir, output_dir):
    print(f"[{datetime.now()}] Starting transformation...")

    input_file = os.path.join(input_dir, "raw_data.json")
    with open(input_file) as f:
        data = json.load(f)

    df = pd.json_normalize(data)
    os.makedirs(output_dir, exist_ok=True)

    # Apply transformations
    df.columns = [col.strip().lower().replace(' ', '_') for col in df.columns]
    df = df.drop_duplicates()
    required_non_null = max(1, (len(df.columns) + 1) // 2)
    df = df.dropna(thresh=required_non_null)

    for col in df.select_dtypes(include=['object']).columns:
        df[col] = df[col].apply(lambda value: value.strip() if isinstance(value, str) else value)

    output_file = os.path.join(output_dir, "transformed_data.csv")
    df.to_csv(output_file, index=False)

    print(f"[{datetime.now()}] Transformed {len(df)} records to {output_file}")

if __name__ == '__main__':
    input_d = os.environ.get('INPUT_DIR', '/input')
    output_d = os.environ.get('OUTPUT_DIR', '/output')
    transform(input_d, output_d)
```

The loading stage:

```dockerfile
# Containerfile.load
FROM python:3.12-slim

RUN pip install --no-cache-dir pandas sqlalchemy psycopg2-binary

COPY stages/load.py /app/load.py

ENTRYPOINT ["python3", "/app/load.py"]
```

```python
# stages/load.py
import os
import pandas as pd
from sqlalchemy import create_engine
from datetime import datetime

def load(input_dir):
    print(f"[{datetime.now()}] Starting data load...")

    db_url = os.environ.get('DATABASE_URL')
    table_name = os.environ.get('TABLE_NAME', 'processed_data')

    engine = create_engine(db_url)

    input_file = os.path.join(input_dir, "transformed_data.csv")
    df = pd.read_csv(input_file)

    df.to_sql(table_name, engine, if_exists='append', index=False)
    print(f"[{datetime.now()}] Loaded {len(df)} records into {table_name}")

if __name__ == '__main__':
    input_d = os.environ.get('INPUT_DIR', '/input')
    load(input_d)
```

## Running the Pipeline

Orchestrate the pipeline stages with a shell script:

```bash
#!/bin/bash
# run-pipeline.sh

set -euo pipefail

PIPELINE_ID="pipeline-$(date +%Y%m%d-%H%M%S)"
WORK_DIR="/tmp/$PIPELINE_ID"
SOURCE_URL="${1:-https://api.example.com/data}"

mkdir -p "$WORK_DIR"/{stage1,stage2,stage3}

echo "Pipeline $PIPELINE_ID starting..."

# Stage 1: Extract
echo "Stage 1: Extract"
podman run --rm \
  --name "${PIPELINE_ID}-extract" \
  --memory 512m \
  -e SOURCE_URL="$SOURCE_URL" \
  -v "$WORK_DIR/stage1:/output:Z" \
  pipeline-extract:latest

# Stage 2: Transform
echo "Stage 2: Transform"
podman run --rm \
  --name "${PIPELINE_ID}-transform" \
  --memory 2g \
  --cpus 2.0 \
  -v "$WORK_DIR/stage1:/input:ro,Z" \
  -v "$WORK_DIR/stage2:/output:Z" \
  pipeline-transform:latest

# Stage 3: Load
echo "Stage 3: Load"
podman run --rm \
  --name "${PIPELINE_ID}-load" \
  --memory 1g \
  -e DATABASE_URL="$DATABASE_URL" \
  -e TABLE_NAME="processed_data" \
  -v "$WORK_DIR/stage2:/input:ro,Z" \
  pipeline-load:latest

echo "Pipeline $PIPELINE_ID complete"
rm -rf "$WORK_DIR"
```

## Pipeline with Compose

For pipelines that need shared services like databases, use Podman's `podman compose` wrapper:

```yaml
# pipeline-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: pipeline
      POSTGRES_PASSWORD: pipepass
      POSTGRES_DB: warehouse
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U pipeline -d warehouse"]
      interval: 10s
      timeout: 5s
      retries: 5
    volumes:
      - pgdata:/var/lib/postgresql/data

  extract:
    build:
      context: .
      dockerfile: Containerfile.extract
    environment:
      SOURCE_URL: "${SOURCE_URL}"
      OUTPUT_DIR: /data/stage1
    volumes:
      - pipeline-data:/data

  transform:
    build:
      context: .
      dockerfile: Containerfile.transform
    environment:
      INPUT_DIR: /data/stage1
      OUTPUT_DIR: /data/stage2
    volumes:
      - pipeline-data:/data
    depends_on:
      extract:
        condition: service_completed_successfully

  load:
    build:
      context: .
      dockerfile: Containerfile.load
    environment:
      INPUT_DIR: /data/stage2
      DATABASE_URL: postgresql://pipeline:pipepass@postgres:5432/warehouse
    volumes:
      - pipeline-data:/data
    depends_on:
      postgres:
        condition: service_healthy
      transform:
        condition: service_completed_successfully

volumes:
  pgdata:
  pipeline-data:
```

```bash
SOURCE_URL="https://api.example.com/data" podman compose -f pipeline-compose.yml up
```

## Branching Pipelines

Some pipelines need to split data and process branches in parallel:

```bash
#!/bin/bash
# branching-pipeline.sh

set -euo pipefail

WORK_DIR="/tmp/pipeline-$(date +%s)"
mkdir -p "$WORK_DIR"/{extracted,branch-a,branch-b,merged}

# Extract
podman run --rm \
  -v "$WORK_DIR/extracted:/output:Z" \
  extract:latest

# Branch A and B in parallel
podman run --rm \
  -v "$WORK_DIR/extracted:/input:ro,z" \
  -v "$WORK_DIR/branch-a:/output:Z" \
  transform-a:latest &
PID_A=$!

podman run --rm \
  -v "$WORK_DIR/extracted:/input:ro,z" \
  -v "$WORK_DIR/branch-b:/output:Z" \
  transform-b:latest &
PID_B=$!

# Wait for both branches
BRANCH_FAILED=0
wait "$PID_A" || BRANCH_FAILED=1
wait "$PID_B" || BRANCH_FAILED=1

if [ "$BRANCH_FAILED" -ne 0 ]; then
  echo "A branch failed"
  exit 1
fi

# Merge results
podman run --rm \
  -v "$WORK_DIR/branch-a:/input-a:ro,Z" \
  -v "$WORK_DIR/branch-b:/input-b:ro,Z" \
  -v "$WORK_DIR/merged:/output:Z" \
  merge:latest

rm -rf "$WORK_DIR"
```

## Error Handling and Checkpoints

Implement checkpointing so failed pipelines can resume from the last successful stage:

```bash
#!/bin/bash
# checkpoint-pipeline.sh

PIPELINE_ID="$1"
WORK_DIR="/var/lib/pipelines/$PIPELINE_ID"
CHECKPOINT_FILE="$WORK_DIR/.checkpoint"

mkdir -p "$WORK_DIR"

get_checkpoint() {
    if [ -f "$CHECKPOINT_FILE" ]; then
        cat "$CHECKPOINT_FILE"
    else
        echo "0"
    fi
}

set_checkpoint() {
    echo "$1" > "$CHECKPOINT_FILE"
}

CURRENT_STAGE=$(get_checkpoint)

STAGES=("extract" "validate" "transform" "enrich" "load")

for i in "${!STAGES[@]}"; do
    if [ "$i" -lt "$CURRENT_STAGE" ]; then
        echo "Skipping stage $i (${STAGES[$i]}) - already completed"
        continue
    fi

    stage="${STAGES[$i]}"
    echo "Running stage $i: $stage"

    if podman run --rm \
      -v "$WORK_DIR:/data:Z" \
      "pipeline-${stage}:latest"; then
        set_checkpoint $((i + 1))
        echo "Stage $stage complete, checkpoint saved"
    else
        echo "Stage $stage FAILED. Resume with: $0 $PIPELINE_ID"
        exit 1
    fi
done

echo "Pipeline $PIPELINE_ID complete"
rm -f "$CHECKPOINT_FILE"
```

## Conclusion

Podman provides an excellent foundation for building modular data processing pipelines. By containerizing each stage, you gain the ability to develop, test, and deploy pipeline components independently. Shared volumes provide a simple and efficient data passing mechanism, while compose files enable more complex pipeline topologies with shared services. The addition of checkpointing and parallel branching gives you the reliability and performance needed for production data processing workloads, all without requiring a heavyweight orchestration platform.
