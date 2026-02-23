# How to Create GCP Dataflow Jobs with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Dataflow, Data Engineering, Infrastructure as Code, Apache Beam

Description: Learn how to provision and manage Google Cloud Dataflow streaming and batch jobs using Terraform for reproducible data pipeline infrastructure.

---

Google Cloud Dataflow is a fully managed service for running Apache Beam pipelines. It handles autoscaling, resource management, and fault tolerance so you can focus on the data processing logic. But when you need to deploy Dataflow jobs consistently across environments - dev, staging, production - clicking through the console gets old fast.

Terraform lets you define your Dataflow jobs as code, version them alongside your pipeline definitions, and deploy them predictably. This guide walks through creating both batch and streaming Dataflow jobs with Terraform, including networking, service accounts, and template-based deployments.

## Prerequisites

You need a GCP project with billing enabled and the Dataflow API turned on. You also need a service account that Terraform can use to create resources.

```hcl
# Enable the Dataflow API and related services
resource "google_project_service" "dataflow" {
  project = var.project_id
  service = "dataflow.googleapis.com"

  # Don't disable the API if we remove this resource
  disable_on_destroy = false
}

resource "google_project_service" "compute" {
  project = var.project_id
  service = "compute.googleapis.com"

  disable_on_destroy = false
}
```

## Setting Up the Service Account

Dataflow jobs run under a service account. You should create a dedicated one rather than using the default compute service account, which typically has way too many permissions.

```hcl
# Create a dedicated service account for Dataflow jobs
resource "google_service_account" "dataflow_sa" {
  account_id   = "dataflow-worker"
  display_name = "Dataflow Worker Service Account"
  project      = var.project_id
}

# Grant the Dataflow Worker role
resource "google_project_iam_member" "dataflow_worker" {
  project = var.project_id
  role    = "roles/dataflow.worker"
  member  = "serviceAccount:${google_service_account.dataflow_sa.email}"
}

# Grant access to read from and write to GCS
resource "google_project_iam_member" "storage_object_admin" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.dataflow_sa.email}"
}

# Grant BigQuery access if the pipeline writes to BigQuery
resource "google_project_iam_member" "bigquery_data_editor" {
  project = var.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.dataflow_sa.email}"
}
```

## Creating a GCS Bucket for Staging

Dataflow needs a Cloud Storage bucket for staging files and temporary data.

```hcl
# GCS bucket for Dataflow staging and temp files
resource "google_storage_bucket" "dataflow_staging" {
  name          = "${var.project_id}-dataflow-staging"
  location      = var.region
  project       = var.project_id
  force_destroy = false

  # Clean up old temp files automatically
  lifecycle_rule {
    condition {
      age = 7
    }
    action {
      type = "Delete"
    }
  }

  uniform_bucket_level_access = true
}
```

## Creating a Batch Dataflow Job

For batch jobs that process a finite dataset and then stop, use the `google_dataflow_job` resource. This is commonly used with Dataflow templates.

```hcl
# A batch Dataflow job using a Google-provided template
resource "google_dataflow_job" "gcs_to_bigquery" {
  name              = "gcs-to-bigquery-batch"
  project           = var.project_id
  region            = var.region
  template_gcs_path = "gs://dataflow-templates/latest/GCS_Text_to_BigQuery"
  temp_gcs_location = "${google_storage_bucket.dataflow_staging.url}/temp"

  # Template-specific parameters
  parameters = {
    inputFilePattern      = "gs://${var.input_bucket}/data/*.json"
    JSONPath              = "gs://${var.schema_bucket}/schema.json"
    outputTable           = "${var.project_id}:${var.dataset_id}.${var.table_id}"
    bigQueryLoadingTemporaryDirectory = "${google_storage_bucket.dataflow_staging.url}/bq-temp"
  }

  # Use the dedicated service account
  service_account_email = google_service_account.dataflow_sa.email

  # Networking - run in a specific subnetwork
  network    = null
  subnetwork = "regions/${var.region}/subnetworks/${var.subnet_name}"

  # Use private IPs for better security
  ip_configuration = "WORKER_IP_PRIVATE"

  # Machine configuration
  machine_type = "n1-standard-4"
  max_workers  = 10

  # Labels for cost tracking
  labels = {
    environment = var.environment
    team        = "data-engineering"
    managed_by  = "terraform"
  }

  # Skip waiting for the job to finish
  on_delete = "cancel"

  depends_on = [
    google_project_service.dataflow
  ]
}
```

## Creating a Streaming Dataflow Job

Streaming jobs run continuously, processing data as it arrives. Use `google_dataflow_flex_template_job` for Flex Templates, which give you more control over the worker environment.

