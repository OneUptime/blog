# How to Replace AWS CloudFormation with Terraform for Google Cloud Infrastructure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Terraform, CloudFormation, Infrastructure as Code, Migration

Description: Transition from AWS CloudFormation to Terraform for managing Google Cloud infrastructure with practical mapping of resources, patterns, and state management.

---

If your team has been using CloudFormation for AWS infrastructure, moving to Google Cloud means you need a new IaC tool. While GCP has its own Deployment Manager, the industry has largely standardized on Terraform for multi-cloud and GCP-focused infrastructure. Terraform's HCL syntax is more readable than CloudFormation's JSON/YAML, and the planning phase gives you a preview of changes before they are applied.

In this post, I will walk through translating common CloudFormation patterns to Terraform for GCP, setting up the project structure, and handling the transition for teams familiar with CloudFormation.

## CloudFormation vs Terraform: Key Differences

Understanding the conceptual mapping helps CloudFormation users adapt quickly:

| CloudFormation | Terraform |
|---------------|-----------|
| Stack | Root Module or Workspace |
| Template | Configuration (.tf files) |
| Parameters | Variables |
| Outputs | Outputs |
| Mappings | Locals with lookup maps |
| Conditions | count or for_each with conditionals |
| Nested Stacks | Modules |
| Change Set | terraform plan |
| Stack Policy | lifecycle blocks |
| DependsOn | depends_on |
| Ref / Fn::GetAtt | Resource references |
| !Sub | String interpolation |
| cfn-init | Startup scripts or Ansible |

## Setting Up the Terraform Project

Here is a recommended project structure for GCP:

```
infrastructure/
  environments/
    dev/
      main.tf
      variables.tf
      terraform.tfvars
      backend.tf
    staging/
      main.tf
      variables.tf
      terraform.tfvars
      backend.tf
    production/
      main.tf
      variables.tf
      terraform.tfvars
      backend.tf
  modules/
    networking/
      main.tf
      variables.tf
      outputs.tf
    compute/
      main.tf
      variables.tf
      outputs.tf
    database/
      main.tf
      variables.tf
      outputs.tf
```

Set up the backend for state management:

```hcl
# backend.tf
# Remote state storage in GCS (equivalent to S3 backend for CF state)

terraform {
  backend "gcs" {
    bucket = "my-project-terraform-state"
    prefix = "production"
  }

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
```

Create the state bucket:

```bash
# Create the GCS bucket for Terraform state
gsutil mb -p my-gcp-project -l us-central1 gs://my-project-terraform-state

# Enable versioning for state file protection
gsutil versioning set on gs://my-project-terraform-state
```

## Translating Common Patterns

### VPC and Networking

CloudFormation VPC:

```yaml
# CloudFormation
Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: production-vpc

  PublicSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      AvailabilityZone: us-east-1a
```

Terraform equivalent for GCP:

```hcl
# Terraform - GCP VPC and Subnets
resource "google_compute_network" "vpc" {
  name                    = "production-vpc"
  auto_create_subnetworks = false
  project                 = var.project_id
}

resource "google_compute_subnetwork" "public" {
  name          = "public-subnet"
  ip_cidr_range = "10.0.1.0/24"
  region        = var.region
  network       = google_compute_network.vpc.id
  project       = var.project_id

  # GCP-specific: Secondary ranges for GKE pods and services
  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.1.0.0/16"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.2.0.0/20"
  }
}

# Firewall rules (equivalent to Security Groups)
resource "google_compute_firewall" "allow_http" {
  name    = "allow-http"
  network = google_compute_network.vpc.name
  project = var.project_id

  allow {
    protocol = "tcp"
    ports    = ["80", "443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["web-server"]
}
```

### Compute Instances

CloudFormation EC2 with User Data:

```yaml
# CloudFormation
Resources:
  WebServer:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: t3.medium
      ImageId: ami-0123456789
      UserData:
        Fn::Base64: |
          #!/bin/bash
          yum install -y httpd
          systemctl start httpd
```

Terraform GCE equivalent:

```hcl
# Terraform - GCP Compute Engine instance
resource "google_compute_instance" "web_server" {
  name         = "web-server"
  machine_type = "e2-medium"  # Equivalent to t3.medium
  zone         = "${var.region}-a"
  project      = var.project_id

  boot_disk {
    initialize_params {
      image = "debian-cloud/debian-12"
      size  = 20
      type  = "pd-ssd"
    }
  }

  network_interface {
    subnetwork = google_compute_subnetwork.public.id

    access_config {
      # Ephemeral public IP
    }
  }

  # Equivalent to UserData
  metadata_startup_script = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y apache2
    systemctl start apache2
  EOF

  tags = ["web-server"]

  # Equivalent to IAM Instance Profile
  service_account {
    email  = google_service_account.web_server.email
    scopes = ["cloud-platform"]
  }
}
```

