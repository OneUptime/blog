# How to Use the GCP Config Connector with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Config Connector, Kubernetes, Infrastructure as Code

Description: Learn how to use the GCP Config Connector alongside Terraform to manage Google Cloud resources through Kubernetes-native workflows.

---

Google Cloud Config Connector is a Kubernetes add-on that lets you manage GCP resources through Kubernetes custom resource definitions. While it operates differently from Terraform, many teams use both tools together. In this guide, you will learn how Config Connector works, how to deploy it with Terraform, and how to create a workflow that leverages the strengths of both tools.

## What Is GCP Config Connector?

Config Connector is a Kubernetes controller that maps GCP resources to Kubernetes custom resources. When you create a Kubernetes manifest describing a GCP resource, Config Connector provisions and manages that resource in Google Cloud. This means teams familiar with Kubernetes can manage cloud infrastructure using kubectl and standard Kubernetes workflows.

Config Connector supports over 300 GCP resource types including Compute Engine instances, Cloud SQL databases, GKE clusters, Cloud Storage buckets, IAM policies, and more. Each resource type has a corresponding Kubernetes Custom Resource Definition (CRD).

## Why Combine Config Connector with Terraform?

Using both tools together makes sense in several scenarios. Terraform excels at provisioning foundational infrastructure like networks, GKE clusters, and IAM configurations. Config Connector works well for application-level resources that developers manage alongside their Kubernetes workloads. By using Terraform for the platform layer and Config Connector for the application layer, you get the best of both worlds.

## Deploying Config Connector with Terraform

First, set up a GKE cluster with Config Connector enabled using Terraform:

```hcl
# Configure the GCP provider
provider "google" {
  project = var.project_id
  region  = var.region
}

# Create a GKE cluster with Config Connector enabled
resource "google_container_cluster" "primary" {
  name     = "config-connector-cluster"
  location = var.region

  # Enable Config Connector add-on
  addons_config {
    config_connector_config {
      enabled = true
    }
  }

  # Workload identity is required for Config Connector
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Use a separately managed node pool
  remove_default_node_pool = true
  initial_node_count       = 1
}

# Create a node pool
resource "google_container_node_pool" "primary_nodes" {
  name       = "primary-pool"
  location   = var.region
  cluster    = google_container_cluster.primary.name
  node_count = 3

  node_config {
    machine_type = "e2-standard-4"

    # Enable workload identity on nodes
    workload_metadata_config {
      mode = "GKE_METADATA"
    }
  }
}
```

## Setting Up Identity for Config Connector

Config Connector needs a Google Cloud service account with permissions to manage resources. Set this up with Terraform:

```hcl
# Create a service account for Config Connector
resource "google_service_account" "config_connector" {
  account_id   = "config-connector-sa"
  display_name = "Config Connector Service Account"
  project      = var.project_id
}

# Grant the service account broad permissions
# In production, scope this down to only needed roles
resource "google_project_iam_member" "config_connector_editor" {
  project = var.project_id
  role    = "roles/editor"
  member  = "serviceAccount:${google_service_account.config_connector.email}"
}

# Bind the Kubernetes service account to the GCP service account
resource "google_service_account_iam_member" "config_connector_binding" {
  service_account_id = google_service_account.config_connector.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[cnrm-system/cnrm-controller-manager]"
}
```

## Configuring Config Connector with Terraform

After the cluster is ready, configure Config Connector using the Kubernetes provider in Terraform:

```hcl
# Configure the Kubernetes provider
provider "kubernetes" {
  host                   = "https://${google_container_cluster.primary.endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(google_container_cluster.primary.master_auth[0].cluster_ca_certificate)
}

data "google_client_config" "default" {}

# Create the ConfigConnectorContext resource
resource "kubernetes_manifest" "config_connector_context" {
  manifest = {
    apiVersion = "core.cnrm.cloud.google.com/v1beta1"
    kind       = "ConfigConnectorContext"
    metadata = {
      name      = "configconnectorcontext.core.cnrm.cloud.google.com"
      namespace = "default"
    }
    spec = {
      googleServiceAccount = google_service_account.config_connector.email
    }
  }

  depends_on = [
    google_container_cluster.primary,
    google_container_node_pool.primary_nodes,
  ]
}
```

## Creating GCP Resources with Config Connector

Once Config Connector is running, you can create GCP resources using Kubernetes manifests. Here are some examples:

```yaml
# cloud-storage-bucket.yaml
# Create a Cloud Storage bucket via Config Connector
apiVersion: storage.cnrm.cloud.google.com/v1beta1
kind: StorageBucket
metadata:
  name: my-application-bucket
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project"
spec:
  location: US
  storageClass: STANDARD
  versioning:
    enabled: true
  lifecycleRule:
    - action:
        type: Delete
      condition:
        age: 30
```