```hcl
# A streaming Dataflow job using a Flex Template
resource "google_dataflow_flex_template_job" "pubsub_to_bigquery" {
  name                    = "pubsub-to-bigquery-stream"
  project                 = var.project_id
  region                  = var.region
  container_spec_gcs_path = "gs://dataflow-templates/latest/flex/PubSub_to_BigQuery"

  parameters = {
    inputTopic            = "projects/${var.project_id}/topics/${var.pubsub_topic}"
    outputTableSpec       = "${var.project_id}:${var.dataset_id}.${var.table_id}"
    tempLocation          = "${google_storage_bucket.dataflow_staging.url}/temp"
    serviceAccount        = google_service_account.dataflow_sa.email
    useSubscription       = "false"
    numWorkers            = "2"
    maxNumWorkers         = "10"
    workerMachineType     = "n1-standard-2"
    subnetwork            = "regions/${var.region}/subnetworks/${var.subnet_name}"
    ipConfiguration       = "WORKER_IP_PRIVATE"
  }

  labels = {
    environment = var.environment
    team        = "data-engineering"
    managed_by  = "terraform"
  }

  # For streaming jobs, drain on delete to avoid data loss
  on_delete = "drain"

  depends_on = [
    google_project_service.dataflow
  ]
}
```

The key difference with streaming jobs: set `on_delete` to `"drain"` so the job finishes processing in-flight elements before shutting down. Using `"cancel"` can lose data.

## Custom Flex Templates

If you are running your own Beam pipeline code, you will build a custom Flex Template. The Terraform side looks like this:

```hcl
# Custom Flex Template job
resource "google_dataflow_flex_template_job" "custom_pipeline" {
  name                    = "custom-etl-pipeline"
  project                 = var.project_id
  region                  = var.region
  container_spec_gcs_path = "gs://${var.template_bucket}/templates/custom-etl/metadata.json"

  parameters = {
    input_subscription  = "projects/${var.project_id}/subscriptions/${var.subscription_name}"
    output_table        = "${var.project_id}.${var.dataset_id}.${var.output_table}"
    temp_location       = "${google_storage_bucket.dataflow_staging.url}/temp"
    staging_location    = "${google_storage_bucket.dataflow_staging.url}/staging"
    runner              = "DataflowRunner"
    experiments         = "enable_prime"
    sdk_container_image = "${var.region}-docker.pkg.dev/${var.project_id}/dataflow/custom-etl:${var.image_tag}"
  }

  # Additional experiments and launch options
  additional_experiments = [
    "enable_prime",
    "enable_windmill_service"
  ]

  labels = {
    environment = var.environment
    pipeline    = "custom-etl"
  }

  on_delete = "drain"
}
```

## Networking Considerations

Running Dataflow workers with private IPs is a security best practice, but you need to make sure the networking is set up correctly.

```hcl
# Firewall rule to allow Dataflow worker communication
resource "google_compute_firewall" "dataflow_workers" {
  name    = "allow-dataflow-workers"
  network = var.network_name
  project = var.project_id

  # Dataflow workers need to communicate with each other on TCP port 12345-12346
  allow {
    protocol = "tcp"
    ports    = ["12345-12346"]
  }

  # Workers communicate with each other
  source_tags = ["dataflow"]
  target_tags = ["dataflow"]

  description = "Allow Dataflow workers to communicate with each other"
}

# Cloud NAT for private workers to reach the internet
resource "google_compute_router" "dataflow_router" {
  name    = "dataflow-router"
  network = var.network_name
  region  = var.region
  project = var.project_id
}

resource "google_compute_router_nat" "dataflow_nat" {
  name                               = "dataflow-nat"
  router                             = google_compute_router.dataflow_router.name
  region                             = var.region
  project                            = var.project_id
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"
}
```

## Variables File

```hcl
# variables.tf
variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for Dataflow jobs"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
}

variable "subnet_name" {
  description = "Subnetwork name for Dataflow workers"
  type        = string
}

variable "input_bucket" {
  description = "GCS bucket containing input data"
  type        = string
}

variable "dataset_id" {
  description = "BigQuery dataset ID"
  type        = string
}

variable "table_id" {
  description = "BigQuery table ID"
  type        = string
}
```

## Tips for Managing Dataflow Jobs with Terraform

There are a few things to watch out for when managing Dataflow with Terraform.

First, streaming jobs are long-running. If you change parameters on a streaming job, Terraform will try to drain the old one and create a new one. This can take a while, and you should make sure your pipeline handles this gracefully.

Second, Dataflow job names must be unique within a project and region. If you are running the same job template multiple times, make sure the names are different.

Third, the `on_delete` behavior matters. For batch jobs, "cancel" is fine since the job will be rerun anyway. For streaming jobs, always use "drain" to avoid losing data that is in flight.

Fourth, consider using `terraform import` for existing Dataflow jobs that were created outside of Terraform. The import command is:

```bash
# Import an existing Dataflow job
terraform import google_dataflow_job.my_job projects/my-project/locations/us-central1/jobs/job-id
```

## Wrapping Up

Terraform makes Dataflow job management repeatable and auditable. You can define your pipeline infrastructure alongside the pipeline code, review changes in pull requests, and deploy consistently across environments. The combination of dedicated service accounts, private networking, and proper staging bucket configuration gives you a solid foundation for running data pipelines in production.

For more on managing GCP infrastructure with Terraform, check out our guides on [creating GCP Dataproc clusters with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-dataproc-clusters-with-terraform/view) and [creating GCP logging sinks with Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-create-gcp-logging-sinks-with-terraform/view).
