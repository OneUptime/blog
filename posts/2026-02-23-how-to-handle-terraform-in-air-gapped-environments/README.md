# How to Handle Terraform in Air-Gapped Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Security, Air-Gapped, Offline, Enterprise

Description: A practical guide to running Terraform in air-gapped and network-restricted environments, covering provider mirroring, registry setup, and offline workflows.

---

Air-gapped environments are networks completely disconnected from the internet. You find them in government agencies, defense contractors, financial institutions, and healthcare organizations where regulatory requirements or security policies mandate total network isolation. Running Terraform in these environments is challenging because Terraform normally downloads providers and modules from the internet at initialization time.

This guide walks through the practical steps to get Terraform working reliably in an air-gapped environment.

## The Challenges

Terraform depends on internet connectivity for several things:

- **Provider downloads**: Terraform downloads provider plugins (AWS, Azure, GCP) from `registry.terraform.io`
- **Module downloads**: Public modules come from the Terraform Registry or Git repositories
- **State backends**: Some backends require internet access
- **Terraform itself**: The binary needs to be installed somehow

In an air-gapped environment, you need to pre-stage all of these dependencies before any Terraform work can happen.

## Install Terraform Offline

Start by getting the Terraform binary into your air-gapped environment:

```bash
# On a connected machine, download the binary
TERRAFORM_VERSION="1.7.3"
wget "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
wget "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_SHA256SUMS"
wget "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_SHA256SUMS.sig"

# Verify the checksum
sha256sum -c terraform_${TERRAFORM_VERSION}_SHA256SUMS --ignore-missing

# Transfer the zip file to the air-gapped environment via approved media
# Then install
unzip terraform_${TERRAFORM_VERSION}_linux_amd64.zip
sudo mv terraform /usr/local/bin/
terraform version
```

## Provider Mirroring

Terraform has a built-in mechanism for working with local provider copies. There are two approaches: filesystem mirrors and network mirrors.

### Filesystem Mirror

The simplest approach is to create a local filesystem mirror of the providers you need:

```bash
# On a connected machine, create the provider mirror
mkdir -p /tmp/terraform-providers

# Use terraform providers mirror to download providers
cd /path/to/your/terraform/project
terraform providers mirror /tmp/terraform-providers

# This creates a directory structure like:
# /tmp/terraform-providers/
#   registry.terraform.io/
#     hashicorp/
#       aws/
#         5.35.0.json
#         terraform-provider-aws_5.35.0_linux_amd64.zip
#       random/
#         3.6.0.json
#         terraform-provider-random_3.6.0_linux_amd64.zip
```

Transfer the entire `terraform-providers` directory to the air-gapped environment, then configure Terraform to use it:

```hcl
# Create a .terraformrc file (or terraform.rc on Windows)
# Place this at ~/.terraformrc on the air-gapped machine

provider_installation {
  filesystem_mirror {
    path    = "/opt/terraform/providers"
    include = ["registry.terraform.io/*/*"]
  }

  # Do not try to reach the internet
  direct {
    exclude = ["*/*/*"]
  }
}
```

Alternatively, configure it in the project's CLI configuration:

```bash
# Set the CLI config file location
export TF_CLI_CONFIG_FILE="/opt/terraform/terraform.rc"
```

### Network Mirror (Internal Registry)

For larger organizations, set up an internal network mirror that hosts providers:

```bash
# Set up a simple HTTPS server to host providers
# The directory structure must match the Terraform provider protocol

# nginx configuration for provider mirror
server {
    listen 443 ssl;
    server_name terraform-registry.internal.example.com;

    ssl_certificate     /etc/ssl/certs/registry.crt;
    ssl_certificate_key /etc/ssl/private/registry.key;

    root /var/lib/terraform-registry;

    location / {
        autoindex on;
    }
}
```

Configure Terraform to use the internal mirror:

```hcl
# ~/.terraformrc
provider_installation {
  network_mirror {
    url = "https://terraform-registry.internal.example.com/"
  }

  direct {
    exclude = ["*/*/*"]
  }
}
```

## Private Module Registry

For modules, you have several options:

### Git-Based Modules (Internal Git Server)

If your air-gapped environment has an internal Git server (GitLab, Gitea, etc.), host your modules there:

```hcl
# Reference modules from internal Git
module "vpc" {
  source = "git::https://gitlab.internal.example.com/terraform-modules/vpc.git?ref=v1.2.0"

  cidr_block = "10.0.0.0/16"
}

module "security_group" {
  source = "git::https://gitlab.internal.example.com/terraform-modules/security-group.git?ref=v2.0.1"

  vpc_id = module.vpc.vpc_id
}
```

### Local Path Modules

For smaller setups, keep modules as local directories:

```hcl
# Reference local modules
module "vpc" {
  source = "../../modules/vpc"

  cidr_block = "10.0.0.0/16"
}
```

### Terraform Enterprise Private Registry

If you are running Terraform Enterprise in the air-gapped environment, it includes a private module registry:

```hcl
module "vpc" {
  source  = "app.terraform.internal.example.com/my-org/vpc/aws"
  version = "1.2.0"

  cidr_block = "10.0.0.0/16"
}
```

## Air-Gapped Terraform Enterprise

Terraform Enterprise (the self-hosted version of Terraform Cloud) has an official air-gapped installation mode:

