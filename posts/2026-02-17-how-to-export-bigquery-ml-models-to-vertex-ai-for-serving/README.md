# How to Export BigQuery ML Models to Vertex AI for Serving

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery ML, Vertex AI, Model Serving, Machine Learning, MLOps

Description: Learn how to export trained BigQuery ML models to Vertex AI for low-latency online predictions and scalable model serving endpoints.

---

BigQuery ML is excellent for training models directly in your data warehouse, but there are scenarios where you need to serve those models outside of BigQuery. Maybe you need low-latency online predictions for a real-time application, or you want to integrate the model into a microservice architecture. Vertex AI provides the serving infrastructure for exactly this - you can export a model from BigQuery ML and deploy it to a Vertex AI endpoint that handles auto-scaling, versioning, and monitoring.

In this post, I will walk through the full process of exporting a BigQuery ML model, uploading it to Vertex AI Model Registry, deploying it to an endpoint, and making predictions.

## Which Models Can Be Exported

Not all BigQuery ML model types support export. The ones that do include logistic regression, linear regression, boosted tree classifier and regressor, random forest classifier and regressor, DNN classifier and regressor, wide-and-deep models, AutoML Tables models, autoencoder, kmeans, PCA, matrix factorization, TensorFlow, and transform-only models. ARIMA_PLUS models currently cannot be exported. Also note that exported AutoML Tables models do not support Vertex AI deployment for online prediction, and boosted tree and random forest models export as XGBoost Booster artifacts that require a custom prediction routine instead of a pre-built TensorFlow serving container. You can check whether your specific model type supports export in the BigQuery ML documentation.

## Exporting the Model from BigQuery ML

The first step is exporting the trained model to a Google Cloud Storage bucket. For TensorFlow SavedModel-compatible BigQuery ML models, such as logistic regression, linear regression, DNN, wide-and-deep, kmeans, PCA, and matrix factorization models, Vertex AI can serve the exported model with a TensorFlow serving container.

This command exports a trained BigQuery ML model to a GCS location.

```sql
-- Export the trained model to Google Cloud Storage
EXPORT MODEL `my_project.ml_models.churn_classifier`
OPTIONS(
  uri = 'gs://my-project-ml-models/churn_classifier/v1/'
);
```

For the logistic regression model in this example, the exported files will include a SavedModel directory structure with the model graph and weights. You can verify the export worked by listing the GCS bucket.

```bash
# Verify the model files were exported successfully

gsutil ls -r gs://my-project-ml-models/churn_classifier/v1/
```

You should see files like saved_model.pb and a variables directory containing the model weights.

## Uploading to Vertex AI Model Registry

With the model in GCS, the next step is registering it in Vertex AI. You can do this through the gcloud CLI or the Vertex AI SDK for Python.

Using gcloud, upload the model to the Vertex AI Model Registry.

```bash
# Upload the exported model to Vertex AI Model Registry
gcloud ai models upload \
  --region=us-central1 \
  --display-name="churn-classifier-v1" \
  --artifact-uri=gs://my-project-ml-models/churn_classifier/v1/ \
  --container-image-uri=us-docker.pkg.dev/vertex-ai/prediction/tf2-cpu.2-12:latest \
  --description="Churn prediction model exported from BigQuery ML" \
  --project=my-project
```

The container image URI specifies which serving container to use. For TensorFlow SavedModel format, use one of the pre-built TensorFlow serving containers. Choose a TensorFlow Serving version that can load the SavedModel produced by your BigQuery ML model.

If you prefer Python, you can use the Vertex AI SDK.

```python
from google.cloud import aiplatform

# Initialize the Vertex AI SDK
aiplatform.init(
    project="my-project",
    location="us-central1"
)

# Upload the model to Vertex AI Model Registry
model = aiplatform.Model.upload(
    display_name="churn-classifier-v1",
    artifact_uri="gs://my-project-ml-models/churn_classifier/v1/",
    serving_container_image_uri="us-docker.pkg.dev/vertex-ai/prediction/tf2-cpu.2-12:latest",
    description="Churn prediction model exported from BigQuery ML"
)

# Print the model resource name for reference
print(f"Model resource name: {model.resource_name}")
```

## Creating an Endpoint and Deploying

Once the model is in the registry, you need to create a Vertex AI endpoint and deploy the model to it. The endpoint is the network-accessible service that accepts prediction requests.

```bash
# Create a Vertex AI endpoint
gcloud ai endpoints create \
  --region=us-central1 \
  --display-name="churn-prediction-endpoint" \
  --project=my-project
```

After the endpoint is created, note the endpoint ID from the output. Then deploy the model to it.

```bash
# Deploy the model to the endpoint
# Replace ENDPOINT_ID and MODEL_ID with actual values from previous steps
gcloud ai endpoints deploy-model ENDPOINT_ID \
  --region=us-central1 \
  --model=MODEL_ID \
  --display-name="churn-classifier-v1-deployment" \
  --machine-type=n1-standard-4 \
  --min-replica-count=1 \
  --max-replica-count=5 \
  --traffic-split=0=100 \
  --project=my-project
```

The traffic-split parameter controls how much traffic goes to this deployment. Setting 0=100 means 100% of traffic goes to the new DeployedModel, which is represented by the temporary ID 0 during deployment. When you deploy a new model version later, you can gradually shift traffic between versions.

Using the Python SDK, the deployment looks like this.

