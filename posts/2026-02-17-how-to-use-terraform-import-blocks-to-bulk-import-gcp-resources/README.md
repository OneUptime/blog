# How to Use Terraform Import Blocks to Bulk Import GCP Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, Import, Infrastructure as Code, Resource Management

Description: Learn how to use Terraform import blocks to bring existing GCP resources under Terraform management in bulk, with practical examples and migration strategies.

---

You have existing GCP resources that were created manually through the console, gcloud CLI, or another tool. Now you want to manage them with Terraform. The traditional approach was running `terraform import` commands one at a time, which is tedious and error-prone when you have dozens or hundreds of resources.

Terraform 1.5 introduced import blocks, a declarative way to import resources directly in your configuration files. This changes the game for bulk imports, letting you plan, review, and execute imports just like any other Terraform change.

## The Old Way vs Import Blocks

Before import blocks, importing a GCP Compute instance looked like this:

```bash
# The old way - imperative, one resource at a time
terraform import google_compute_instance.web projects/my-project/zones/us-central1-a/instances/web-server-1
terraform import google_compute_instance.api projects/my-project/zones/us-central1-a/instances/api-server-1
terraform import google_compute_instance.db projects/my-project/zones/us-central1-a/instances/db-server-1
# ... repeat for every resource
```

The problems with this approach: you had to write the Terraform configuration first (guessing at attribute values), run the import, then run `terraform plan` to see what did not match, then fix your configuration. Repeat until the plan shows no changes.

Import blocks flip this workflow. You declare what to import, and Terraform can even generate the configuration for you.

## Basic Import Block Syntax

An import block tells Terraform to import an existing resource into a specific address in your state:

```hcl
# imports.tf - Import an existing Compute Engine instance
import {
  to = google_compute_instance.web
  id = "projects/my-project/zones/us-central1-a/instances/web-server-1"
}

# The corresponding resource block
resource "google_compute_instance" "web" {
  name         = "web-server-1"
  machine_type = "e2-medium"
  zone         = "us-central1-a"

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

When you run `terraform plan`, Terraform will show that it plans to import this resource. Run `terraform apply` to execute the import.

## Generating Configuration from Imports

The real power of import blocks comes with the `-generate-config-out` flag. Instead of writing the resource configuration by hand, Terraform can generate it from the existing resource:

```hcl
# imports.tf - Declare imports without writing resource blocks
import {
  to = google_compute_instance.web
  id = "projects/my-project/zones/us-central1-a/instances/web-server-1"
}

import {
  to = google_compute_instance.api
  id = "projects/my-project/zones/us-central1-a/instances/api-server-1"
}

import {
  to = google_compute_network.main_vpc
  id = "projects/my-project/global/networks/main-vpc"
}
```

Then run:

```bash
# Generate resource configuration from existing GCP resources
terraform plan -generate-config-out=generated.tf
```

Terraform reads the actual state of each resource from GCP and writes the corresponding HCL configuration to `generated.tf`. Review the generated file, clean it up, and you are ready to go.

## Bulk Importing GCP Resources

For a large-scale import, you need to know the resource IDs. Here is a workflow for discovering and importing resources in bulk.

### Step 1: Discover Existing Resources

Use gcloud to list the resources you want to import:

```bash
# List all Compute Engine instances in the project
gcloud compute instances list --project=my-project --format="value(name,zone)"

# List all Cloud SQL instances
gcloud sql instances list --project=my-project --format="value(name)"

# List all VPC networks
gcloud compute networks list --project=my-project --format="value(name)"

# List all GKE clusters
gcloud container clusters list --project=my-project --format="value(name,zone)"

# List all Cloud Run services
gcloud run services list --project=my-project --format="value(metadata.name,region)"
```

### Step 2: Generate Import Blocks

You can script the generation of import blocks. Here is a bash script that generates import blocks for all Compute instances:

```bash
# Generate import blocks for all Compute Engine instances in the project
#!/bin/bash
PROJECT="my-project"

gcloud compute instances list --project=$PROJECT \
  --format="csv[no-heading](name,zone)" | while IFS=',' read -r name zone; do

  # Convert the instance name to a valid Terraform resource name
  tf_name=$(echo "$name" | tr '-' '_')

  echo "import {"
  echo "  to = google_compute_instance.${tf_name}"
  echo "  id = \"projects/${PROJECT}/zones/${zone}/instances/${name}\""
  echo "}"
  echo ""
done > imports.tf

echo "Generated import blocks in imports.tf"
```

### Step 3: Generate and Review Configuration

```bash
# Generate the Terraform configuration from the import blocks
terraform plan -generate-config-out=generated_resources.tf

