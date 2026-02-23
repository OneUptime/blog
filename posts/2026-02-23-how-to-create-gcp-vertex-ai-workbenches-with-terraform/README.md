# How to Create GCP Vertex AI Workbenches with Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, GCP, Vertex AI, Machine Learning, Notebooks, Infrastructure as Code

Description: Learn how to provision Vertex AI Workbench instances and managed notebooks on Google Cloud using Terraform for reproducible ML environments.

---

Vertex AI Workbench provides managed Jupyter notebook environments on Google Cloud. Data scientists and ML engineers use them for experimentation, model training, and data exploration. The problem is that when notebooks are created manually through the console, each team member ends up with a slightly different setup - different machine types, different libraries, different network configurations.

Terraform solves this by letting you define standardized notebook environments as code. Everyone gets the same base configuration, and changes go through code review. This guide covers creating both managed and user-managed Vertex AI Workbench instances with Terraform.

## Enabling Required APIs

Vertex AI Workbench depends on several APIs.

```hcl
# Enable Vertex AI and Notebooks APIs
resource "google_project_service" "notebooks" {
  project = var.project_id
  service = "notebooks.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "aiplatform" {
  project = var.project_id
  service = "aiplatform.googleapis.com"

  disable_on_destroy = false
}

resource "google_project_service" "compute" {
  project = var.project_id
  service = "compute.googleapis.com"

  disable_on_destroy = false
}
```

## Service Account for Workbenches

Create a service account with the permissions your data scientists actually need. This is better than giving each user broad project-level roles.

```hcl
# Service account for Vertex AI Workbench instances
resource "google_service_account" "workbench_sa" {
  account_id   = "vertex-workbench"
  display_name = "Vertex AI Workbench Service Account"
  project      = var.project_id
}

# Grant Vertex AI User role
resource "google_project_iam_member" "vertex_user" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.workbench_sa.email}"
}

# Grant BigQuery access for data exploration
resource "google_project_iam_member" "bigquery_user" {
  project = var.project_id
  role    = "roles/bigquery.dataViewer"
  member  = "serviceAccount:${google_service_account.workbench_sa.email}"
}

# Grant GCS access for reading datasets
resource "google_project_iam_member" "storage_viewer" {
  project = var.project_id
  role    = "roles/storage.objectViewer"
  member  = "serviceAccount:${google_service_account.workbench_sa.email}"
}
```

## Creating a Vertex AI Workbench Instance

The `google_workbench_instance` resource creates a Vertex AI Workbench instance (the newer version that replaces the legacy notebook instances).

```hcl
# Vertex AI Workbench instance
resource "google_workbench_instance" "ml_notebook" {
  name     = "ml-workbench-${var.environment}"
  location = var.zone
  project  = var.project_id

  gce_setup {
    # Machine type for the notebook
    machine_type = "n1-standard-8"

    # Use a GPU for model training
    accelerator_configs {
      type       = "NVIDIA_TESLA_T4"
      core_count = 1
    }

    # Boot disk configuration
    boot_disk {
      disk_size_gb = 150
      disk_type    = "PD_SSD"
    }

    # Data disk for storing notebooks and datasets
    data_disks {
      disk_size_gb = 500
      disk_type    = "PD_STANDARD"
    }

    # Service account
    service_accounts {
      email = google_service_account.workbench_sa.email
    }

    # Network configuration
    network_interfaces {
      network  = var.network_id
      subnet   = var.subnet_id
      nic_type = "GVNIC"
    }

    # Disable public IP for security
    disable_public_ip = true

    # Metadata
    metadata = {
      terraform     = "true"
      idle-timeout  = "3600"
    }

    # VM image - use the Deep Learning VM
    vm_image {
      project = "deeplearning-platform-release"
      family  = "tf-latest-gpu"
    }
  }

  # Auto-shutdown idle instances to save money
  labels = {
    environment = var.environment
    team        = "ml-engineering"
    managed_by  = "terraform"
  }

  depends_on = [
    google_project_service.notebooks,
    google_project_service.aiplatform
  ]
}
```

## Creating Instances Without GPUs

Not every notebook needs a GPU. For data exploration and feature engineering, a CPU-only instance is cheaper and often sufficient.

```hcl
# CPU-only workbench for data exploration
resource "google_workbench_instance" "data_exploration" {
  name     = "data-explore-${var.environment}"
  location = var.zone
  project  = var.project_id

  gce_setup {
    machine_type = "e2-standard-4"

    boot_disk {
      disk_size_gb = 100
      disk_type    = "PD_BALANCED"
    }

    data_disks {
      disk_size_gb = 200
      disk_type    = "PD_STANDARD"
    }

    service_accounts {
      email = google_service_account.workbench_sa.email
    }

    network_interfaces {
      network  = var.network_id
      subnet   = var.subnet_id
    }

    disable_public_ip = true

    # Use the base Python image
    vm_image {
      project = "deeplearning-platform-release"
      family  = "common-cpu"
    }
  }

  labels = {
    environment = var.environment
    team        = "data-science"
    gpu         = "false"
  }
}
```

## Creating Multiple Workbenches with for_each

When you need to create notebooks for multiple team members, use `for_each` to avoid duplicating configuration.