```python
# Create an endpoint
endpoint = aiplatform.Endpoint.create(
    display_name="churn-prediction-endpoint"
)

# Deploy the model to the endpoint with autoscaling
model.deploy(
    endpoint=endpoint,
    deployed_model_display_name="churn-classifier-v1-deployment",
    machine_type="n1-standard-4",
    min_replica_count=1,
    max_replica_count=5,
    # Autoscaling based on CPU utilization
    autoscaling_target_cpu_utilization=70,
    traffic_split={"0": 100}
)

print(f"Endpoint resource name: {endpoint.resource_name}")
```

## Making Online Predictions

With the model deployed, you can now make low-latency predictions by sending requests to the endpoint.

```python
# Make a prediction against the deployed model
from google.cloud import aiplatform

# Get the endpoint
endpoint = aiplatform.Endpoint(
    endpoint_name="projects/my-project/locations/us-central1/endpoints/ENDPOINT_ID"
)

# Prepare the input - format must match the model's expected input schema
instances = [
    {
        "account_age_days": 365,
        "total_logins_90d": 12,
        "total_feature_uses_90d": 45,
        "avg_session_duration_90d": 180.5,
        "support_tickets_90d": 3
    }
]

# Get the prediction
predictions = endpoint.predict(instances=instances)

# Parse the results
for prediction in predictions.predictions:
    print(f"Prediction: {prediction}")
```

You can also make predictions using curl for testing.

```bash
# Make a prediction using curl
curl -X POST \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "Content-Type: application/json" \
  "https://us-central1-aiplatform.googleapis.com/v1/projects/my-project/locations/us-central1/endpoints/ENDPOINT_ID:predict" \
  -d '{
    "instances": [
      {
        "account_age_days": 365,
        "total_logins_90d": 12,
        "total_feature_uses_90d": 45,
        "avg_session_duration_90d": 180.5,
        "support_tickets_90d": 3
      }
    ]
  }'
```

## Setting Up Model Monitoring

Vertex AI includes model monitoring that can detect data drift and prediction drift over time. This is important for production models because the distribution of incoming data can change, degrading model accuracy. For endpoint traffic, enable request-response logging on the endpoint and configure monitoring jobs to use the logged requests and responses as the target data.

```python
# Set up a model monitor for the registered model
from vertexai.resources.preview import ml_monitoring

monitoring_schema = ml_monitoring.spec.ModelMonitoringSchema(
    feature_fields=[
        ml_monitoring.spec.FieldSchema(name="account_age_days", data_type="float"),
        ml_monitoring.spec.FieldSchema(name="total_logins_90d", data_type="float"),
        ml_monitoring.spec.FieldSchema(name="total_feature_uses_90d", data_type="float"),
        ml_monitoring.spec.FieldSchema(name="avg_session_duration_90d", data_type="float"),
        ml_monitoring.spec.FieldSchema(name="support_tickets_90d", data_type="float"),
    ],
    prediction_fields=[
        ml_monitoring.spec.FieldSchema(name="predicted_churn", data_type="categorical")
    ],
)

feature_drift_spec = ml_monitoring.spec.DataDriftSpec(
    categorical_metric_type="l_infinity",
    numeric_metric_type="jensen_shannon_divergence",
    default_categorical_alert_threshold=0.3,
    default_numeric_alert_threshold=0.3,
)

prediction_drift_spec = ml_monitoring.spec.DataDriftSpec(
    categorical_metric_type="l_infinity",
    numeric_metric_type="jensen_shannon_divergence",
    default_categorical_alert_threshold=0.3,
    default_numeric_alert_threshold=0.3,
)

model_monitor = ml_monitoring.ModelMonitor.create(
    display_name="churn-model-monitoring",
    model_name=model.resource_name,
    model_version_id="1",
    model_monitoring_schema=monitoring_schema,
    tabular_objective_spec=ml_monitoring.spec.TabularObjective(
        feature_drift_spec=feature_drift_spec,
        prediction_output_drift_spec=prediction_drift_spec,
    ),
)
```

## Managing Model Versions

As you retrain your model in BigQuery ML and export new versions, you can deploy them to the same endpoint with traffic splitting for gradual rollouts.

```bash
# Deploy a new model version with canary traffic split
# 90% to existing deployment, 10% to new version
# Replace OLD_DEPLOYED_MODEL_ID with the ID of the existing DeployedModel.
gcloud ai endpoints deploy-model ENDPOINT_ID \
  --region=us-central1 \
  --model=NEW_MODEL_ID \
  --display-name="churn-classifier-v2-deployment" \
  --machine-type=n1-standard-4 \
  --min-replica-count=1 \
  --max-replica-count=5 \
  --traffic-split=OLD_DEPLOYED_MODEL_ID=90,0=10 \
  --project=my-project
```

After validating that the new version performs well, you can shift all traffic to it and undeploy the old version.

## Cost Considerations

Vertex AI endpoints charge for the compute resources of deployed models, even when idle. For models that do not need real-time serving, consider using batch prediction instead. Batch prediction spins up resources only for the duration of the job.

```python
# Use batch prediction for non-real-time use cases
batch_prediction_job = model.batch_predict(
    job_display_name="churn-batch-prediction",
    instances_format="bigquery",
    predictions_format="bigquery",
    bigquery_source="bq://my-project.ml_models.scoring_data",
    bigquery_destination_prefix="bq://my-project.ml_models",
    machine_type="n1-standard-4"
)
```

## Wrapping Up

Exporting BigQuery ML models to Vertex AI gives you the best of both worlds - the convenience of training in SQL with the production serving capabilities of a managed ML platform. The workflow is straightforward: export to GCS, upload to Model Registry, deploy to an endpoint, and start serving predictions. For teams that are already using BigQuery for data and feature engineering, this pipeline lets you go from a SQL-trained model to a production API endpoint without building custom serving infrastructure.
