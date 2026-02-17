# How to Implement CI/CD for Cloud Composer DAGs Using Cloud Build and Git Sync

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Composer, CI/CD, Cloud Build, Airflow

Description: Learn how to set up a CI/CD pipeline for Cloud Composer DAGs using Cloud Build and Git synchronization for automated testing and deployment of Airflow workflows.

---

Deploying Airflow DAGs by manually uploading files to a Cloud Storage bucket works fine for a single developer. Once you have a team making changes, you need proper version control, testing, and automated deployments. CI/CD for Cloud Composer means pushing DAG changes to Git, running automated tests, and deploying to your Composer environment only when everything passes.

I set this up for a team of eight data engineers, and it eliminated a whole class of problems - broken DAGs from typos, conflicting changes from concurrent uploads, and the "it works on my machine" issue. Here is the full setup with Cloud Build.

## Project Structure

Organize your repository to separate DAGs, tests, and configuration:

```
composer-dags/
  dags/
    etl_pipeline.py
    data_quality.py
    config/
      tables.yaml
    sql/
      transforms/
        users.sql
        orders.sql
  tests/
    test_dag_integrity.py
    test_etl_pipeline.py
    test_data_quality.py
  plugins/
    custom_operators/
      __init__.py
      gcs_to_bq.py
  requirements.txt
  cloudbuild.yaml
  cloudbuild-test.yaml
  .flake8
```

## Writing DAG Tests

Before setting up CI/CD, write tests that catch common DAG issues:

```python
# tests/test_dag_integrity.py
# Tests that verify all DAGs load correctly without import errors
import pytest
import os
import sys
from airflow.models import DagBag

# Add the dags directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "dags"))

@pytest.fixture
def dagbag():
    """Load all DAGs from the dags folder."""
    dag_folder = os.path.join(os.path.dirname(__file__), "..", "dags")
    return DagBag(dag_folder=dag_folder, include_examples=False)

def test_no_import_errors(dagbag):
    """Verify that all DAGs load without import errors."""
    assert len(dagbag.import_errors) == 0, \
        f"DAG import errors: {dagbag.import_errors}"

def test_dags_have_tags(dagbag):
    """Every DAG should have at least one tag for organization."""
    for dag_id, dag in dagbag.dags.items():
        assert dag.tags, f"DAG {dag_id} has no tags"

def test_dags_have_owner(dagbag):
    """Every DAG should have a non-default owner."""
    for dag_id, dag in dagbag.dags.items():
        assert dag.default_args.get("owner") != "airflow", \
            f"DAG {dag_id} has default owner 'airflow'"

def test_dags_have_description(dagbag):
    """Every DAG should have a description."""
    for dag_id, dag in dagbag.dags.items():
        assert dag.description, f"DAG {dag_id} has no description"

def test_no_cycles(dagbag):
    """Verify that no DAGs have circular dependencies."""
    for dag_id, dag in dagbag.dags.items():
        # dag.test_cycle() raises if there is a cycle
        assert not dag.test_cycle(), f"DAG {dag_id} has a cycle"

def test_task_count_reasonable(dagbag):
    """Warn if a DAG has too many tasks which could hurt performance."""
    max_tasks = 500
    for dag_id, dag in dagbag.dags.items():
        task_count = len(dag.tasks)
        assert task_count < max_tasks, \
            f"DAG {dag_id} has {task_count} tasks (max {max_tasks})"
```

```python
# tests/test_etl_pipeline.py
# Unit tests for specific DAG logic
import pytest
from unittest.mock import patch, MagicMock
from dags.etl_pipeline import transform_record, validate_schema

def test_transform_record_basic():
    """Test that transform_record handles normal input."""
    record = {
        "user_id": "123",
        "event": "purchase",
        "amount": "99.99",
        "timestamp": "2026-02-17T10:00:00Z",
    }
    result = transform_record(record)
    assert result["amount"] == 99.99  # Should be converted to float
    assert result["event_date"] == "2026-02-17"

def test_transform_record_missing_fields():
    """Test that transform_record handles missing fields gracefully."""
    record = {"user_id": "123"}
    result = transform_record(record)
    assert result["amount"] == 0.0  # Default value
    assert result.get("event_date") is None

def test_validate_schema_valid():
    """Test schema validation with valid data."""
    valid_record = {
        "user_id": "123",
        "event": "purchase",
        "amount": 99.99,
    }
    assert validate_schema(valid_record) is True

def test_validate_schema_invalid():
    """Test schema validation rejects invalid data."""
    invalid_record = {"user_id": 123}  # Should be string
    assert validate_schema(invalid_record) is False
```