```hcl
# Define team members and their notebook configurations
variable "notebooks" {
  description = "Map of notebook configurations per team member"
  type = map(object({
    machine_type = string
    gpu          = bool
    disk_size_gb = number
  }))
  default = {
    "alice" = {
      machine_type = "n1-standard-8"
      gpu          = true
      disk_size_gb = 500
    }
    "bob" = {
      machine_type = "e2-standard-4"
      gpu          = false
      disk_size_gb = 200
    }
    "carol" = {
      machine_type = "n1-standard-16"
      gpu          = true
      disk_size_gb = 1000
    }
  }
}

# Create a workbench instance for each team member
resource "google_workbench_instance" "team_notebooks" {
  for_each = var.notebooks

  name     = "workbench-${each.key}-${var.environment}"
  location = var.zone
  project  = var.project_id

  gce_setup {
    machine_type = each.value.machine_type

    # Conditionally add GPU
    dynamic "accelerator_configs" {
      for_each = each.value.gpu ? [1] : []
      content {
        type       = "NVIDIA_TESLA_T4"
        core_count = 1
      }
    }

    boot_disk {
      disk_size_gb = 100
      disk_type    = "PD_SSD"
    }

    data_disks {
      disk_size_gb = each.value.disk_size_gb
      disk_type    = "PD_STANDARD"
    }

    service_accounts {
      email = google_service_account.workbench_sa.email
    }

    network_interfaces {
      network  = var.network_id
      subnet   = var.subnet_id
    }

    disable_public_ip = true

    vm_image {
      project = "deeplearning-platform-release"
      family  = each.value.gpu ? "tf-latest-gpu" : "common-cpu"
    }
  }

  labels = {
    environment = var.environment
    owner       = each.key
    managed_by  = "terraform"
  }
}
```

## Post-Startup Scripts

You can run scripts after the instance boots to install additional packages or configure the environment.

```hcl
# Upload the startup script to GCS
resource "google_storage_bucket_object" "post_startup" {
  name    = "scripts/notebook-post-startup.sh"
  bucket  = var.scripts_bucket
  content = <<-SCRIPT
    #!/bin/bash
    # Install additional Python packages
    pip install --upgrade pip
    pip install transformers datasets accelerate
    pip install mlflow wandb

    # Configure git
    git config --global user.name "ML Team"
    git config --global user.email "ml-team@example.com"

    # Clone the team's repo
    cd /home/jupyter
    git clone https://github.com/example/ml-pipelines.git
  SCRIPT
}

# Reference the script in the workbench instance
resource "google_workbench_instance" "with_startup" {
  name     = "ml-custom-${var.environment}"
  location = var.zone
  project  = var.project_id

  gce_setup {
    machine_type = "n1-standard-8"

    boot_disk {
      disk_size_gb = 150
      disk_type    = "PD_SSD"
    }

    data_disks {
      disk_size_gb = 500
      disk_type    = "PD_STANDARD"
    }

    service_accounts {
      email = google_service_account.workbench_sa.email
    }

    network_interfaces {
      network  = var.network_id
      subnet   = var.subnet_id
    }

    disable_public_ip = true

    # Post-startup script
    metadata = {
      post-startup-script = "gs://${var.scripts_bucket}/scripts/notebook-post-startup.sh"
    }

    vm_image {
      project = "deeplearning-platform-release"
      family  = "tf-latest-gpu"
    }
  }

  labels = {
    environment = var.environment
    custom      = "true"
  }
}
```

## Scheduling Auto-Stop

One of the biggest cost drivers with notebook instances is leaving them running overnight or over weekends. You can configure idle shutdown through instance metadata.

The `idle-timeout` metadata key tells the instance to shut down after a period of inactivity. This is measured in seconds.

```hcl
# Instance with aggressive idle shutdown
resource "google_workbench_instance" "cost_conscious" {
  name     = "ml-dev-${var.environment}"
  location = var.zone
  project  = var.project_id

  gce_setup {
    machine_type = "n1-standard-4"

    boot_disk {
      disk_size_gb = 100
      disk_type    = "PD_BALANCED"
    }

    service_accounts {
      email = google_service_account.workbench_sa.email
    }

    network_interfaces {
      network  = var.network_id
      subnet   = var.subnet_id
    }

    disable_public_ip = true

    metadata = {
      # Shut down after 30 minutes of inactivity
      idle-timeout = "1800"
    }

    vm_image {
      project = "deeplearning-platform-release"
      family  = "common-cpu"
    }
  }

  labels = {
    environment = var.environment
    auto_stop   = "30min"
  }
}
```

## Practical Advice

Vertex AI Workbench instances are basically Compute Engine VMs with Jupyter pre-installed. That means they cost money whenever they are running, even if nobody is using them. Set up idle shutdown and remind your team to stop instances when they are not actively using them.

For GPU instances, availability can be an issue. T4 GPUs are generally available, but A100s and V100s might not be available in every zone. Check availability before committing to a specific GPU type and zone in your Terraform config.

Use the `disable_public_ip` option whenever possible and connect through IAP (Identity-Aware Proxy) instead. This keeps your notebook instances off the public internet.

## Conclusion

Terraform makes it straightforward to standardize Vertex AI Workbench environments across your team. You get consistent configurations, proper network security, and cost controls through idle shutdown - all defined in code and reviewable through your standard pull request process. Whether you are setting up a single notebook for prototyping or provisioning instances for an entire ML team, Terraform keeps everything manageable and reproducible.
