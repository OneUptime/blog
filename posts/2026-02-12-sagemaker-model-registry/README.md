# How to Use SageMaker Model Registry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, SageMaker, MLOps, Model Management

Description: Learn how to use Amazon SageMaker Model Registry to version, track, and manage machine learning models through their lifecycle from development to production.

---

In any serious ML operation, you'll end up with dozens or hundreds of model versions. Which one is in production? Which one performed best on last month's data? Who approved the current version for deployment? Without a system to track all this, you're flying blind.

SageMaker Model Registry is that system. It's a centralized catalog for your ML models that handles versioning, metadata tracking, approval workflows, and deployment lineage. Think of it as a package registry (like npm or PyPI) but for machine learning models.

## Why You Need a Model Registry

Here's what happens without one. You train a model, it goes to production. Three months later, someone trains a new version. Is it better? Maybe. Can you roll back to the old one? If you remember where the artifacts are. Who approved the switch? Nobody knows.

A model registry gives you:

- **Version tracking** - Every model version is cataloged with its metrics, parameters, and lineage
- **Approval workflows** - Models go through approval states before deployment
- **Deployment history** - Know exactly which version is serving traffic at any time
- **Reproducibility** - Each version links back to the training job, data, and code that created it

## Creating a Model Package Group

Model versions are organized into Model Package Groups. A group represents a single ML use case (like "fraud detection" or "product recommendations"), and each version within the group is a different model iteration.

```python
import boto3
import sagemaker
from sagemaker import Session

session = Session()
role = sagemaker.get_execution_role()
client = boto3.client('sagemaker')

# Create a model package group
client.create_model_package_group(
    ModelPackageGroupName='fraud-detection-models',
    ModelPackageGroupDescription='Models for real-time fraud detection in payment transactions',
    Tags=[
        {'Key': 'Team', 'Value': 'risk-engineering'},
        {'Key': 'UseCase', 'Value': 'fraud-detection'}
    ]
)

print("Model package group created!")
```

## Registering a Model Version

After training a model, register it in the registry. You can do this manually or as part of a SageMaker Pipeline (which is the recommended approach for production).

```python
from sagemaker import image_uris

region = session.boto_region_name

# Get the inference image URI
xgb_image = image_uris.retrieve(
    framework='xgboost',
    region=region,
    version='1.7-1'
)

# Register a model version with metrics and metadata
model_package = client.create_model_package(
    ModelPackageGroupName='fraud-detection-models',
    ModelPackageDescription='XGBoost fraud classifier trained on January 2026 data',
    InferenceSpecification={
        'Containers': [{
            'Image': xgb_image,
            'ModelDataUrl': 's3://my-bucket/models/fraud-xgb-v1/output/model.tar.gz'
        }],
        'SupportedContentTypes': ['text/csv', 'application/json'],
        'SupportedResponseMIMETypes': ['text/csv', 'application/json'],
        'SupportedRealtimeInferenceInstanceTypes': [
            'ml.m5.large', 'ml.m5.xlarge', 'ml.c5.xlarge'
        ],
        'SupportedTransformInstanceTypes': ['ml.m5.xlarge']
    },
    ModelApprovalStatus='PendingManualApproval',
    ModelMetrics={
        'ModelQuality': {
            'Statistics': {
                'ContentType': 'application/json',
                'S3Uri': 's3://my-bucket/models/fraud-xgb-v1/evaluation/metrics.json'
            }
        }
    },
    CustomerMetadataProperties={
        'training_dataset': 's3://my-bucket/data/january-2026/',
        'training_job': 'fraud-xgb-training-2026-01-15',
        'framework': 'xgboost-1.7',
        'feature_count': '45',
        'training_samples': '1500000'
    }
)

model_version_arn = model_package['ModelPackageArn']
print(f"Registered model version: {model_version_arn}")
```

## Registering from a Pipeline

The more common approach is to register models automatically from a SageMaker Pipeline. This ensures every registered model has full lineage back to its training job.

```python
from sagemaker.workflow.step_collections import RegisterModel
from sagemaker.model_metrics import MetricsSource, ModelMetrics

# This goes inside your pipeline definition
model_metrics = ModelMetrics(
    model_statistics=MetricsSource(
        s3_uri='s3://my-bucket/pipeline/evaluation/metrics.json',
        content_type='application/json'
    )
)

register_step = RegisterModel(
    name='RegisterFraudModel',
    estimator=xgb_estimator,
    model_data=training_step.properties.ModelArtifacts.S3ModelArtifacts,
    content_types=['text/csv'],
    response_types=['text/csv'],
    inference_instances=['ml.m5.large', 'ml.m5.xlarge'],
    transform_instances=['ml.m5.xlarge'],
    model_package_group_name='fraud-detection-models',
    approval_status='PendingManualApproval',
    model_metrics=model_metrics
)
```

## Approval Workflows

Model versions go through approval states. The typical flow is:

1. **PendingManualApproval** - Model is registered but not yet reviewed
2. **Approved** - Model has been reviewed and is cleared for deployment
3. **Rejected** - Model didn't meet quality standards

