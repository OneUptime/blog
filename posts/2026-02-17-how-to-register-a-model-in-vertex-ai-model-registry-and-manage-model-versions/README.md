# How to Register a Model in Vertex AI Model Registry and Manage Model Versions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Vertex AI, Model Registry, Model Versioning, MLOps

Description: Learn how to register models in the Vertex AI Model Registry, manage multiple versions, and organize your ML models effectively.

---

Once you start training models regularly, keeping track of them becomes a real challenge. Which model version is in production? What hyperparameters did version 3 use? Where are the artifacts stored? The Vertex AI Model Registry solves this by giving you a central place to register, version, and manage all your models. Think of it as a catalog for your ML models, similar to how a container registry works for Docker images.

## What the Model Registry Gives You

The Model Registry is more than just storage. It provides:

- A central catalog of all your models
- Automatic versioning when you upload new versions of the same model
- Metadata tracking (labels, descriptions, framework info)
- Integration with endpoints for deployment
- Model lineage through links to training jobs

## Registering Your First Model

The simplest way to register a model is to upload it from a GCS bucket where your trained model artifacts live.

Here is how to register a TensorFlow model:

```python
# register_model.py
# Register a trained model in the Vertex AI Model Registry

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Upload and register the model
model = aiplatform.Model.upload(
    display_name='customer-churn-predictor',
    description='Predicts customer churn based on usage patterns',
    # GCS path to your saved model directory
    artifact_uri='gs://your-bucket/models/churn-predictor/v1/',
    # Pre-built serving container for TensorFlow
    serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/tf2-cpu.2-14:latest',
    # Add labels for organization
    labels={
        'team': 'data-science',
        'project': 'churn-prediction',
        'framework': 'tensorflow',
    },
)

print(f"Model registered: {model.resource_name}")
print(f"Model ID: {model.name}")
```

## Registering a Model with a Parent (Versioning)

When you train a new version of an existing model, you want it grouped under the same parent model rather than creating a completely separate entry. Vertex AI handles this through the `parent_model` parameter:

```python
# register_new_version.py
# Register a new version of an existing model

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Upload as a new version of the existing model
new_version = aiplatform.Model.upload(
    display_name='customer-churn-predictor',
    # Reference the parent model's resource name
    parent_model='projects/your-project-id/locations/us-central1/models/MODEL_ID',
    artifact_uri='gs://your-bucket/models/churn-predictor/v2/',
    serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/tf2-cpu.2-14:latest',
    # Version-specific description
    version_description='Improved model with additional features and larger training set',
    labels={
        'team': 'data-science',
        'version': 'v2',
    },
)

print(f"New version registered: {new_version.resource_name}")
print(f"Version ID: {new_version.version_id}")
```

## Setting Version Aliases

Version aliases let you tag specific versions with meaningful names like "production", "staging", or "champion":

```python
# set_version_alias.py
# Add aliases to model versions for easy reference

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Get the model
model = aiplatform.Model('projects/your-project-id/locations/us-central1/models/MODEL_ID')

# Add an alias to a specific version
model.version_aliases = ['production', 'champion']

# You can also reference a model by its alias when deploying
# This makes it easy to update which version is in production
# without changing deployment configurations
```

## Listing All Models and Versions

Here is how to list all registered models and their versions:

```python
# list_models.py
# List all models and their versions in the registry

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# List all models
models = aiplatform.Model.list(
    filter='labels.team=data-science',
    order_by='create_time desc',
)

for model in models:
    print(f"\nModel: {model.display_name}")
    print(f"  Resource: {model.resource_name}")
    print(f"  Created: {model.create_time}")
    print(f"  Labels: {model.labels}")
    print(f"  Description: {model.description}")
```

To list all versions of a specific model:

```python
# list_versions.py
# List all versions of a specific model

from google.cloud import aiplatform

aiplatform.init(
    project='your-project-id',
    location='us-central1',
)

# Get the model
model = aiplatform.Model('projects/your-project-id/locations/us-central1/models/MODEL_ID')

# List all versions
versions = model.list_versions()

for version in versions:
    print(f"Version: {version.version_id}")
    print(f"  Created: {version.version_create_time}")
    print(f"  Description: {version.version_description}")
    print(f"  Aliases: {version.version_aliases}")
    print()
```

