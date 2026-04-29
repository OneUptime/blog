# How to Migrate GCP Infrastructure from Deployment Manager to OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Deployment Manager, GCP, Migration, Infrastructure as Code

Description: Learn how to migrate GCP infrastructure managed by Deployment Manager into OpenTofu state without recreating resources.

## Introduction

Google Cloud Deployment Manager used YAML or Python templates to define GCP resources and reached end of support on March 31, 2026. It had limited community ecosystem support and lacked many features that OpenTofu provides. Migrating to OpenTofu with the google provider gives you a richer HCL syntax, better module reuse, and multi-cloud capability. Importing existing resources into state does not recreate them, so the cutover can avoid resource replacement when the translated configuration matches the live infrastructure.

## Phase 1: Audit Deployment Manager Deployments

Inventory your existing deployments and resources.

```bash
# List all deployments

gcloud deployment-manager deployments list

# Describe a specific deployment
gcloud deployment-manager deployments describe my-app-deployment

# List resources in a deployment
gcloud deployment-manager resources list \
  --deployment my-app-deployment

# Export the latest deployment manifest for reference
gcloud deployment-manager manifests describe \
  --deployment my-app-deployment \
  --format yaml > my-app-deployment-manifest.yaml
```

## Phase 2: Translate Deployment Manager to HCL

Convert Deployment Manager resource definitions to OpenTofu HCL.

```yaml
# Deployment Manager YAML (original)
resources:
  - name: my-app-bucket
    type: storage.v1.bucket
    properties:
      location: US
      storageClass: STANDARD
      versioning:
        enabled: true
```

```hcl
# OpenTofu equivalent
resource "google_storage_bucket" "app" {
  name          = "my-app-bucket"
  location      = "US"
  storage_class = "STANDARD"
  force_destroy = false

  versioning {
    enabled = true
  }
}
```

## Common Resource Type Translations

```text
Deployment Manager Type              → OpenTofu Resource
----------------------------------------------------------
compute.v1.instance                  → google_compute_instance
compute.v1.network                   → google_compute_network
compute.v1.subnetwork               → google_compute_subnetwork
compute.v1.firewall                  → google_compute_firewall
storage.v1.bucket                    → google_storage_bucket
sqladmin.v1beta4.instance           → google_sql_database_instance
container.v1.cluster                 → google_container_cluster
iam.v1.serviceAccount               → google_service_account
pubsub.v1.topic                     → google_pubsub_topic
```

## Phase 3: Import Existing Resources

Define matching `resource` blocks first, then use import blocks to bring GCP resources into OpenTofu state.

```hcl
# imports.tf

import {
  id = "my-project/my-app-bucket"
  to = google_storage_bucket.app
}

import {
  id = "projects/my-project/zones/us-central1-a/instances/my-app-vm"
  to = google_compute_instance.app
}

import {
  id = "projects/my-project/global/networks/my-app-network"
  to = google_compute_network.main
}
```

```bash
# Initialize and review the import plan
tofu init
tofu plan    # preview import actions and any drift
tofu apply   # import resources into state
```

## Phase 4: Handle Deployment Manager Templates

For Deployment Manager Python or Jinja2 templates, translate them to OpenTofu modules.

```python
# Deployment Manager Python template (original)
def GenerateConfig(context):
  resources = []
  for i in range(context.properties['count']):
    resources.append({
      'name': f"vm-{i}",
      'type': 'compute.v1.instance',
      'properties': {
        'zone': context.properties['zone'],
        'machineType': f"zones/{context.properties['zone']}/machineTypes/n1-standard-1"
      }
    })
  return {'resources': resources}
```

```hcl
# OpenTofu equivalent using for_each
variable "vm_count" {
  type    = number
  default = 3
}

variable "zone" {
  type    = string
  default = "us-central1-a"
}

resource "google_compute_instance" "app" {
  for_each     = toset([for i in range(var.vm_count) : "vm-${i}"])
  name         = each.key
  machine_type = "n1-standard-1"
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
    }
  }

  network_interface {
    network = "default"
  }
}
```

## Phase 5: Decommission Deployment Manager

After successful import and validation, abandon the Deployment Manager deployment without deleting resources.

```bash
# Verify no changes in OpenTofu plan
tofu plan  # should show: No changes

# Abandon the deployment (keeps resources, removes DM management)
gcloud deployment-manager deployments delete my-app-deployment \
  --delete-policy abandon

# Resources remain in GCP and are now managed through OpenTofu state
```

## Summary

Migrating from Deployment Manager to OpenTofu requires translating YAML/Python templates to HCL, defining matching OpenTofu resource blocks, importing existing resources using each resource's provider-specific import ID, and abandoning the Deployment Manager deployment with `--delete-policy abandon`. The abandon flag is critical - it removes Deployment Manager's tracking of the resources without deleting them. After migration, the resources remain in GCP and are managed through OpenTofu for better tooling, testing, and potential multi-cloud expansion.