```python
# Approve a model version
client.update_model_package(
    ModelPackageArn=model_version_arn,
    ModelApprovalStatus='Approved',
    ApprovalDescription='Reviewed by ML team. AUC improved by 3% over current production model.'
)

print("Model approved for deployment!")
```

You can also automate approval based on metrics in your pipeline. For example, auto-approve if AUC is above a threshold and send for manual review otherwise.

```python
# List model versions by approval status
approved_models = client.list_model_packages(
    ModelPackageGroupName='fraud-detection-models',
    ModelApprovalStatus='Approved',
    SortBy='CreationTime',
    SortOrder='Descending'
)

for pkg in approved_models['ModelPackageSummaryList']:
    print(f"Version: {pkg['ModelPackageArn'].split('/')[-1]}")
    print(f"  Created: {pkg['CreationTime']}")
    print(f"  Status: {pkg['ModelApprovalStatus']}")
    print()
```

## Deploying from the Registry

Deploying a model version from the registry ensures you're deploying exactly what was approved.

```python
from sagemaker import ModelPackage

# Get the latest approved version
approved = client.list_model_packages(
    ModelPackageGroupName='fraud-detection-models',
    ModelApprovalStatus='Approved',
    SortBy='CreationTime',
    SortOrder='Descending',
    MaxResults=1
)

latest_approved_arn = approved['ModelPackageSummaryList'][0]['ModelPackageArn']

# Create a deployable model from the registry
model = ModelPackage(
    role=role,
    model_package_arn=latest_approved_arn,
    sagemaker_session=session
)

# Deploy to a real-time endpoint
predictor = model.deploy(
    initial_instance_count=2,
    instance_type='ml.m5.xlarge',
    endpoint_name='fraud-detection-prod'
)

print(f"Deployed {latest_approved_arn} to fraud-detection-prod")
```

## Comparing Model Versions

When deciding whether to approve a new version, you'll want to compare it against the current production model.

```python
def compare_model_versions(group_name, version_1, version_2):
    """Compare metrics between two model versions."""
    import json

    for version in [version_1, version_2]:
        details = client.describe_model_package(ModelPackageArn=version)

        # Get metrics from S3
        metrics_uri = details['ModelMetrics']['ModelQuality']['Statistics']['S3Uri']

        # Parse the S3 URI
        bucket_name = metrics_uri.split('/')[2]
        key = '/'.join(metrics_uri.split('/')[3:])

        s3 = boto3.client('s3')
        obj = s3.get_object(Bucket=bucket_name, Key=key)
        metrics = json.loads(obj['Body'].read().decode())

        version_num = version.split('/')[-1]
        print(f"\nVersion {version_num}:")
        for metric_name, metric_value in metrics.items():
            if isinstance(metric_value, (int, float)):
                print(f"  {metric_name}: {metric_value:.4f}")

# Compare the two most recent versions
versions = client.list_model_packages(
    ModelPackageGroupName='fraud-detection-models',
    SortBy='CreationTime',
    SortOrder='Descending',
    MaxResults=2
)

if len(versions['ModelPackageSummaryList']) >= 2:
    compare_model_versions(
        'fraud-detection-models',
        versions['ModelPackageSummaryList'][0]['ModelPackageArn'],
        versions['ModelPackageSummaryList'][1]['ModelPackageArn']
    )
```

## Setting Up EventBridge Notifications

Get notified when model package status changes - useful for triggering automated deployments.

```python
# Create an EventBridge rule for model approval events
events_client = boto3.client('events')

events_client.put_rule(
    Name='model-approved-trigger',
    EventPattern=json.dumps({
        'source': ['aws.sagemaker'],
        'detail-type': ['SageMaker Model Package State Change'],
        'detail': {
            'ModelPackageGroupName': ['fraud-detection-models'],
            'ModelApprovalStatus': ['Approved']
        }
    }),
    State='ENABLED',
    Description='Trigger deployment when a fraud model is approved'
)
```

## Cleaning Up Old Versions

Over time, you'll accumulate many model versions. Clean up old ones you no longer need.

```python
# Delete a specific model version
client.delete_model_package(
    ModelPackageName=model_version_arn
)

# Or list and clean up rejected models
rejected = client.list_model_packages(
    ModelPackageGroupName='fraud-detection-models',
    ModelApprovalStatus='Rejected'
)

for pkg in rejected['ModelPackageSummaryList']:
    client.delete_model_package(ModelPackageName=pkg['ModelPackageArn'])
    print(f"Deleted rejected version: {pkg['ModelPackageArn']}")
```

## Wrapping Up

The Model Registry is a small piece of infrastructure that makes a huge difference in how you manage ML models. It gives you confidence that what's in production is what was tested and approved, and it gives you a clear path to roll back if something goes wrong. Pair it with [SageMaker Pipelines](https://oneuptime.com/blog/post/sagemaker-pipelines-mlops/view) for automated registration and [Model Monitor](https://oneuptime.com/blog/post/sagemaker-model-monitor-drift-detection/view) for ongoing quality checks, and you've got a solid MLOps foundation.
