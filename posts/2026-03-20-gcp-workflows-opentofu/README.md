# How to Create GCP Workflows with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GCP, Workflow, Serverless, Orchestration, Infrastructure as Code

Description: Learn how to create GCP Workflows for serverless orchestration of HTTP-based services and GCP APIs using OpenTofu.

## Introduction

GCP Workflows is a serverless orchestration service for connecting and automating GCP services, external APIs, and microservices. Workflows are defined in YAML or JSON syntax and executed on demand or on a schedule. OpenTofu manages workflow resources, service accounts, and schedules.

## Service Account for Workflows

```hcl
resource "google_service_account" "workflows" {
  account_id   = "${var.app_name}-workflows-sa"
  display_name = "Workflows Service Account"
  project      = var.project_id
}

# If Cloud Scheduler reuses this service account to start executions, grant it
# permission to invoke workflows.

resource "google_project_iam_member" "workflows_invoker" {
  project = var.project_id
  role    = "roles/workflows.invoker"
  member  = "serviceAccount:${google_service_account.workflows.email}"
}

# Grant permission for the workflow to invoke Cloud Run or Cloud Run functions (2nd gen).
resource "google_project_iam_member" "workflows_run_invoker" {
  project = var.project_id
  role    = "roles/run.invoker"
  member  = "serviceAccount:${google_service_account.workflows.email}"
}
```

## Creating a Workflow

```hcl
resource "google_workflows_workflow" "order_processor" {
  name            = "${var.app_name}-order-processor"
  project         = var.project_id
  region          = var.region
  service_account = google_service_account.workflows.email
  description     = "Orchestrates the order processing pipeline"

  # Workflow definition in YAML syntax
  source_contents = <<-YAML
    main:
      params: [args]
      steps:
        - init:
            assign:
              - orderId: $${args.orderId}
              - project: ${var.project_id}

        - validateOrder:
            call: http.post
            args:
              url: https://${var.region}-${var.project_id}.cloudfunctions.net/validate-order
              auth:
                type: OIDC
              body:
                orderId: $${orderId}
            result: validationResult

        - checkValidation:
            switch:
              - condition: $${validationResult.body.valid == true}
                next: processPayment
              - condition: $${validationResult.body.valid == false}
                next: orderInvalid

        - processPayment:
            call: http.post
            args:
              url: https://${var.region}-${var.project_id}.cloudfunctions.net/process-payment
              auth:
                type: OIDC
              body:
                orderId: $${orderId}
            result: paymentResult

        - sendNotification:
            call: http.post
            args:
              url: https://${var.region}-${var.project_id}.cloudfunctions.net/send-notification
              auth:
                type: OIDC
              body:
                orderId: $${orderId}
                status: "confirmed"
            result: notifyResult

        - returnSuccess:
            return:
              status: "success"
              orderId: $${orderId}

        - orderInvalid:
            return:
              status: "invalid"
              orderId: $${orderId}
  YAML

  labels = {
    environment = var.environment
    managed_by  = "opentofu"
  }
}
```

## Scheduling a Workflow with Cloud Scheduler

```hcl
resource "google_cloud_scheduler_job" "run_workflow" {
  name        = "${var.app_name}-workflow-scheduler"
  project     = var.project_id
  region      = var.region
  description = "Run order processor workflow daily"
  schedule    = "0 6 * * *"  # daily at 6 AM UTC
  time_zone   = "UTC"

  http_target {
    uri         = "https://workflowexecutions.googleapis.com/v1/${google_workflows_workflow.order_processor.id}/executions"
    http_method = "POST"

    body = base64encode(jsonencode({
      argument = jsonencode({ orderId = "batch-daily" })
    }))

    headers = {
      "Content-Type" = "application/json"
    }

    oauth_token {
      service_account_email = google_service_account.workflows.email
    }
  }
}
```

## Outputs

```hcl
output "workflow_id" {
  value = google_workflows_workflow.order_processor.id
}
```

## Deploying

```bash
tofu init
tofu plan -out=tfplan
tofu apply tfplan
```

## Summary

GCP Workflows provides a serverless orchestration layer for chaining HTTP services, GCP APIs, and microservices. OpenTofu manages workflow definitions, service accounts, and Cloud Scheduler triggers - making your orchestration infrastructure version controlled and reproducible.
