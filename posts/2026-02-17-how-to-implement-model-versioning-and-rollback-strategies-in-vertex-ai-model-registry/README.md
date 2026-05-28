# How to Use Model Versioning and Rollback Strategies in Vertex AI Model Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Vertex AI, Model Registry, Model Versioning, Rollback, MLOps, Google Cloud

Description: A practical guide to implementing model versioning and rollback strategies in Vertex AI Model Registry for safe and reliable ML model deployments.

---

Deploying a new ML model to production should never be a one-way trip. No matter how good your evaluation metrics look, something can go wrong when the model meets real traffic. Maybe the model is overfit to recent data. Maybe a feature pipeline broke. Maybe the business context changed in a way your test set did not capture. When this happens, you need to roll back quickly and reliably.

Vertex AI Model Registry gives you the building blocks for model versioning - you can upload multiple versions of a model and track which version is deployed where. But it does not give you a rollback strategy out of the box. You need to build that yourself. In this post, I will show you how.

## Understanding Model Versions in Vertex AI

When you upload a model to Vertex AI, it creates a new model resource. When you upload another version of the same model, it creates a version under the same model resource. Each version has its own artifact URI, container, and metadata.

```python
# versioning/upload_versions.py

from google.cloud import aiplatform

aiplatform.init(project="my-project", location="us-central1")

# Upload the first version of a model
model_v1 = aiplatform.Model.upload(
    display_name="churn-prediction-model",
    artifact_uri="gs://my-bucket/models/churn-v1/",
    serving_container_image_uri="us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-2:latest",
    description="Initial model trained on Q4 2025 data",
    labels={
        "version": "1",
        "training_date": "2025-12-01",
        "status": "production",
    },
    version_aliases=["v1", "stable"],
    version_description="Initial production model",
)

print(f"Model v1: {model_v1.resource_name}")
print(f"Version ID: {model_v1.version_id}")

# Upload a new version of the same model
model_v2 = aiplatform.Model.upload(
    display_name="churn-prediction-model",
    parent_model=model_v1.resource_name,  # Reference the parent model
    artifact_uri="gs://my-bucket/models/churn-v2/",
    serving_container_image_uri="us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1-2:latest",
    description="Retrained model with Q1 2026 data and new features",
    labels={
        "version": "2",
        "training_date": "2026-02-01",
        "status": "candidate",
    },
    version_aliases=["v2", "candidate"],
    version_description="Retrained with new features and more recent data",
)

print(f"Model v2: {model_v2.resource_name}")
print(f"Version ID: {model_v2.version_id}")
```

## Listing and Managing Versions

You need to be able to see all versions of a model and their status at a glance.

```python
# versioning/list_versions.py
from google.cloud import aiplatform

def list_model_versions(model_display_name):
    """List all versions of a model with their metadata."""
    aiplatform.init(project="my-project", location="us-central1")

    # Find the model by display name
    models = aiplatform.Model.list(
        filter=f'display_name="{model_display_name}"'
    )

    if not models:
        print(f"No model found with name: {model_display_name}")
        return

    model = models[0]
    print(f"Model: {model.display_name}")
    print(f"Resource: {model.resource_name}")
    print()

    # List all versions
    model_registry = aiplatform.models.ModelRegistry(model=model.resource_name)
    versions = model_registry.list_versions()

    for version in versions:
        print(f"Version ID: {version.version_id}")
        print(f"  Aliases: {version.version_aliases}")
        print(f"  Description: {version.version_description}")
        print(f"  Created: {version.version_create_time}")
        print(f"  Labels: {version.labels}")
        print(f"  Artifact URI: {version.artifact_uri}")
        print()

    return versions

# Get the current production version
def get_production_version(model_display_name):
    """Find the version with the 'stable' alias."""
    aiplatform.init(project="my-project", location="us-central1")

    models = aiplatform.Model.list(
        filter=f'display_name="{model_display_name}"'
    )

    if not models:
        return None

    model = models[0]

    # Get the version with the stable alias
    try:
        stable_version = aiplatform.Model(model.resource_name, version="stable")
        return stable_version
    except Exception:
        print("No version with 'stable' alias found")
        return None
```

## Building a Safe Deployment Strategy

The key to safe rollbacks is deploying new versions alongside old ones and shifting traffic gradually.

