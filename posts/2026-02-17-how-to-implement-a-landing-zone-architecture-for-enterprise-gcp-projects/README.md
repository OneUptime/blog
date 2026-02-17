# How to Implement a Landing Zone Architecture for Enterprise GCP Projects

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Landing Zone, Enterprise Architecture, Cloud Foundation, Google Cloud

Description: Learn how to design and implement a landing zone architecture for enterprise Google Cloud Platform projects with proper resource hierarchy, networking, and security controls.

---

When you are setting up Google Cloud Platform for an enterprise, one of the first things you need to get right is the landing zone. A landing zone is a pre-configured, secure, and scalable cloud environment that serves as the foundation for all your workloads. Get it wrong, and you will spend months cleaning up the mess. Get it right, and your teams can move fast without breaking security or compliance requirements.

In this guide, I will walk through the practical steps of implementing a GCP landing zone from scratch, covering resource hierarchy, networking, identity, and governance.

## What is a Landing Zone?

A landing zone is not a single product or service. It is a combination of organizational policies, resource structures, networking configurations, and identity controls that together create a well-governed cloud environment. Think of it as the blueprint for your entire cloud infrastructure.

Google Cloud provides a reference architecture through their Cloud Foundation Toolkit, but most enterprises need to customize it for their specific needs. The key components are:

- Resource hierarchy (Organizations, Folders, Projects)
- Identity and Access Management (IAM)
- Networking (VPCs, subnets, firewalls, interconnects)
- Logging and monitoring
- Security policies and guardrails
- Billing structure

## Step 1: Design the Resource Hierarchy

The resource hierarchy in GCP starts with the Organization node at the top, followed by Folders, and then Projects. This structure directly maps to how you apply IAM policies and organizational constraints.

Here is a Terraform configuration that sets up a typical enterprise folder structure.

```hcl
# Create top-level folders for different business functions
resource "google_folder" "production" {
  display_name = "Production"
  parent       = "organizations/${var.org_id}"
}

resource "google_folder" "staging" {
  display_name = "Staging"
  parent       = "organizations/${var.org_id}"
}

resource "google_folder" "development" {
  display_name = "Development"
  parent       = "organizations/${var.org_id}"
}

resource "google_folder" "shared_services" {
  display_name = "Shared Services"
  parent       = "organizations/${var.org_id}"
}

resource "google_folder" "sandbox" {
  display_name = "Sandbox"
  parent       = "organizations/${var.org_id}"
}

# Create sub-folders for business units within Production
resource "google_folder" "prod_team_a" {
  display_name = "Team A"
  parent       = google_folder.production.name
}

resource "google_folder" "prod_team_b" {
  display_name = "Team B"
  parent       = google_folder.production.name
}
```

A common pattern is to separate environments at the top level (Production, Staging, Development) and then subdivide by business unit or team. This way, you can apply strict policies at the Production folder level while giving more flexibility in Development and Sandbox folders.

## Step 2: Set Up the Shared VPC Network

Networking is where many enterprise deployments either succeed or fail. The shared VPC pattern allows a central networking team to manage the network while individual project teams deploy their workloads.

```hcl
# Create the host project for the shared VPC
resource "google_project" "host_project" {
  name            = "network-host"
  project_id      = "network-host-${var.org_suffix}"
  folder_id       = google_folder.shared_services.name
  billing_account = var.billing_account_id
}

# Enable the shared VPC host project
resource "google_compute_shared_vpc_host_project" "host" {
  project = google_project.host_project.project_id
}

# Create the shared VPC network
resource "google_compute_network" "shared_vpc" {
  name                    = "shared-vpc"
  project                 = google_project.host_project.project_id
  auto_create_subnetworks = false
  routing_mode            = "GLOBAL"
}

# Create subnets for different environments and regions
resource "google_compute_subnetwork" "prod_us_central1" {
  name          = "prod-us-central1"
  project       = google_project.host_project.project_id
  network       = google_compute_network.shared_vpc.id
  region        = "us-central1"
  ip_cidr_range = "10.0.0.0/20"

  # Enable private Google access for services
  private_ip_google_access = true

  # Define secondary ranges for GKE
  secondary_ip_range {
    range_name    = "gke-pods"
    ip_cidr_range = "10.4.0.0/14"
  }

  secondary_ip_range {
    range_name    = "gke-services"
    ip_cidr_range = "10.8.0.0/20"
  }
}
```

## Step 3: Implement Organization Policies

Organization policies are guardrails that prevent teams from doing things that violate your security or compliance requirements. These are applied at the Organization or Folder level and inherited by all child resources.

