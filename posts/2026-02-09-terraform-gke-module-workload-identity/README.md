# Using Terraform Modules to Deploy GKE Clusters with Workload Identity Enabled
Author: [nawazdhandala](https://github.com/nawazdhandala)
Tags: Terraform, GKE, Workload Identity, Google Cloud, Kubernetes
Description: A comprehensive guide to deploying Google Kubernetes Engine clusters with Workload Identity using Terraform modules, covering IAM binding, service account mapping, and security best practices for GCP workloads.
---

Google Kubernetes Engine (GKE) Workload Identity is the recommended way for pods to authenticate to Google Cloud services. Instead of mounting service account key files (JSON credentials) into pods, Workload Identity maps a Kubernetes service account to a Google Cloud IAM service account. This eliminates the need for long-lived credentials, reduces the blast radius of compromised pods, and integrates natively with Google Cloud's IAM and audit logging. This guide walks through deploying a GKE cluster with Workload Identity fully configured using Terraform modules.

## Why Workload Identity

Before Workload Identity, the common approaches for pods to access Google Cloud APIs were:

1. **Node service account**: Every pod on a node inherits the node's GCE service account. This is overly permissive because all pods on the node share the same identity.
2. **Exported JSON keys**: Create a GCP service account key, store it in a Kubernetes Secret, and mount it in the pod. This introduces long-lived credentials that can be exfiltrated and are difficult to rotate.
3. **Workload Identity Federation (external)**: For non-GKE clusters using external identity providers.

Workload Identity eliminates these problems by creating a trust relationship between a Kubernetes service account and a GCP IAM service account. When a pod uses the Kubernetes service account, the GKE metadata server transparently provides short-lived Google Cloud credentials. No keys to manage, no secrets to rotate, and each pod gets its own identity.

## Architecture Overview

The Workload Identity flow works as follows:

1. A Kubernetes service account is annotated with `iam.gke.io/gcp-service-account=<GCP_SA_EMAIL>`.
2. The GCP IAM service account has a policy binding that trusts the Kubernetes service account as a Workload Identity user.
3. When a pod using that Kubernetes service account calls the GKE metadata server, it receives an OAuth2 access token scoped to the GCP IAM service account's permissions.
4. The pod uses this token to authenticate to Google Cloud APIs (Cloud Storage, BigQuery, Pub/Sub, etc.).

## Step 1: Create the GKE Terraform Module

```hcl
# modules/gke/variables.tf
variable "project_id" {
  type        = string
  description = "GCP project ID"
}

variable "region" {
  type        = string
  description = "GCP region for the cluster"
  default     = "us-central1"
}

variable "cluster_name" {
  type        = string
  description = "Name of the GKE cluster"
}

variable "network" {
  type        = string
  description = "VPC network name"
}

variable "subnetwork" {
  type        = string
  description = "VPC subnetwork name"
}

variable "pods_range_name" {
  type        = string
  description = "Name of the secondary range for pods"
}

variable "services_range_name" {
  type        = string
  description = "Name of the secondary range for services"
}

variable "kubernetes_version" {
  type        = string
  default     = "1.29"
}

variable "node_machine_type" {
  type        = string
  default     = "e2-standard-4"
}

variable "node_count" {
  type        = number
  default     = 3
}

variable "max_node_count" {
  type        = number
  default     = 10
}

variable "node_disk_size_gb" {
  type        = number
  default     = 100
}
```

```hcl
# modules/gke/main.tf
resource "google_container_cluster" "primary" {
  name     = var.cluster_name
  location = var.region
  project  = var.project_id

  # Use a separately managed node pool
  remove_default_node_pool = true
  initial_node_count       = 1

  min_master_version = var.kubernetes_version

  network    = var.network
  subnetwork = var.subnetwork

  ip_allocation_policy {
    cluster_secondary_range_name  = var.pods_range_name
    services_secondary_range_name = var.services_range_name
  }

  # Enable Workload Identity at the cluster level
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Enable network policy with Dataplane V2
  datapath_provider = "ADVANCED_DATAPATH"

  # Private cluster configuration
  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  # Master authorized networks
  master_authorized_networks_config {
    cidr_blocks {
      cidr_block   = "0.0.0.0/0"
      display_name = "All networks"
    }
  }

  # Logging and monitoring
  logging_config {
    enable_components = ["SYSTEM_COMPONENTS", "WORKLOADS"]
  }

  monitoring_config {
    enable_components = ["SYSTEM_COMPONENTS"]
    managed_prometheus {
      enabled = true
    }
  }

  # Security configuration
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY_ENFORCE"
  }

  # Maintenance window
  maintenance_policy {
    daily_maintenance_window {
      start_time = "03:00"
    }
  }

  # Release channel
  release_channel {
    channel = "REGULAR"
  }
}

resource "google_container_node_pool" "primary" {
  name     = "${var.cluster_name}-primary-pool"
  location = var.region
  project  = var.project_id
  cluster  = google_container_cluster.primary.name

  initial_node_count = var.node_count

  autoscaling {
    min_node_count = var.node_count
    max_node_count = var.max_node_count
  }

  management {
    auto_repair  = true
    auto_upgrade = true
  }

  upgrade_settings {
    max_surge       = 1
    max_unavailable = 0
  }

  node_config {
    machine_type = var.node_machine_type
    disk_size_gb = var.node_disk_size_gb
    disk_type    = "pd-ssd"

    # Use a minimal service account for nodes
    service_account = google_service_account.gke_nodes.email

    oauth_scopes = [
      "https://www.googleapis.com/auth/cloud-platform"
    ]

    # Enable Workload Identity on the node pool
    workload_metadata_config {
      mode = "GKE_METADATA"
    }

    metadata = {
      disable-legacy-endpoints = "true"
    }

    shielded_instance_config {
      enable_secure_boot          = true
      enable_integrity_monitoring = true
    }

    labels = {
      cluster = var.cluster_name
      pool    = "primary"
    }
  }
}

# Minimal service account for GKE nodes
resource "google_service_account" "gke_nodes" {
  account_id   = "${var.cluster_name}-nodes"
  display_name = "GKE Node Service Account for ${var.cluster_name}"
  project      = var.project_id
}

# Grant minimal permissions to the node service account
resource "google_project_iam_member" "gke_nodes_log_writer" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_nodes_metric_writer" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_nodes_monitoring_viewer" {
  project = var.project_id
  role    = "roles/monitoring.viewer"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}

resource "google_project_iam_member" "gke_nodes_artifact_reader" {
  project = var.project_id
  role    = "roles/artifactregistry.reader"
  member  = "serviceAccount:${google_service_account.gke_nodes.email}"
}
```

```hcl
# modules/gke/outputs.tf
output "cluster_name" {
  value = google_container_cluster.primary.name
}

output "cluster_endpoint" {
  value     = google_container_cluster.primary.endpoint
  sensitive = true
}

output "cluster_ca_certificate" {
  value     = google_container_cluster.primary.master_auth[0].cluster_ca_certificate
  sensitive = true
}

output "workload_identity_pool" {
  value = "${var.project_id}.svc.id.goog"
}

output "node_service_account_email" {
  value = google_service_account.gke_nodes.email
}
```

## Step 2: Create the Workload Identity Module

This module creates the GCP IAM service account, binds it to a Kubernetes service account, and creates the Kubernetes service account with the proper annotation:

```hcl
# modules/workload-identity/variables.tf
variable "project_id" {
  type = string
}

variable "cluster_name" {
  type = string
}

variable "namespace" {
  type        = string
  description = "Kubernetes namespace for the service account"
}

variable "service_account_name" {
  type        = string
  description = "Name for both the K8s and GCP service accounts"
}

variable "gcp_roles" {
  type        = list(string)
  description = "List of IAM roles to grant to the GCP service account"
  default     = []
}

variable "workload_identity_pool" {
  type        = string
  description = "Workload Identity pool from the GKE cluster"
}
```

```hcl
# modules/workload-identity/main.tf
# Create the GCP IAM service account
resource "google_service_account" "workload" {
  account_id   = var.service_account_name
  display_name = "Workload Identity SA for ${var.service_account_name}"
  project      = var.project_id
}

# Grant IAM roles to the GCP service account
resource "google_project_iam_member" "workload_roles" {
  for_each = toset(var.gcp_roles)

  project = var.project_id
  role    = each.value
  member  = "serviceAccount:${google_service_account.workload.email}"
}

# Allow the Kubernetes service account to impersonate the GCP service account
resource "google_service_account_iam_binding" "workload_identity" {
  service_account_id = google_service_account.workload.name
  role               = "roles/iam.workloadIdentityUser"

  members = [
    "serviceAccount:${var.workload_identity_pool}[${var.namespace}/${var.service_account_name}]"
  ]
}

# Create the Kubernetes service account with the annotation
resource "kubernetes_service_account" "workload" {
  metadata {
    name      = var.service_account_name
    namespace = var.namespace

    annotations = {
      "iam.gke.io/gcp-service-account" = google_service_account.workload.email
    }
  }
}
```

```hcl
# modules/workload-identity/outputs.tf
output "gcp_service_account_email" {
  value = google_service_account.workload.email
}

output "kubernetes_service_account_name" {
  value = kubernetes_service_account.workload.metadata[0].name
}
```

## Step 3: Create the VPC Network

```hcl
# network.tf
resource "google_compute_network" "main" {
  name                    = "${var.cluster_name}-network"
  project                 = var.project_id
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "main" {
  name          = "${var.cluster_name}-subnet"
  project       = var.project_id
  region        = var.region
  network       = google_compute_network.main.id
  ip_cidr_range = "10.0.0.0/20"

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.4.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.8.0.0/20"
  }

  private_ip_google_access = true
}

# Cloud NAT for outbound internet access from private nodes
resource "google_compute_router" "main" {
  name    = "${var.cluster_name}-router"
  project = var.project_id
  region  = var.region
  network = google_compute_network.main.id
}

resource "google_compute_router_nat" "main" {
  name                               = "${var.cluster_name}-nat"
  project                            = var.project_id
  region                             = var.region
  router                             = google_compute_router.main.name
  nat_ip_allocate_option             = "AUTO_ONLY"
  source_subnetwork_ip_ranges_to_nat = "ALL_SUBNETWORKS_ALL_IP_RANGES"

  log_config {
    enable = true
    filter = "ERRORS_ONLY"
  }
}
```

## Step 4: Wire Everything Together

```hcl
# main.tf
provider "google" {
  project = var.project_id
  region  = var.region
}

module "gke" {
  source = "./modules/gke"

  project_id          = var.project_id
  region              = var.region
  cluster_name        = "production"
  network             = google_compute_network.main.name
  subnetwork          = google_compute_subnetwork.main.name
  pods_range_name     = "pods"
  services_range_name = "services"
  kubernetes_version  = "1.29"
  node_machine_type   = "e2-standard-4"
  node_count          = 3
  max_node_count      = 15
}

# Configure the Kubernetes provider using GKE credentials
data "google_client_config" "default" {}

provider "kubernetes" {
  host                   = "https://${module.gke.cluster_endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)
}

# Create namespaces
resource "kubernetes_namespace" "app" {
  metadata {
    name = "application"
  }
}

# Workload Identity for the application
module "app_workload_identity" {
  source = "./modules/workload-identity"

  project_id             = var.project_id
  cluster_name           = "production"
  namespace              = kubernetes_namespace.app.metadata[0].name
  service_account_name   = "app-sa"
  workload_identity_pool = module.gke.workload_identity_pool

  gcp_roles = [
    "roles/storage.objectViewer",
    "roles/pubsub.publisher",
    "roles/secretmanager.secretAccessor",
  ]
}

# Workload Identity for a data pipeline
module "pipeline_workload_identity" {
  source = "./modules/workload-identity"

  project_id             = var.project_id
  cluster_name           = "production"
  namespace              = kubernetes_namespace.app.metadata[0].name
  service_account_name   = "pipeline-sa"
  workload_identity_pool = module.gke.workload_identity_pool

  gcp_roles = [
    "roles/bigquery.dataEditor",
    "roles/storage.objectAdmin",
  ]
}
```

## Step 5: Use Workload Identity in a Deployment

Once the infrastructure is deployed, pods can use Workload Identity by referencing the Kubernetes service account:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: application
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      serviceAccountName: app-sa
      containers:
        - name: app
          image: gcr.io/my-project/my-app:latest
          env:
            - name: GOOGLE_CLOUD_PROJECT
              value: my-project
```

The application code does not need any special credential handling. Google Cloud client libraries automatically detect the GKE metadata server and obtain tokens through Workload Identity:

```go
// Go example - no explicit credentials needed
import (
    "cloud.google.com/go/storage"
    "context"
)

func main() {
    ctx := context.Background()
    // The client automatically uses Workload Identity
    client, err := storage.NewClient(ctx)
    if err != nil {
        log.Fatal(err)
    }
    defer client.Close()
    // Use the client...
}
```

```python
# Python example - no explicit credentials needed
from google.cloud import storage

# Application Default Credentials picks up Workload Identity automatically
client = storage.Client()
bucket = client.get_bucket("my-bucket")
```

## Verifying Workload Identity

After deploying a pod, verify that Workload Identity is working:

```bash
kubectl exec -it deploy/my-app -n application -- \
  curl -s -H "Metadata-Flavor: Google" \
  http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/email
```

This should return the GCP service account email (e.g., `app-sa@my-project.iam.gserviceaccount.com`), not the node's service account.

## Troubleshooting

**Pods get the node service account instead of the Workload Identity account**: Verify that `workload_metadata_config.mode = "GKE_METADATA"` is set on the node pool. Check that the Kubernetes service account has the `iam.gke.io/gcp-service-account` annotation. Ensure the IAM binding exists with `gcloud iam service-accounts get-iam-policy <GCP_SA_EMAIL>`.

**Permission denied errors**: Verify the GCP IAM roles are correct. Use `gcloud projects get-iam-policy <PROJECT_ID>` to audit the bindings. Check that the Workload Identity pool string matches exactly: `<PROJECT_ID>.svc.id.goog[<NAMESPACE>/<KSA_NAME>]`.

**Metadata server timeout**: The GKE metadata server can take a few seconds to become available when a pod starts. Add a readiness check or initial delay to your application startup.

## Conclusion

Workload Identity is the cornerstone of secure GCP access from GKE pods. By mapping Kubernetes service accounts to GCP IAM service accounts, you eliminate static credentials, enforce the principle of least privilege per workload, and gain full auditability through Cloud Audit Logs. The Terraform module approach shown here makes Workload Identity setup repeatable and consistent across environments. For every new workload that needs GCP access, simply instantiate the workload-identity module with the appropriate roles, and your pods are securely authenticated without a single credential file in sight.