```python
# versioning/safe_deploy.py
from google.cloud import aiplatform
import time

class SafeModelDeployer:
    """Handles gradual deployment with automatic rollback capability."""

    def __init__(self, project_id, location="us-central1"):
        aiplatform.init(project=project_id, location=location)
        self.project_id = project_id

    def deploy_with_canary(
        self,
        endpoint_id,
        new_model_resource,
        canary_percentage=10,
        canary_duration_minutes=30,
    ):
        """Deploy a new model version using a canary strategy.
        Starts with a small percentage and gradually increases."""

        endpoint = aiplatform.Endpoint(endpoint_id)
        new_model = aiplatform.Model(new_model_resource)

        # Record the current deployment for rollback
        current_models = endpoint.list_models()
        rollback_info = {
            "traffic_split": dict(endpoint.traffic_split or {}),
            "models": {
                dm.display_name: {
                    "id": dm.id,
                    "model": dm.model,
                }
                for dm in current_models
            },
        }

        print(f"Current deployment: {rollback_info}")

        # Deploy the new model with canary traffic
        canary_name = f"canary-{new_model.version_id}"
        new_model.deploy(
            endpoint=endpoint,
            deployed_model_display_name=canary_name,
            machine_type="n1-standard-4",
            min_replica_count=1,
            max_replica_count=5,
            traffic_percentage=canary_percentage,
        )

        print(f"Canary deployment started with {canary_percentage}% traffic")
        print(f"Monitoring for {canary_duration_minutes} minutes...")

        # Monitor the canary
        time.sleep(canary_duration_minutes * 60)

        # Check if the canary is healthy
        deployed_models = endpoint.list_models()
        canary_id = next(
            (dm.id for dm in deployed_models if dm.display_name == canary_name),
            None,
        )
        if not canary_id:
            raise RuntimeError("Canary deployment was not found on the endpoint")

        if self._check_canary_health(endpoint_id, canary_id):
            print("Canary is healthy. Promoting to full traffic.")
            self._promote_canary(endpoint, new_model)
        else:
            print("Canary shows problems. Rolling back.")
            self._rollback(endpoint, rollback_info)

    def _check_canary_health(self, endpoint_id, deployed_model_id):
        """Check if the canary deployment is performing well."""
        from google.cloud import monitoring_v3

        client = monitoring_v3.MetricServiceClient()
        project_name = f"projects/{self.project_id}"

        # Query error rate for the canary model
        now = time.time()
        interval = monitoring_v3.TimeInterval({
            "end_time": {"seconds": int(now)},
            "start_time": {"seconds": int(now - 1800)},  # Last 30 minutes
        })

        # Check prediction error rate
        results = client.list_time_series(
            request={
                "name": project_name,
                "filter": f'metric.type="aiplatform.googleapis.com/prediction/online/error_count" '
                          f'AND resource.labels.endpoint_id="{endpoint_id}" '
                          f'AND metric.labels.deployed_model_id="{deployed_model_id}"',
                "interval": interval,
                "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
            }
        )

        error_count = sum(
            point.value.int64_value
            for series in results
            for point in series.points
        )

        # If error rate is acceptable, consider canary healthy
        max_errors = 10
        is_healthy = error_count <= max_errors
        print(f"Canary health check: {error_count} errors (max: {max_errors})")
        return is_healthy

    def _promote_canary(self, endpoint, new_model):
        """Shift 100% traffic to the new model."""
        deployed_models = endpoint.list_models()

        # Find the canary deployment
        canary_id = None
        old_ids = []
        for dm in deployed_models:
            if "canary" in dm.display_name:
                canary_id = dm.id
            else:
                old_ids.append(dm.id)

        if canary_id:
            # Route all traffic to the canary
            traffic_split = {canary_id: 100}
            for old_id in old_ids:
                traffic_split[old_id] = 0

            endpoint.update(traffic_split=traffic_split)
            print("All traffic routed to new model")

            # Undeploy old models after a grace period
            time.sleep(300)
            for old_id in old_ids:
                endpoint.undeploy(deployed_model_id=old_id)
                print(f"Undeployed old model: {old_id}")

    def _rollback(self, endpoint, rollback_info):
        """Roll back to the previous deployment."""
        deployed_models = endpoint.list_models()
        previous_split = rollback_info["traffic_split"]

        # Find and remove the canary
        for dm in deployed_models:
            if "canary" in dm.display_name:
                # Route all traffic away from canary
                if previous_split:
                    endpoint.update(traffic_split=previous_split)

                # Undeploy the canary
                time.sleep(60)
                endpoint.undeploy(deployed_model_id=dm.id)
                print(f"Canary removed. Rolled back to previous model.")
                break
```

## Version Aliasing Strategy

Use version aliases to track the lifecycle stage of each model version.