```yaml
# cloud-sql-instance.yaml
# Create a Cloud SQL instance via Config Connector
apiVersion: sql.cnrm.cloud.google.com/v1beta1
kind: SQLInstance
metadata:
  name: my-application-db
  namespace: default
spec:
  databaseVersion: POSTGRES_14
  region: us-central1
  settings:
    tier: db-custom-2-7680
    backupConfiguration:
      enabled: true
      startTime: "03:00"
    ipConfiguration:
      privateNetworkRef:
        name: my-vpc-network
```

You can also manage these manifests through Terraform using the kubernetes_manifest resource:

```hcl
# Create a Cloud Storage bucket through Config Connector via Terraform
resource "kubernetes_manifest" "storage_bucket" {
  manifest = {
    apiVersion = "storage.cnrm.cloud.google.com/v1beta1"
    kind       = "StorageBucket"
    metadata = {
      name      = "my-app-bucket"
      namespace = "default"
      annotations = {
        "cnrm.cloud.google.com/project-id" = var.project_id
      }
    }
    spec = {
      location     = "US"
      storageClass = "STANDARD"
    }
  }
}
```

## Defining Boundaries Between Terraform and Config Connector

Establishing clear boundaries is essential for avoiding conflicts. A common pattern is:

```text
Terraform manages:
  - VPC networks and subnets
  - GKE clusters and node pools
  - IAM roles and service accounts
  - DNS zones and records
  - Config Connector setup itself

Config Connector manages:
  - Cloud SQL instances for applications
  - Cloud Storage buckets for applications
  - Pub/Sub topics and subscriptions
  - Cloud Memorystore instances
  - Application-specific IAM bindings
```

## Handling Resource Ownership Conflicts

Never manage the same resource with both Terraform and Config Connector. This causes conflicts as both tools try to reconcile the resource to their desired state. If you need to transfer a resource between tools, follow this process:

```bash
# Step 1: Remove the resource from Terraform state
# (does NOT delete the actual resource)
terraform state rm google_storage_bucket.my_bucket

# Step 2: Create the Config Connector manifest
# with the abandon-on-delete annotation to be safe
kubectl apply -f - <<EOF
apiVersion: storage.cnrm.cloud.google.com/v1beta1
kind: StorageBucket
metadata:
  name: my-existing-bucket
  namespace: default
  annotations:
    cnrm.cloud.google.com/project-id: "my-project"
    # This annotation prevents deletion of the GCP resource
    # if the Kubernetes resource is deleted
    cnrm.cloud.google.com/deletion-policy: "abandon"
spec:
  resourceID: my-existing-bucket
  location: US
EOF

# Step 3: Wait for Config Connector to adopt the resource
kubectl wait --for=condition=Ready storagebucket/my-existing-bucket
```

## Monitoring Config Connector Resources

You can monitor the status of Config Connector resources using kubectl:

```bash
# Check the status of all Config Connector resources
kubectl get gcp

# Check a specific resource
kubectl describe storagebucket my-application-bucket

# Watch for status changes
kubectl get storagebucket -w
```

You can also set up monitoring with Terraform by creating alerts for Config Connector health:

```hcl
# Create a monitoring alert for Config Connector errors
resource "google_monitoring_alert_policy" "config_connector_errors" {
  display_name = "Config Connector Errors"
  combiner     = "OR"

  conditions {
    display_name = "Config Connector reconciliation errors"
    condition_threshold {
      filter          = "resource.type=\"k8s_container\" AND resource.labels.container_name=\"manager\" AND resource.labels.namespace_name=\"cnrm-system\""
      comparison      = "COMPARISON_GT"
      threshold_value = 0
      duration        = "300s"
    }
  }

  notification_channels = [var.notification_channel_id]
}
```

## Best Practices

Use namespace-level Config Connector contexts to isolate different teams or applications. Each namespace can have its own GCP service account with appropriately scoped permissions. Always set the deletion policy annotation on Config Connector resources to prevent accidental deletion of cloud resources when Kubernetes resources are removed. Use Terraform to manage the foundational infrastructure and Config Connector for resources that are tightly coupled to application workloads.

Store Config Connector manifests alongside application code in the same repository. This keeps infrastructure definitions close to the applications that use them and enables GitOps workflows with tools like Argo CD or Flux.

## Conclusion

The GCP Config Connector bridges Kubernetes and Google Cloud resource management, and Terraform provides the perfect tool for setting up and configuring Config Connector itself. By drawing clear boundaries between what each tool manages, you can build a robust infrastructure management strategy that serves both platform and application teams. The combination gives you Terraform's mature state management for foundational resources and Kubernetes-native workflows for application-level infrastructure.

For related guides, see [How to Use Terraformer to Auto-Generate Terraform from Cloud](https://oneuptime.com/blog/post/2026-02-23-how-to-use-terraformer-to-auto-generate-terraform-from-cloud/view) and [How to Migrate from Google Deployment Manager to Terraform](https://oneuptime.com/blog/post/2026-02-23-how-to-migrate-from-google-deployment-manager-to-terraform/view).