```hcl
# Restrict which regions resources can be deployed to
resource "google_org_policy_policy" "restrict_regions" {
  name   = "organizations/${var.org_id}/policies/gcp.resourceLocations"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      values {
        allowed_values = [
          "in:us-locations",
          "in:europe-locations"
        ]
      }
    }
  }
}

# Disable external IP addresses on VMs
resource "google_org_policy_policy" "disable_external_ip" {
  name   = "folders/${google_folder.production.folder_id}/policies/compute.vmExternalIpAccess"
  parent = "folders/${google_folder.production.folder_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}

# Require uniform bucket-level access on Cloud Storage
resource "google_org_policy_policy" "uniform_bucket_access" {
  name   = "organizations/${var.org_id}/policies/storage.uniformBucketLevelAccess"
  parent = "organizations/${var.org_id}"

  spec {
    rules {
      enforce = "TRUE"
    }
  }
}
```

These policies are critical. Without them, a single developer with the right permissions could accidentally expose a Cloud Storage bucket to the internet or deploy a VM with a public IP in your production environment.

## Step 4: Configure Centralized Logging

Every enterprise needs centralized logging for security, compliance, and troubleshooting. GCP makes this straightforward with log sinks that aggregate logs from all projects into a central location.

```hcl
# Create a logging project
resource "google_project" "logging_project" {
  name            = "centralized-logging"
  project_id      = "centralized-logging-${var.org_suffix}"
  folder_id       = google_folder.shared_services.name
  billing_account = var.billing_account_id
}

# Create a BigQuery dataset for long-term log storage
resource "google_bigquery_dataset" "audit_logs" {
  dataset_id = "audit_logs"
  project    = google_project.logging_project.project_id
  location   = "US"

  # Retain logs for 365 days
  default_table_expiration_ms = 31536000000
}

# Create an organization-level log sink
resource "google_logging_organization_sink" "audit_sink" {
  name             = "org-audit-logs"
  org_id           = var.org_id
  destination      = "bigquery.googleapis.com/projects/${google_project.logging_project.project_id}/datasets/${google_bigquery_dataset.audit_logs.dataset_id}"
  include_children = true

  # Capture admin activity and data access logs
  filter = "logName:\"cloudaudit.googleapis.com\""
}
```

## Step 5: Set Up a CICD Pipeline for Infrastructure

Your landing zone itself should be managed as code and deployed through a pipeline. This ensures changes are reviewed, tested, and applied consistently.

The typical approach is to use a Cloud Build pipeline that applies Terraform changes when code is merged to the main branch.

```yaml
# cloudbuild.yaml - Pipeline for applying landing zone changes
steps:
  # Run terraform init
  - name: 'hashicorp/terraform:1.5'
    entrypoint: 'sh'
    args:
      - '-c'
      - 'terraform init -backend-config=backend.hcl'

  # Run terraform plan and save the output
  - name: 'hashicorp/terraform:1.5'
    entrypoint: 'sh'
    args:
      - '-c'
      - 'terraform plan -out=tfplan'

  # Apply the plan (only on main branch)
  - name: 'hashicorp/terraform:1.5'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        if [ "$BRANCH_NAME" = "main" ]; then
          terraform apply -auto-approve tfplan
        else
          echo "Skipping apply on non-main branch"
        fi
```

## Step 6: Implement a Project Factory

Once your landing zone foundation is in place, you need a way for teams to request and receive new projects. A project factory is a Terraform module that creates projects with all the right configurations baked in.

```hcl
# modules/project-factory/main.tf
# Reusable module for creating standardized projects
resource "google_project" "project" {
  name            = var.project_name
  project_id      = "${var.project_name}-${random_id.suffix.hex}"
  folder_id       = var.folder_id
  billing_account = var.billing_account_id

  labels = {
    environment  = var.environment
    team         = var.team
    cost_center  = var.cost_center
  }
}

# Enable required APIs
resource "google_project_service" "apis" {
  for_each = toset(var.enabled_apis)

  project = google_project.project.project_id
  service = each.value

  disable_dependent_services = true
}

# Attach the project to the shared VPC
resource "google_compute_shared_vpc_service_project" "service" {
  host_project    = var.host_project_id
  service_project = google_project.project.project_id
}
```

## Common Pitfalls to Avoid

Over the years, I have seen several common mistakes when implementing landing zones:

1. Making the hierarchy too deep - three levels of folders is usually the maximum before things get confusing.
2. Not planning IP address space upfront - running out of IP addresses in your shared VPC is painful to fix later.
3. Applying policies too broadly too early - start with a few critical policies and add more as you understand your needs.
4. Skipping the project factory - manual project creation leads to drift and inconsistency.
5. Not testing disaster recovery - your landing zone should be reproducible from scratch.

## Wrapping Up

A well-designed landing zone is the foundation of a successful enterprise cloud adoption. By investing the time upfront in resource hierarchy, networking, security policies, and automation, you set your organization up for long-term success on GCP. Start with the basics, iterate based on feedback from your development teams, and always keep your landing zone code in version control.

The key takeaway is that a landing zone is never "done." It evolves as your organization grows and as GCP introduces new features and services. Treat it as a living system that requires ongoing care and feeding.
