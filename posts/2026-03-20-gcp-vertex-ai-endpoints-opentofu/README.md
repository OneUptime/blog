# How to Create GCP Vertex AI Endpoints with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Vertex AI, Machine Learning, MLOps, Infrastructure as Code

Description: Learn how to create GCP Vertex AI endpoints, deploy models, and configure traffic splits for A/B testing using OpenTofu.

## Introduction

Vertex AI Endpoints serve trained ML models for online prediction. You can deploy multiple model versions to a single endpoint and split traffic between them for gradual rollouts or A/B testing. OpenTofu can manage endpoint creation as code, while model upload and deployment are currently done with the Google Cloud CLI or Vertex AI API.

## Enabling Required APIs

```hcl
resource "google_project_service" "vertex_ai" {
  project = var.project_id
  service = "aiplatform.googleapis.com"
}
```

If you store your own serving container in Artifact Registry, enable `artifactregistry.googleapis.com` as well.

## Service Account for Vertex AI

A separate service account isn't required just to create an endpoint. Vertex AI uses its service agent to pull container images. If your serving container needs runtime access to other Google Cloud services, create a custom service account and pass it during deployment with `gcloud ai endpoints deploy-model --service-account=...`.

## Creating a Vertex AI Endpoint

```hcl
resource "google_vertex_ai_endpoint" "prediction" {
  name         = "${var.app_name}-prediction-endpoint"
  display_name = "${var.app_name} Prediction Endpoint"
  project      = var.project_id
  location     = var.region
  description  = "Online prediction endpoint for ${var.app_name}"

  labels = {
    environment = var.environment
    managed_by  = "opentofu"
  }

  depends_on = [google_project_service.vertex_ai]
}
```

## Uploading a Model

OpenTofu can create the endpoint, but model upload is done with the Google Cloud CLI or Vertex AI API:

```bash
gcloud ai models upload \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --display-name="${APP_NAME}-classifier-v${MODEL_VERSION}" \
  --artifact-uri="gs://${MODEL_BUCKET}/models/classifier/v${MODEL_VERSION}/" \
  --container-image-uri="${CONTAINER_IMAGE_URI}"
```

Use an Artifact Registry image for `CONTAINER_IMAGE_URI`. If you use a Vertex AI prebuilt prediction container, choose an image that matches your framework version and repository location requirements.

## Deploying Model to Endpoint

Deploy models to the endpoint with the Google Cloud CLI:

```bash
gcloud ai endpoints deploy-model "${ENDPOINT_ID}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --model="${PRIMARY_MODEL_ID}" \
  --display-name="classifier-primary" \
  --deployed-model-id=1 \
  --machine-type="n1-standard-4" \
  --min-replica-count=1 \
  --max-replica-count=5 \
  --autoscaling-metric-specs=cpu-usage=60 \
  --traffic-split=0=100

gcloud ai endpoints deploy-model "${ENDPOINT_ID}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --model="${CANARY_MODEL_ID}" \
  --display-name="classifier-canary" \
  --deployed-model-id=2 \
  --machine-type="n1-standard-4" \
  --min-replica-count=1 \
  --max-replica-count=2

gcloud ai endpoints update "${ENDPOINT_ID}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --traffic-split=1=90,2=10
```

## Outputs

```hcl
output "endpoint_id" {
  value = google_vertex_ai_endpoint.prediction.id
}

output "endpoint_name" {
  value = google_vertex_ai_endpoint.prediction.name
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

Vertex AI endpoints provide managed online prediction with traffic splitting for safe model rollouts. OpenTofu manages endpoint creation, while model registration and deployment are handled with the Google Cloud CLI or Vertex AI API - enabling reproducible, version-controlled ML model serving.