# Review the generated configuration
cat generated_resources.tf
```

### Step 4: Clean Up Generated Code

The generated configuration is functional but not pretty. Common cleanups include:

- Removing computed attributes that Terraform manages automatically
- Replacing hardcoded values with variables
- Adding proper descriptions and comments
- Organizing resources into logical files

```hcl
# Before cleanup - generated code has many computed attributes
resource "google_compute_instance" "web_server_1" {
  boot_disk {
    auto_delete = true
    device_name = "web-server-1"
    initialize_params {
      image = "https://www.googleapis.com/compute/v1/projects/debian-cloud/global/images/debian-12-bookworm-v20240110"
      size  = 10
      type  = "pd-balanced"
    }
  }
  # ... many more auto-generated attributes
}

# After cleanup - clean, maintainable configuration
resource "google_compute_instance" "web_server" {
  name         = "web-server-1"
  machine_type = var.web_machine_type
  zone         = var.zone

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 10
    }
  }

  network_interface {
    network    = google_compute_network.main.id
    subnetwork = google_compute_subnetwork.web.id
  }

  labels = var.common_labels
}
```

### Step 5: Apply the Import

```bash
# Run plan to verify the import will work correctly
terraform plan

# If the plan shows only imports and no changes, apply
terraform apply
```

A clean import should show resources being imported with no planned changes. If Terraform wants to modify resources after import, review the differences carefully before applying.

## Import Block ID Formats for Common GCP Resources

Each GCP resource type has its own ID format. Here are the common ones:

```hcl
# Compute Engine Instance
import {
  to = google_compute_instance.example
  id = "projects/PROJECT/zones/ZONE/instances/NAME"
}

# VPC Network
import {
  to = google_compute_network.example
  id = "projects/PROJECT/global/networks/NAME"
}

# Cloud SQL Instance
import {
  to = google_sql_database_instance.example
  id = "projects/PROJECT/instances/NAME"
}

# GKE Cluster
import {
  to = google_container_cluster.example
  id = "projects/PROJECT/locations/LOCATION/clusters/NAME"
}

# Cloud Run Service
import {
  to = google_cloud_run_service.example
  id = "locations/REGION/namespaces/PROJECT/services/NAME"
}

# IAM Service Account
import {
  to = google_service_account.example
  id = "projects/PROJECT/serviceAccounts/SA_EMAIL"
}

# Cloud Storage Bucket
import {
  to = google_storage_bucket.example
  id = "BUCKET_NAME"
}

# Pub/Sub Topic
import {
  to = google_pubsub_topic.example
  id = "projects/PROJECT/topics/NAME"
}
```

## Handling Import Errors

Common issues you will run into during bulk imports:

**Resource not found.** Double-check the ID format. Each resource type has a specific format, and getting it wrong produces a confusing error.

**Attribute conflicts.** Some attributes are mutually exclusive. If the generated config includes conflicting attributes, remove one.

**Permission denied.** The account running Terraform needs read access to the resource being imported. Check your IAM bindings.

**State already contains resource.** If a resource is already in state, you cannot import it again. Use `terraform state rm` first if you need to re-import.

## Using for_each with Import Blocks

For importing multiple similar resources, combine import blocks with `for_each`:

```hcl
# variables.tf - Define the instances to import
variable "instances_to_import" {
  type = map(object({
    zone = string
  }))
  default = {
    "web-server-1" = { zone = "us-central1-a" }
    "web-server-2" = { zone = "us-central1-b" }
    "web-server-3" = { zone = "us-central1-c" }
  }
}

# imports.tf - Import blocks using for_each
import {
  for_each = var.instances_to_import
  to       = google_compute_instance.web[each.key]
  id       = "projects/my-project/zones/${each.value.zone}/instances/${each.key}"
}

# main.tf - Resource block using for_each
resource "google_compute_instance" "web" {
  for_each     = var.instances_to_import
  name         = each.key
  machine_type = "e2-medium"
  zone         = each.value.zone

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

## Best Practices for Bulk Imports

1. **Import in batches.** Do not try to import 500 resources at once. Group them by type or service and import in manageable batches.
2. **Always review the plan.** Never apply an import without carefully reading the plan output.
3. **Back up existing state** before starting a large import operation.
4. **Clean up import blocks after applying.** Once the import is complete, you can remove the import blocks from your code.
5. **Test with a small batch first.** Import 2-3 resources to validate your ID formats and configuration before scaling up.

## Wrapping Up

Import blocks transform GCP resource imports from a tedious manual process into a declarative, reviewable workflow. Combined with configuration generation, you can bring hundreds of existing resources under Terraform management in a fraction of the time the old `terraform import` command would take. Start with your most critical resources, validate the generated configuration, and gradually expand coverage.
