# How to Build Reproducible ML Pipelines with Vertex AI Pipelines and Artifact Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vertex AI, Artifact Registry, MLOps, Reproducibility, Google Cloud

Description: Learn how to build fully reproducible machine learning pipelines using Vertex AI Pipelines and Artifact Registry for consistent and auditable ML workflows.

---

Reproducibility is the foundation of trustworthy machine learning. If you cannot reproduce a training run and get the same results, you cannot debug issues, you cannot satisfy auditors, and you cannot confidently make decisions based on your models. Yet most ML teams struggle with reproducibility because there are so many moving parts - data versions, code versions, package versions, hyperparameters, random seeds, and hardware configurations.

In this post, I will show you how to build fully reproducible ML pipelines on GCP using Vertex AI Pipelines for orchestration and Artifact Registry for versioning every component that goes into a pipeline run.

## What Makes an ML Pipeline Reproducible?

For an ML pipeline to be truly reproducible, you need to pin every input:

1. **Code** - The exact version of training code, preprocessing code, and evaluation code
2. **Data** - The exact version of the training dataset
3. **Dependencies** - The exact versions of all Python packages and system libraries
4. **Configuration** - Hyperparameters, feature lists, and all settings
5. **Environment** - The container image including OS, CUDA drivers, etc.
6. **Random seeds** - For deterministic model training

Let me show you how to lock down each of these.

## Step 1: Version Your Container Images

Every pipeline component runs in a container. Use Artifact Registry to store and version these containers.

```bash
# Create an Artifact Registry repository for ML containers
gcloud artifacts repositories create ml-pipelines \
  --repository-format=docker \
  --location=us-central1 \
  --description="Versioned containers for ML pipeline components"
```

Build deterministic container images with pinned package versions.

```dockerfile
# Dockerfile.training
# Pin the base image to a specific digest, not just a tag
FROM python:3.10.13-slim@sha256:abc123...

# Pin system package versions
RUN apt-get update && apt-get install -y \
    libgomp1=12.2.0-14 \
    && rm -rf /var/lib/apt/lists/*

# Copy and install pinned Python dependencies
COPY requirements.lock /app/requirements.lock
RUN pip install --no-cache-dir -r /app/requirements.lock

# Copy the training code
COPY src/ /app/src/

WORKDIR /app
ENTRYPOINT ["python", "-m", "src.training.train"]
```

Generate a lockfile for Python dependencies.

```bash
# Use pip-compile to generate a fully pinned requirements file
pip-compile requirements.in --generate-hashes --output-file requirements.lock
```

```
# requirements.lock - every package pinned with hash verification
scikit-learn==1.3.2 \
    --hash=sha256:a2f54c76accc15a34bfb9066846c0d6af86e916206e199b2b3fe4b8fa2b1ca5
xgboost==1.7.6 \
    --hash=sha256:1c527554a400445d0c22e8d0e28e32d0a...
pandas==2.1.4 \
    --hash=sha256:fcb68203c833efb...
numpy==1.26.2 \
    --hash=sha256:4d7ff...
```

Tag images with both a semantic version and the git commit hash.

```bash
# Build and push with deterministic tagging
COMMIT_SHA=$(git rev-parse HEAD)
IMAGE_TAG="v1.2.3-${COMMIT_SHA:0:8}"

docker build \
  -t us-central1-docker.pkg.dev/my-project/ml-pipelines/trainer:${IMAGE_TAG} \
  -f Dockerfile.training .

docker push us-central1-docker.pkg.dev/my-project/ml-pipelines/trainer:${IMAGE_TAG}

# Also tag with the full commit SHA for traceability
docker tag \
  us-central1-docker.pkg.dev/my-project/ml-pipelines/trainer:${IMAGE_TAG} \
  us-central1-docker.pkg.dev/my-project/ml-pipelines/trainer:${COMMIT_SHA}

docker push us-central1-docker.pkg.dev/my-project/ml-pipelines/trainer:${COMMIT_SHA}
```

## Step 2: Version Your Training Data

Use BigQuery snapshots or Cloud Storage versioning to pin training data.