## Using gcloud for Model Registry Operations

The gcloud CLI is handy for quick operations:

```bash
# List all models in the registry
gcloud ai models list --region=us-central1

# Describe a specific model
gcloud ai models describe MODEL_ID --region=us-central1

# List versions of a model
gcloud ai models list-versions MODEL_ID --region=us-central1

# Delete a specific model version
gcloud ai models delete-version MODEL_ID@VERSION_ID --region=us-central1
```

## Registering Models from Different Frameworks

The Model Registry works with any ML framework. Here are examples for popular frameworks.

Registering a scikit-learn model:

```python
# Register a scikit-learn model
sklearn_model = aiplatform.Model.upload(
    display_name='fraud-detector-sklearn',
    artifact_uri='gs://your-bucket/models/fraud-detector/',
    # Use the scikit-learn serving container
    serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/sklearn-cpu.1.3:latest',
    labels={'framework': 'sklearn'},
)
```

Registering an XGBoost model:

```python
# Register an XGBoost model
xgb_model = aiplatform.Model.upload(
    display_name='demand-forecaster-xgboost',
    artifact_uri='gs://your-bucket/models/demand-forecaster/',
    # Use the XGBoost serving container
    serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/xgboost-cpu.1-7:latest',
    labels={'framework': 'xgboost'},
)
```

## Registering a Model with Custom Container

If you need a custom serving container (for example, with custom preprocessing logic), you can specify a custom container:

```python
# Register with a custom serving container
custom_model = aiplatform.Model.upload(
    display_name='custom-nlp-model',
    artifact_uri='gs://your-bucket/models/nlp-model/',
    # Your custom container in Artifact Registry
    serving_container_image_uri='us-central1-docker.pkg.dev/your-project/models/nlp-server:v1',
    serving_container_predict_route='/predict',
    serving_container_health_route='/health',
    serving_container_ports=[8080],
    serving_container_environment_variables={
        'MODEL_NAME': 'nlp-model',
        'MAX_BATCH_SIZE': '32',
    },
)
```

## Model Metadata and Organization

Good organization makes the registry useful. Use labels consistently across your team:

```python
# Use consistent labeling for model organization
model = aiplatform.Model.upload(
    display_name='recommendation-engine-v3',
    artifact_uri='gs://your-bucket/models/rec-engine-v3/',
    serving_container_image_uri='us-docker.pkg.dev/vertex-ai/prediction/tf2-cpu.2-14:latest',
    labels={
        'team': 'recommendations',
        'project': 'product-recs',
        'framework': 'tensorflow',
        'environment': 'production',
        'data-version': '2026-02-01',
    },
    description='Product recommendation model trained on 6 months of user interaction data. '
                'Uses collaborative filtering with deep neural network.',
)
```

## Deleting Models and Versions

Clean up old models you no longer need:

```python
# Delete a specific version
model = aiplatform.Model('projects/your-project-id/locations/us-central1/models/MODEL_ID@2')
model.delete()

# Delete the entire model and all its versions
model = aiplatform.Model('projects/your-project-id/locations/us-central1/models/MODEL_ID')
model.delete()
```

Be careful - you cannot delete a model version that is currently deployed to an endpoint. You must undeploy it first.

## Best Practices

Always add meaningful descriptions and labels when registering models. Six months from now, you will not remember what "model-v7-final-final" was about.

Use version aliases to track which model is in production, staging, and being evaluated. Update aliases instead of changing deployment configurations.

Set up a naming convention for your team. Something like `{team}-{project}-{model-type}` works well, for example, `data-science-churn-random-forest`.

Register models as part of your training pipeline, not as a manual step. This ensures every trained model gets tracked automatically.

## Wrapping Up

The Vertex AI Model Registry is an essential piece of any MLOps workflow on GCP. It gives you a single source of truth for all your models, makes versioning straightforward, and integrates seamlessly with Vertex AI endpoints for deployment. Start registering your models early - even before you have a formal MLOps process - and you will have a clean history to build on as your ML operations mature.