## Cloud Build Configuration for Testing

Create a Cloud Build configuration that runs tests on every pull request:

```yaml
# cloudbuild-test.yaml
# Runs DAG integrity tests and unit tests on pull requests
steps:
  # Install Python dependencies
  - name: 'python:3.10-slim'
    id: 'install-deps'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install -r requirements.txt
        pip install pytest pytest-cov flake8

  # Run linting
  - name: 'python:3.10-slim'
    id: 'lint'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install -r requirements.txt flake8
        flake8 dags/ --max-line-length=120 --ignore=E501,W503
    waitFor: ['-']

  # Run DAG integrity tests
  - name: 'python:3.10-slim'
    id: 'test-dags'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install -r requirements.txt pytest
        # Set Airflow home to a temp directory for testing
        export AIRFLOW_HOME=/tmp/airflow
        export AIRFLOW__CORE__LOAD_EXAMPLES=False
        airflow db init
        pytest tests/test_dag_integrity.py -v

  # Run unit tests
  - name: 'python:3.10-slim'
    id: 'test-unit'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install -r requirements.txt pytest pytest-cov
        export AIRFLOW_HOME=/tmp/airflow
        export AIRFLOW__CORE__LOAD_EXAMPLES=False
        pytest tests/ -v --cov=dags --cov-report=term-missing
    waitFor: ['install-deps']

timeout: '600s'
```

## Cloud Build Configuration for Deployment

Create the deployment configuration that runs after tests pass:

```yaml
# cloudbuild.yaml
# Deploys DAGs to Cloud Composer after tests pass
steps:
  # Run all tests first
  - name: 'python:3.10-slim'
    id: 'run-tests'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install -r requirements.txt pytest
        export AIRFLOW_HOME=/tmp/airflow
        export AIRFLOW__CORE__LOAD_EXAMPLES=False
        airflow db init
        pytest tests/ -v
        echo "All tests passed"

  # Get the Composer DAGs bucket
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'get-composer-bucket'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Get the GCS bucket for the Composer environment
        gcloud composer environments describe ${_COMPOSER_ENV} \
          --location=${_COMPOSER_REGION} \
          --format="value(config.dagGcsPrefix)" > /workspace/dag_bucket.txt
        echo "DAG bucket: $(cat /workspace/dag_bucket.txt)"
    waitFor: ['run-tests']

  # Sync DAGs to the Composer bucket
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy-dags'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        DAG_BUCKET=$(cat /workspace/dag_bucket.txt)
        echo "Deploying DAGs to $DAG_BUCKET"

        # Sync DAGs folder - delete files that no longer exist in repo
        gsutil -m rsync -r -d dags/ "$DAG_BUCKET/"

        echo "DAGs deployed successfully"
    waitFor: ['get-composer-bucket']

  # Sync plugins if they exist
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy-plugins'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        if [ -d "plugins" ]; then
          PLUGINS_BUCKET=$(gcloud composer environments describe ${_COMPOSER_ENV} \
            --location=${_COMPOSER_REGION} \
            --format="value(config.dagGcsPrefix)" | sed 's/dags/plugins/')
          gsutil -m rsync -r -d plugins/ "$PLUGINS_BUCKET/"
          echo "Plugins deployed"
        fi
    waitFor: ['deploy-dags']

substitutions:
  _COMPOSER_ENV: 'my-composer-env'
  _COMPOSER_REGION: 'us-central1'

timeout: '900s'
```

## Setting Up Cloud Build Triggers

Create triggers that run tests on PRs and deploy on merge:

```bash
# Create a trigger for pull request testing
gcloud builds triggers create github \
  --name="composer-dag-tests" \
  --repo-name="composer-dags" \
  --repo-owner="my-org" \
  --pull-request-pattern="^main$" \
  --build-config="cloudbuild-test.yaml" \
  --description="Run DAG tests on pull requests"

# Create a trigger for deployment on merge to main
gcloud builds triggers create github \
  --name="composer-dag-deploy" \
  --repo-name="composer-dags" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_COMPOSER_ENV=my-composer-env,_COMPOSER_REGION=us-central1" \
  --description="Deploy DAGs to Cloud Composer on merge"
```

## Multi-Environment Deployment

For staging and production environments, use different triggers:

```yaml
# cloudbuild-staging.yaml
# Deploy to staging environment for pre-production testing
steps:
  - name: 'python:3.10-slim'
    id: 'run-tests'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        pip install -r requirements.txt pytest
        export AIRFLOW_HOME=/tmp/airflow
        export AIRFLOW__CORE__LOAD_EXAMPLES=False
        airflow db init
        pytest tests/ -v

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'deploy-to-staging'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        DAG_BUCKET=$(gcloud composer environments describe staging-composer \
          --location=us-central1 \
          --format="value(config.dagGcsPrefix)")
        gsutil -m rsync -r -d dags/ "$DAG_BUCKET/"
        echo "Deployed to staging"

  # Run integration tests against staging
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'integration-tests'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Wait for DAGs to be parsed
        sleep 60

        # Trigger a test DAG run
        gcloud composer environments run staging-composer \
          --location=us-central1 \
          dags trigger -- test_dag --run-id "ci-test-$BUILD_ID"

        # Wait for the test DAG to complete
        sleep 120

        # Check the result
        gcloud composer environments run staging-composer \
          --location=us-central1 \
          dags state -- test_dag "ci-test-$BUILD_ID"
    waitFor: ['deploy-to-staging']

timeout: '1200s'
```

```bash
# Set up triggers for the multi-environment pipeline
# Staging: deploy on merge to develop branch
gcloud builds triggers create github \
  --name="composer-deploy-staging" \
  --repo-name="composer-dags" \
  --repo-owner="my-org" \
  --branch-pattern="^develop$" \
  --build-config="cloudbuild-staging.yaml"

# Production: deploy on merge to main branch
gcloud builds triggers create github \
  --name="composer-deploy-production" \
  --repo-name="composer-dags" \
  --repo-owner="my-org" \
  --branch-pattern="^main$" \
  --build-config="cloudbuild.yaml" \
  --substitutions="_COMPOSER_ENV=prod-composer,_COMPOSER_REGION=us-central1"
```

## Handling DAG Dependencies

If your DAGs have Python package dependencies, update them as part of the deployment:

```yaml
# In cloudbuild.yaml, add a step to update Composer packages
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    id: 'update-packages'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        # Check if requirements have changed
        CURRENT_REQS=$(gsutil cat gs://composer-configs/last-requirements.txt 2>/dev/null || echo "")
        NEW_REQS=$(cat requirements-composer.txt)

        if [ "$CURRENT_REQS" != "$NEW_REQS" ]; then
          echo "Requirements changed, updating Composer packages..."
          gcloud composer environments update ${_COMPOSER_ENV} \
            --location=${_COMPOSER_REGION} \
            --update-pypi-packages-from-file=requirements-composer.txt
          gsutil cp requirements-composer.txt gs://composer-configs/last-requirements.txt
        else
          echo "No package changes needed"
        fi
    waitFor: ['deploy-dags']
```

## Summary

CI/CD for Cloud Composer DAGs follows the same principles as any other code deployment - test in CI, deploy through automation, and never manually upload files. The setup uses Cloud Build triggers to run DAG integrity tests and unit tests on pull requests, then deploys to Cloud Composer on merge using gsutil rsync. For production environments, add a staging step with integration tests before promoting to production. The key tests to include are DAG import validation (catches syntax errors and missing dependencies), structure validation (tags, owners, descriptions), and unit tests for your custom transform logic. Once in place, your team can develop DAGs confidently knowing that broken code will not reach your Composer environment.