```python
# data_versioning.py
from google.cloud import bigquery
from google.cloud import storage
import hashlib
import json
from datetime import datetime

class DataVersioner:
    """Creates versioned snapshots of training data."""

    def __init__(self, project_id):
        self.bq_client = bigquery.Client(project=project_id)
        self.storage_client = storage.Client(project=project_id)
        self.project_id = project_id

    def create_data_snapshot(self, source_table, version_label=None):
        """Create a timestamped snapshot of the training data."""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        version = version_label or timestamp

        # Create a BigQuery snapshot table
        snapshot_table = f"{source_table}_snapshot_{version}"

        query = f"""
        CREATE SNAPSHOT TABLE `{snapshot_table}`
        CLONE `{source_table}`
        OPTIONS(
            expiration_timestamp=TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL 365 DAY),
            description="Training data snapshot version {version}"
        )
        """

        job = self.bq_client.query(query)
        job.result()

        # Compute a hash of the data for integrity verification
        hash_query = f"""
        SELECT
            COUNT(*) as row_count,
            FARM_FINGERPRINT(
                STRING_AGG(TO_JSON_STRING(t), '' ORDER BY ROWID)
            ) as data_hash
        FROM `{snapshot_table}` t
        """

        hash_result = list(self.bq_client.query(hash_query).result())

        metadata = {
            "version": version,
            "snapshot_table": snapshot_table,
            "source_table": source_table,
            "row_count": hash_result[0]["row_count"],
            "data_hash": str(hash_result[0]["data_hash"]),
            "created_at": timestamp,
        }

        print(f"Data snapshot created: {snapshot_table}")
        print(f"Row count: {metadata['row_count']}")
        print(f"Data hash: {metadata['data_hash']}")

        return metadata
```

## Step 3: Build Pipeline Components with Explicit Versioning

Each pipeline component should reference a specific container image and declare all its inputs explicitly.

```python
# components/versioned_training.py
from kfp.v2 import dsl
from kfp.v2.dsl import Input, Output, Dataset, Model, Metrics

# Use a specific image tag, never 'latest'
TRAINING_IMAGE = "us-central1-docker.pkg.dev/my-project/ml-pipelines/trainer:v1.2.3-abc12345"

@dsl.container_component
def train_model_reproducible(
    training_data: Input[Dataset],
    model_output: Output[Model],
    metrics_output: Output[Metrics],
    hyperparameters_json: str,
    random_seed: int = 42,
    data_version: str = "",
    code_version: str = "",
):
    """Reproducible training component with explicit versioning of all inputs."""
    return dsl.ContainerSpec(
        # Use the pinned image - never use 'latest'
        image=TRAINING_IMAGE,
        command=["python", "-m", "src.training.train"],
        args=[
            "--train-data", training_data.path,
            "--model-output", model_output.path,
            "--metrics-output", metrics_output.path,
            "--hyperparameters", hyperparameters_json,
            "--random-seed", str(random_seed),
            # Log version info as metadata
            "--data-version", data_version,
            "--code-version", code_version,
        ],
    )
```

## Step 4: Store Pipeline Artifacts with Full Provenance

Use Vertex AI ML Metadata to record every input, output, and parameter.

```python
# pipeline/reproducible_pipeline.py
from kfp.v2 import dsl, compiler
import json

@dsl.pipeline(
    name="reproducible-training-pipeline",
    description="Fully reproducible ML training pipeline"
)
def reproducible_pipeline(
    project_id: str,
    data_snapshot_table: str,
    data_version: str,
    code_version: str,
    hyperparameters: str = '{"learning_rate": 0.1, "n_estimators": 100, "max_depth": 6}',
    random_seed: int = 42,
    container_image: str = TRAINING_IMAGE,
):
    """Pipeline with all inputs explicitly parameterized for reproducibility."""

    # Step 1: Export the versioned data snapshot
    export_task = export_data_snapshot(
        project_id=project_id,
        snapshot_table=data_snapshot_table,
    )

    # Step 2: Validate data integrity
    validate_task = validate_data_integrity(
        data=export_task.outputs["dataset"],
        expected_version=data_version,
    )

    # Step 3: Train with explicit configuration
    with dsl.Condition(validate_task.output == True):
        train_task = train_model_reproducible(
            training_data=export_task.outputs["dataset"],
            hyperparameters_json=hyperparameters,
            random_seed=random_seed,
            data_version=data_version,
            code_version=code_version,
        )

        # Step 4: Evaluate the model
        eval_task = evaluate_model(
            model=train_task.outputs["model_output"],
            test_data=export_task.outputs["test_dataset"],
        )

        # Step 5: Log all provenance metadata
        log_provenance(
            model=train_task.outputs["model_output"],
            metrics=eval_task.outputs["metrics"],
            data_version=data_version,
            code_version=code_version,
            hyperparameters=hyperparameters,
            random_seed=random_seed,
            container_image=container_image,
        )
```

## Step 5: Create a Reproducibility Manifest

For every pipeline run, generate a manifest that captures everything needed to reproduce it.

