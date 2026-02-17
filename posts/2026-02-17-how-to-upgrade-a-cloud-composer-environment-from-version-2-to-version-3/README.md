# How to Upgrade a Cloud Composer Environment from Version 2 to Version 3

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, Airflow, Migration, Upgrade

Description: A practical guide to upgrading your Cloud Composer environment from version 2 to version 3, covering planning, compatibility checks, and migration steps.

---

Cloud Composer 3 is a significant step forward from Composer 2. It drops the exposed GKE cluster, simplifies resource management, and improves autoscaling. But upgrading a production Composer environment is not a one-click operation. It requires planning, compatibility testing, and a careful migration strategy.

This article covers what changes between versions, how to prepare your DAGs and configurations, and the step-by-step process for migrating without disrupting your pipelines.

## What Changes Between Composer 2 and Composer 3

Understanding the differences helps you plan the migration:

| Aspect | Composer 2 | Composer 3 |
|---|---|---|
| Infrastructure | Managed GKE cluster (visible) | Fully managed (no GKE access) |
| Scaling | Manual or autoscaling config | Automatic with presets |
| KubernetesPodOperator | Uses the environment's GKE cluster | Uses a separate workloads cluster |
| Resource config | Pod-level CPU/memory | Component-level (scheduler, worker, web server) |
| Environment creation | 20-30 minutes | Significantly faster |
| Airflow versions | 2.x | 2.x (latest supported) |

## Step 1: Audit Your Current Environment

Before migrating, document everything about your Composer 2 environment:

```bash
# Export your current environment configuration
gcloud composer environments describe my-composer2-env \
  --location=us-central1 \
  --format=yaml > composer2-config.yaml

# List all installed PyPI packages
gcloud composer environments run my-composer2-env \
  --location=us-central1 \
  pip freeze > requirements-current.txt

# List all Airflow configuration overrides
gcloud composer environments describe my-composer2-env \
  --location=us-central1 \
  --format="yaml(config.softwareConfig.airflowConfigOverrides)"

# List environment variables
gcloud composer environments describe my-composer2-env \
  --location=us-central1 \
  --format="yaml(config.softwareConfig.envVariables)"

# List all Airflow connections
gcloud composer environments run my-composer2-env \
  --location=us-central1 \
  connections list

# List all Airflow variables
gcloud composer environments run my-composer2-env \
  --location=us-central1 \
  variables list
```

## Step 2: Check DAG Compatibility

The biggest compatibility concern is the `KubernetesPodOperator`. In Composer 2, it runs pods on the environment's GKE cluster. In Composer 3, the underlying infrastructure is different.

Review your DAGs for these patterns:

```python
# Pattern 1: KubernetesPodOperator - needs configuration changes
from airflow.providers.cncf.kubernetes.operators.kubernetes_pod import KubernetesPodOperator

# Composer 2 style (may reference specific GKE cluster configs)
task = KubernetesPodOperator(
    task_id="run_container",
    name="my-task",
    namespace="default",
    image="gcr.io/my-project/my-image:latest",
    # These GKE-specific settings may need updating
    config_file="/home/airflow/composer_kube_config",
    in_cluster=False,
)

# Composer 3 style (simplified, uses managed infrastructure)
task = KubernetesPodOperator(
    task_id="run_container",
    name="my-task",
    image="gcr.io/my-project/my-image:latest",
    # Composer 3 handles the Kubernetes configuration automatically
)
```

Other things to check in your DAGs:

- Direct references to the GKE cluster or Kubernetes API
- Custom pod templates or node selectors
- Volume mounts to the GKE node filesystem
- Network policies specific to the GKE cluster

## Step 3: Test with a Parallel Composer 3 Environment

The safest migration strategy is to run Composer 2 and Composer 3 side by side. Create a new Composer 3 environment and deploy your DAGs to both.

```bash
# Create a Composer 3 environment for testing
gcloud composer environments create composer3-test \
  --location=us-central1 \
  --image-version=composer-3-airflow-2.9.3 \
  --environment-size=medium
```

Apply the same configurations from your Composer 2 environment:

```bash
# Apply Airflow configuration overrides
gcloud composer environments update composer3-test \
  --location=us-central1 \
  --update-airflow-configs="\
core-parallelism=32,\
core-max_active_runs_per_dag=3,\
scheduler-dag_dir_list_interval=60"

# Install the same Python packages
gcloud composer environments update composer3-test \
  --location=us-central1 \
  --update-pypi-packages-from-file=requirements-current.txt

# Set the same environment variables
gcloud composer environments update composer3-test \
  --location=us-central1 \
  --update-env-variables="\
GCP_PROJECT=my-project,\
DATA_BUCKET=gs://my-data-bucket"
```

## Step 4: Migrate Airflow Connections and Variables

Export connections and variables from Composer 2 and import them into Composer 3:

```bash
# Export connections from Composer 2
gcloud composer environments run my-composer2-env \
  --location=us-central1 \
  connections export -- /tmp/connections.json

# Download the export file from the environment's GCS bucket
gcloud composer environments storage data export \
  --environment=my-composer2-env \
  --location=us-central1 \
  --destination=./connections.json \
  --source=/tmp/connections.json

# Import connections into Composer 3
gcloud composer environments storage data import \
  --environment=composer3-test \
  --location=us-central1 \
  --source=./connections.json \
  --destination=/tmp/connections.json

gcloud composer environments run composer3-test \
  --location=us-central1 \
  connections import -- /tmp/connections.json
```

For variables, use a similar export/import process:

```bash
# Export variables from Composer 2
gcloud composer environments run my-composer2-env \
  --location=us-central1 \
  variables export -- /tmp/variables.json

# Then import into Composer 3 following the same pattern
```

## Step 5: Deploy and Test DAGs

Upload your DAGs to the Composer 3 environment:

```bash
# Import all DAGs from the Composer 2 environment's bucket
# First, download DAGs from Composer 2
gcloud composer environments storage dags export \
  --environment=my-composer2-env \
  --location=us-central1 \
  --destination=./exported-dags/

# Import DAGs into Composer 3
gcloud composer environments storage dags import \
  --environment=composer3-test \
  --location=us-central1 \
  --source=./exported-dags/
```

Start DAGs one at a time and verify they work:

```bash
# Unpause a specific DAG for testing
gcloud composer environments run composer3-test \
  --location=us-central1 \
  dags unpause -- my_daily_etl

# Trigger a manual run to test
gcloud composer environments run composer3-test \
  --location=us-central1 \
  dags trigger -- my_daily_etl
```

## Step 6: Validate Results

Compare outputs between the Composer 2 and Composer 3 runs:

```python
# validation_dag.py - Compare outputs from both environments
from datetime import datetime
from airflow import DAG
from airflow.operators.python import PythonOperator
from google.cloud import bigquery

def validate_etl_output(**context):
    """Compare ETL output tables from both environments."""
    client = bigquery.Client()

    # Query the output from Composer 2 pipeline
    v2_count = list(client.query(
        "SELECT COUNT(*) as cnt FROM dataset.table_v2"
    ).result())[0].cnt

    # Query the output from Composer 3 pipeline
    v3_count = list(client.query(
        "SELECT COUNT(*) as cnt FROM dataset.table_v3"
    ).result())[0].cnt

    if v2_count != v3_count:
        raise ValueError(f"Row count mismatch: v2={v2_count}, v3={v3_count}")

    print(f"Validation passed: both environments produced {v2_count} rows")

dag = DAG(
    dag_id="migration_validation",
    start_date=datetime(2025, 1, 1),
    schedule_interval=None,
    catchup=False,
)

validate = PythonOperator(
    task_id="validate_output",
    python_callable=validate_etl_output,
    dag=dag,
)
```

## Step 7: Update Resource Configuration

Composer 3 uses a different resource model. Translate your Composer 2 resource settings:

```bash
# Composer 2 resource configuration (pod-level)
# --scheduler-cpu=2 --scheduler-memory=4GB
# --worker-cpu=2 --worker-memory=4GB --min-workers=2 --max-workers=8

# Equivalent Composer 3 configuration
gcloud composer environments update composer3-test \
  --location=us-central1 \
  --scheduler-cpu=2 \
  --scheduler-memory=4 \
  --worker-cpu=2 \
  --worker-memory=4 \
  --min-workers=2 \
  --max-workers=8
```

## Step 8: Cut Over

Once you have validated the Composer 3 environment:

1. Pause all DAGs in Composer 2
2. Wait for running tasks to complete
3. Unpause DAGs in Composer 3
4. Monitor for a full DAG cycle (24 hours for daily DAGs)
5. Keep Composer 2 running but paused for a rollback window (1-2 weeks)
6. Delete Composer 2 after the rollback window

```bash
# Pause all DAGs in Composer 2
gcloud composer environments run my-composer2-env \
  --location=us-central1 \
  dags pause -- --all

# Unpause all DAGs in Composer 3
gcloud composer environments run composer3-test \
  --location=us-central1 \
  dags unpause -- --all
```

## Common Migration Issues

**Package installation failures:**
- Some Python packages that worked in Composer 2 may have new dependency conflicts in Composer 3 due to different base images
- Test your requirements.txt early in the process

**KubernetesPodOperator changes:**
- Update pod configurations to work with Composer 3's managed infrastructure
- Remove references to the GKE cluster configuration

**Resource differences:**
- Composer 3's autoscaling behaves differently - monitor closely after migration
- You may need to adjust parallelism and concurrency settings

## Wrapping Up

Upgrading from Cloud Composer 2 to 3 is a migration, not an in-place upgrade. The parallel environment approach is the safest path: create a Composer 3 environment, mirror your configurations, deploy your DAGs, validate the results, and cut over when you are confident. The operational simplification that Composer 3 brings is worth the migration effort, especially for teams that were spending significant time managing the underlying GKE infrastructure.