```python
# versioning/alias_management.py
from google.cloud import aiplatform
from google.cloud import aiplatform_v1

def manage_version_aliases(model_display_name):
    """Manage version aliases to track model lifecycle."""
    project = "my-project"
    location = "us-central1"
    aiplatform.init(project=project, location=location)

    models = aiplatform.Model.list(
        filter=f'display_name="{model_display_name}"'
    )
    model = models[0]
    client = aiplatform_v1.ModelServiceClient(
        client_options={"api_endpoint": f"{location}-aiplatform.googleapis.com"}
    )

    def merge_aliases(version_id, aliases):
        client.merge_version_aliases(
            name=f"{model.resource_name}@{version_id}",
            version_aliases=aliases,
        )

    # Alias strategy:
    # "stable" - the currently deployed production version
    # "candidate" - the next version being tested
    # "previous" - the last stable version (for fast rollback)
    # "deprecated" - versions scheduled for cleanup

    # When promoting a new version:
    def promote_version(new_version_id):
        # Move "stable" alias to "previous"
        current_stable = aiplatform.Model(model.resource_name, version="stable")
        if current_stable:
            # Remove "stable" alias from current version
            # Add "previous" alias
            merge_aliases(current_stable.version_id, ["-stable", "previous"])

        # Set "stable" alias on new version
        # Remove "candidate" alias
        merge_aliases(new_version_id, ["stable", "-candidate"])

        print(f"Version {new_version_id} promoted to stable")
        print(f"Previous stable: {current_stable.version_id}")

    # When rolling back:
    def rollback_to_previous():
        previous = aiplatform.Model(model.resource_name, version="previous")
        current = aiplatform.Model(model.resource_name, version="stable")

        if not previous:
            raise ValueError("No previous version available for rollback")

        # Swap aliases
        merge_aliases(current.version_id, ["-stable", "rolled-back"])
        merge_aliases(previous.version_id, ["stable", "-previous"])

        print(f"Rolled back to version {previous.version_id}")
        print(f"Version {current.version_id} marked as rolled-back")

    return promote_version, rollback_to_previous
```

## Automated Rollback on Performance Degradation

Set up automated monitoring that triggers a rollback when model performance drops.

```python
# versioning/auto_rollback.py
from google.cloud import aiplatform
from google.cloud import monitoring_v3
from versioning.alias_management import manage_version_aliases
import time

def monitor_and_auto_rollback(
    endpoint_id,
    model_display_name,
    error_rate_threshold=0.05,
    check_interval_seconds=300,
):
    """Monitor model error rate and auto-rollback on degradation."""
    aiplatform.init(project="my-project", location="us-central1")

    monitoring_client = monitoring_v3.MetricServiceClient()
    project_name = "projects/my-project"

    while True:
        now = time.time()
        interval = monitoring_v3.TimeInterval({
            "end_time": {"seconds": int(now)},
            "start_time": {"seconds": int(now - check_interval_seconds)},
        })

        # Check error rate
        error_results = monitoring_client.list_time_series(
            request={
                "name": project_name,
                "filter": (
                    'metric.type="aiplatform.googleapis.com/prediction/online/error_count" '
                    f'AND resource.labels.endpoint_id="{endpoint_id}"'
                ),
                "interval": interval,
                "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
            }
        )

        total_errors = sum(
            p.value.int64_value
            for s in error_results for p in s.points
        )

        # Check total request count
        request_results = monitoring_client.list_time_series(
            request={
                "name": project_name,
                "filter": (
                    'metric.type="aiplatform.googleapis.com/prediction/online/prediction_count" '
                    f'AND resource.labels.endpoint_id="{endpoint_id}"'
                ),
                "interval": interval,
                "view": monitoring_v3.ListTimeSeriesRequest.TimeSeriesView.FULL,
            }
        )

        total_requests = sum(
            p.value.int64_value
            for s in request_results for p in s.points
        )

        if total_requests > 0:
            error_rate = total_errors / total_requests
            print(f"Error rate: {error_rate:.4f} (threshold: {error_rate_threshold})")

            if error_rate > error_rate_threshold:
                print("ERROR RATE EXCEEDED - Triggering alias rollback!")
                _, rollback = manage_version_aliases(model_display_name)
                rollback()
                # Pair this with your endpoint deployment rollback workflow
                # if the deployed model was not addressed by alias.
                break

        time.sleep(check_interval_seconds)
```

## Wrapping Up

Model versioning and rollback capabilities are essential for production ML systems. Vertex AI Model Registry provides the foundation with version tracking and aliases. Build on top of it with a canary deployment strategy, version aliasing conventions (stable, candidate, previous), and automated health monitoring with rollback triggers. The goal is to make deploying a new model as safe as deploying a new version of your application code - something you can do confidently because you know you can roll back instantly if something goes wrong.