```bash
# Download the airgap bundle on a connected machine
# (Requires a Terraform Enterprise license)
curl -o terraform-enterprise-airgap.airgap \
  "https://install.terraform.io/airgap/latest.airgap?license=YOUR_LICENSE"

# Transfer to the air-gapped environment

# Install using the Replicated installer
sudo bash install.sh airgap
```

Configure the air-gapped TFE instance:

```hcl
# Terraform Enterprise settings for air-gapped mode
resource "null_resource" "tfe_config" {
  # This is typically done through the TFE admin console
  # Key settings:
  # - Provider bundles uploaded manually
  # - Module registry populated from internal sources
  # - State stored on local disk or internal S3-compatible storage
}
```

## Bundled Provider Approach

For the most portable solution, bundle providers directly with your Terraform configuration:

```bash
# Create a plugin directory structure
mkdir -p terraform-project/terraform.d/plugins/linux_amd64/

# Download providers on a connected machine
cd terraform-project
terraform providers mirror terraform.d/plugins/

# Package everything together
tar -czf terraform-deployment.tar.gz terraform-project/

# Transfer and extract on the air-gapped machine
tar -xzf terraform-deployment.tar.gz
cd terraform-project
terraform init
```

## State Backend in Air-Gapped Environments

Without internet access, you cannot use Terraform Cloud as a backend. Use local alternatives:

### S3-Compatible Backend (MinIO)

```hcl
# Use MinIO or another S3-compatible storage running internally
terraform {
  backend "s3" {
    bucket                      = "terraform-state"
    key                         = "production/terraform.tfstate"
    region                      = "us-east-1"
    endpoint                    = "https://minio.internal.example.com"
    force_path_style            = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    encrypt                     = true
  }
}
```

### PostgreSQL Backend

```hcl
terraform {
  backend "pg" {
    conn_str = "postgres://terraform:password@postgres.internal.example.com/terraform_state?sslmode=require"
  }
}
```

### Consul Backend

```hcl
terraform {
  backend "consul" {
    address = "consul.internal.example.com:8500"
    scheme  = "https"
    path    = "terraform/production"
  }
}
```

## Automating Provider Updates

Create a process for regularly updating providers in the air-gapped environment:

```bash
#!/bin/bash
# update-providers.sh - Run on a connected machine

MIRROR_DIR="/tmp/terraform-provider-update"
PROJECTS_DIR="/path/to/terraform/projects"

mkdir -p "$MIRROR_DIR"

# Mirror providers for all projects
for project in "$PROJECTS_DIR"/*/; do
  if [ -f "$project/versions.tf" ]; then
    echo "Mirroring providers for $(basename $project)"
    cd "$project"
    terraform providers mirror "$MIRROR_DIR"
    cd -
  fi
done

# Create a dated archive
DATE=$(date +%Y%m%d)
tar -czf "provider-update-${DATE}.tar.gz" -C "$MIRROR_DIR" .

echo "Transfer provider-update-${DATE}.tar.gz to the air-gapped environment"
echo "Extract to /opt/terraform/providers/"
```

## Version Pinning

In air-gapped environments, version pinning is essential because you can only use what is available locally:

```hcl
terraform {
  required_version = "= 1.7.3"  # Exact version match

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "= 5.35.0"  # Exact version - must match what is mirrored
    }
    random = {
      source  = "hashicorp/random"
      version = "= 3.6.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "= 4.0.5"
    }
  }
}
```

Use exact version pinning (`=`) rather than flexible constraints (`~>`, `>=`) to avoid situations where Terraform tries to download a version that is not in your mirror.

## CI/CD in Air-Gapped Environments

Your CI/CD pipeline needs to work without internet access too:

```yaml
# GitLab CI in an air-gapped environment
variables:
  TF_CLI_CONFIG_FILE: "/opt/terraform/terraform.rc"

stages:
  - validate
  - plan
  - apply

terraform-validate:
  stage: validate
  image: internal-registry.example.com/terraform:1.7.3
  script:
    - terraform init
    - terraform validate
    - terraform fmt -check

terraform-plan:
  stage: plan
  image: internal-registry.example.com/terraform:1.7.3
  script:
    - terraform init
    - terraform plan -out=tfplan
  artifacts:
    paths:
      - tfplan

terraform-apply:
  stage: apply
  image: internal-registry.example.com/terraform:1.7.3
  script:
    - terraform init
    - terraform apply tfplan
  when: manual
  only:
    - main
```

## Testing Your Air-Gap Setup

Before relying on your setup in production, verify that it works without internet connectivity:

```bash
# Temporarily block internet access to test
# On Linux, you can use iptables
sudo iptables -A OUTPUT -p tcp --dport 443 -j DROP
sudo iptables -A OUTPUT -p tcp --dport 80 -j DROP

# Try initializing and planning
terraform init
terraform plan

# If everything works, your air-gap setup is correct
# Remove the iptables rules
sudo iptables -D OUTPUT -p tcp --dport 443 -j DROP
sudo iptables -D OUTPUT -p tcp --dport 80 -j DROP
```

## Wrapping Up

Running Terraform in an air-gapped environment requires upfront planning but is entirely feasible. The key steps are: pre-stage the Terraform binary, mirror all required providers, host modules internally, use a local state backend, and pin all versions exactly. Once the initial setup is in place, the day-to-day workflow is nearly identical to working with Terraform in a connected environment. The main ongoing effort is keeping your provider mirror updated through your organization's approved data transfer process.

For monitoring infrastructure in restricted environments, [OneUptime](https://oneuptime.com) can be self-hosted and provides comprehensive monitoring, alerting, and incident management without requiring external connectivity.