```python
# pipeline/manifest.py
import json
import hashlib
from datetime import datetime

def create_reproducibility_manifest(
    pipeline_run_id,
    data_version,
    code_version,
    container_images,
    hyperparameters,
    random_seed,
    environment_info,
):
    """Create a comprehensive manifest for reproducing this pipeline run."""

    manifest = {
        "manifest_version": "1.0",
        "pipeline_run_id": pipeline_run_id,
        "created_at": datetime.utcnow().isoformat(),

        "data": {
            "version": data_version,
            "snapshot_table": f"ml_data.training_data_snapshot_{data_version}",
        },

        "code": {
            "git_commit": code_version,
            "repository": "https://github.com/my-org/ml-project",
        },

        "containers": container_images,

        "hyperparameters": hyperparameters,

        "random_seed": random_seed,

        "environment": {
            "gcp_project": environment_info["project_id"],
            "region": environment_info["region"],
            "machine_type": environment_info["machine_type"],
            "accelerator": environment_info.get("accelerator_type"),
        },

        "dependencies": {
            "requirements_hash": environment_info.get("requirements_hash"),
            "requirements_uri": environment_info.get("requirements_uri"),
        },
    }

    # Compute a hash of the entire manifest for integrity
    manifest_str = json.dumps(manifest, sort_keys=True)
    manifest["manifest_hash"] = hashlib.sha256(manifest_str.encode()).hexdigest()

    return manifest


def save_manifest(manifest, output_uri):
    """Save the manifest to Cloud Storage."""
    from google.cloud import storage

    client = storage.Client()
    bucket_name = output_uri.split("/")[2]
    blob_path = "/".join(output_uri.split("/")[3:])

    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    blob.upload_from_string(
        json.dumps(manifest, indent=2),
        content_type="application/json"
    )

    print(f"Manifest saved to {output_uri}")
```

## Step 6: Reproduce a Previous Pipeline Run

Given a manifest, you should be able to reproduce any previous run.

```python
# pipeline/reproduce.py
from google.cloud import aiplatform
from google.cloud import storage
import json

def reproduce_pipeline_run(manifest_uri):
    """Reproduce a pipeline run from its manifest."""
    # Load the manifest
    client = storage.Client()
    bucket_name = manifest_uri.split("/")[2]
    blob_path = "/".join(manifest_uri.split("/")[3:])

    bucket = client.bucket(bucket_name)
    blob = bucket.blob(blob_path)
    manifest = json.loads(blob.download_as_string())

    print(f"Reproducing pipeline run: {manifest['pipeline_run_id']}")
    print(f"Original run date: {manifest['created_at']}")

    aiplatform.init(
        project=manifest["environment"]["gcp_project"],
        location=manifest["environment"]["region"],
        staging_bucket="gs://my-bucket/pipeline-staging",
    )

    # Submit the pipeline with the exact same parameters
    job = aiplatform.PipelineJob(
        display_name=f"reproduce-{manifest['pipeline_run_id']}",
        template_path="gs://my-bucket/pipelines/reproducible_pipeline.json",
        parameter_values={
            "project_id": manifest["environment"]["gcp_project"],
            "data_snapshot_table": manifest["data"]["snapshot_table"],
            "data_version": manifest["data"]["version"],
            "code_version": manifest["code"]["git_commit"],
            "hyperparameters": json.dumps(manifest["hyperparameters"]),
            "random_seed": manifest["random_seed"],
            "container_image": manifest["containers"]["training"],
        },
        enable_caching=False,  # Do not use cached results for reproduction
    )

    job.submit()
    print(f"Reproduction pipeline submitted: {job.resource_name}")

    return job.resource_name
```

## Step 7: Artifact Registry Cleanup Policy

Over time, you will accumulate many container images. Set up a cleanup policy that retains what you need and removes the rest.

```bash
# Create a cleanup policy that keeps tagged versions and removes untagged
gcloud artifacts repositories set-cleanup-policies ml-pipelines \
  --project=my-project \
  --location=us-central1 \
  --policy='{
    "name": "keep-recent-versions",
    "action": {"type": "DELETE"},
    "condition": {
      "olderThan": "7776000s",
      "tagState": "UNTAGGED"
    }
  }'
```

## Wrapping Up

Reproducible ML pipelines require discipline across every dimension - code, data, dependencies, configuration, and environment. By using Artifact Registry for versioned container images, BigQuery snapshots for data versioning, pinned dependencies with hash verification, and comprehensive manifests, you create a system where any pipeline run can be exactly reproduced months or years later. This is not just good engineering practice - it is a requirement for regulated industries and a lifesaver when debugging production model issues.