### Parameters to Variables

CloudFormation Parameters:

```yaml
Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues:
      - dev
      - staging
      - production
  InstanceType:
    Type: String
    Default: t3.medium
```

Terraform Variables:

```hcl
# variables.tf
variable "environment" {
  type        = string
  default     = "dev"
  description = "Deployment environment"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

variable "machine_type" {
  type        = string
  default     = "e2-medium"
  description = "GCE machine type"
}
```

### Conditions

CloudFormation Conditions:

```yaml
Conditions:
  IsProduction: !Equals [!Ref Environment, production]

Resources:
  Database:
    Type: AWS::RDS::DBInstance
    Properties:
      MultiAZ: !If [IsProduction, true, false]
```

Terraform equivalent:

```hcl
# Terraform conditional logic
locals {
  is_production = var.environment == "production"
}

resource "google_sql_database_instance" "main" {
  name             = "main-db-${var.environment}"
  database_version = "POSTGRES_15"
  region           = var.region
  project          = var.project_id

  settings {
    tier = local.is_production ? "db-custom-4-16384" : "db-f1-micro"

    # HA only in production
    availability_type = local.is_production ? "REGIONAL" : "ZONAL"
  }
}
```

### Nested Stacks to Modules

CloudFormation Nested Stack:

```yaml
Resources:
  NetworkStack:
    Type: AWS::CloudFormation::Stack
    Properties:
      TemplateURL: https://s3.amazonaws.com/templates/networking.yaml
      Parameters:
        VpcCidr: 10.0.0.0/16
```

Terraform Module:

```hcl
# Calling a module (equivalent to nested stack)
module "networking" {
  source = "../modules/networking"

  vpc_cidr   = "10.0.0.0/16"
  project_id = var.project_id
  region     = var.region
}

# Reference module outputs
resource "google_compute_instance" "web" {
  # ...
  network_interface {
    subnetwork = module.networking.public_subnet_id
  }
}
```

## State Management

CloudFormation manages state automatically. With Terraform, you manage it explicitly:

```hcl
# Import existing GCP resources into Terraform state
# (equivalent to CloudFormation drift detection + import)

# Import an existing GCS bucket
terraform import google_storage_bucket.existing my-existing-bucket

# Import an existing compute instance
terraform import google_compute_instance.server \
  projects/my-project/zones/us-central1-a/instances/my-server
```

## Handling Secrets

CloudFormation uses SSM Parameter Store or Secrets Manager references. In Terraform with GCP:

```hcl
# Reference secrets from Secret Manager
data "google_secret_manager_secret_version" "db_password" {
  secret  = "db-password"
  project = var.project_id
}

resource "google_sql_user" "admin" {
  name     = "admin"
  instance = google_sql_database_instance.main.name
  password = data.google_secret_manager_secret_version.db_password.secret_data
}
```

## CI/CD Pipeline

Replace your CloudFormation deployment pipeline with a Terraform pipeline in Cloud Build:

```yaml
# cloudbuild.yaml
# Terraform CI/CD pipeline (equivalent to CF deployment pipeline)
steps:
  - name: 'hashicorp/terraform:1.7'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        cd environments/${_ENVIRONMENT}
        terraform init
        terraform validate

  - name: 'hashicorp/terraform:1.7'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        cd environments/${_ENVIRONMENT}
        terraform plan -out=tfplan

  # Manual approval step would go here for production

  - name: 'hashicorp/terraform:1.7'
    entrypoint: 'sh'
    args:
      - '-c'
      - |
        cd environments/${_ENVIRONMENT}
        terraform apply -auto-approve tfplan

substitutions:
  _ENVIRONMENT: 'dev'
```

## Wrapping Up

Moving from CloudFormation to Terraform is less of a paradigm shift than it might seem. The concepts map fairly cleanly, and HCL is arguably more readable than CloudFormation's YAML. The biggest adjustment for CloudFormation users is managing state explicitly and getting comfortable with the plan-apply workflow. Start by translating your simplest stacks first, build confidence with the workflow, and then tackle the more complex infrastructure. The investment pays off quickly, especially since Terraform works consistently across GCP, AWS, and any other provider you might use in the future.
