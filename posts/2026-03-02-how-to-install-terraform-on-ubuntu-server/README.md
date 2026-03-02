# How to Install Terraform on Ubuntu Server

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Terraform, Infrastructure as Code, DevOps

Description: A complete guide to installing Terraform on Ubuntu Server using multiple methods including HashiCorp's APT repository, tfenv, and manual binary installation.

---

Terraform is the dominant infrastructure-as-code tool for provisioning cloud resources. Getting it installed correctly on Ubuntu Server is the first step, and there are a few approaches depending on whether you need a specific version, want easy version switching, or prefer a simple one-time setup.

## Method 1: HashiCorp's Official APT Repository

This is the recommended approach for servers where Terraform will be used consistently at a recent version:

```bash
# Install prerequisites
sudo apt update
sudo apt install -y gnupg software-properties-common curl

# Download HashiCorp's GPG key and add to keyring
wget -O- https://apt.releases.hashicorp.com/gpg | \
    gpg --dearmor | \
    sudo tee /usr/share/keyrings/hashicorp-archive-keyring.gpg > /dev/null

# Verify the key fingerprint
gpg --no-default-keyring \
    --keyring /usr/share/keyrings/hashicorp-archive-keyring.gpg \
    --fingerprint

# Add the HashiCorp repository
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] \
    https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
    sudo tee /etc/apt/sources.list.d/hashicorp.list

# Update and install Terraform
sudo apt update
sudo apt install -y terraform

# Verify installation
terraform version
```

This method installs the latest stable Terraform and allows easy upgrades with `apt upgrade`. It also installs other HashiCorp tools like Vault, Consul, and Packer from the same repository.

## Method 2: Direct Binary Download

For air-gapped environments or when you need a specific version without the APT overhead:

```bash
# Set the version you need
TERRAFORM_VERSION="1.7.4"

# Download the binary and checksum file
wget "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
wget "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_SHA256SUMS"
wget "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_SHA256SUMS.sig"

# Verify the checksum
sha256sum --check --ignore-missing \
    "terraform_${TERRAFORM_VERSION}_SHA256SUMS"

# Unzip and install
unzip "terraform_${TERRAFORM_VERSION}_linux_amd64.zip"
sudo install -m 755 terraform /usr/local/bin/terraform

# Clean up
rm terraform_${TERRAFORM_VERSION}_linux_amd64.zip \
   terraform_${TERRAFORM_VERSION}_SHA256SUMS \
   terraform_${TERRAFORM_VERSION}_SHA256SUMS.sig

# Verify
terraform version
```

## Method 3: tfenv for Version Management

`tfenv` is the Terraform equivalent of nvm or pyenv - it lets you install and switch between multiple Terraform versions per project:

```bash
# Install tfenv
git clone --depth=1 https://github.com/tfutils/tfenv.git ~/.tfenv

# Add tfenv to PATH
echo 'export PATH="$HOME/.tfenv/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify tfenv installed
tfenv --version

# List available Terraform versions
tfenv list-remote

# Install a specific version
tfenv install 1.7.4

# Install the latest version
tfenv install latest

# Set the default version
tfenv use 1.7.4

# Verify
terraform version
```

### Per-Project Version Pinning with tfenv

Create a `.terraform-version` file in your project directory:

```bash
# In your Terraform project
echo "1.7.4" > .terraform-version

# tfenv automatically uses this version when you're in this directory
terraform version
# Terraform v1.7.4
```

This is especially useful in CI/CD pipelines and team environments where everyone needs to use the same Terraform version.

## Post-Installation Setup

### Shell Autocompletion

```bash
# Enable bash completion
terraform -install-autocomplete

# Source the completion script
source ~/.bashrc

# Or manually add to .bashrc
complete -C /usr/bin/terraform terraform
```

### Verifying the Installation

```bash
# Check version
terraform version

# Check that the binary is in PATH
which terraform

# Run help
terraform --help
```

## Setting Up Terraform for a Provider

Terraform downloads provider plugins when you initialize a working directory. Configure provider credentials before running `terraform init`:

### AWS Provider Setup

```bash
# Install AWS CLI
sudo apt install -y awscli

# Configure credentials
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

### Azure Provider Setup

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login to Azure
az login

# Set subscription
az account set --subscription "your-subscription-id"

# Or use service principal credentials
export ARM_CLIENT_ID="your-client-id"
export ARM_CLIENT_SECRET="your-client-secret"
export ARM_SUBSCRIPTION_ID="your-subscription-id"
export ARM_TENANT_ID="your-tenant-id"
```

### GCP Provider Setup

```bash
# Install gcloud CLI
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] \
    https://packages.cloud.google.com/apt cloud-sdk main" | \
    sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | \
    sudo apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
sudo apt update && sudo apt install -y google-cloud-cli

# Authenticate
gcloud auth application-default login
```

## Writing and Running Your First Terraform Configuration

```bash
# Create a working directory
mkdir terraform-test && cd terraform-test

# Create a simple configuration
cat > main.tf << 'EOF'
terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "~> 2.4"
    }
  }
  required_version = ">= 1.5"
}

resource "local_file" "hello" {
  filename = "hello.txt"
  content  = "Hello from Terraform!\n"
}

output "file_path" {
  value = local_file.hello.filename
}
EOF

# Initialize - downloads the local provider
terraform init

# Plan - shows what will be created
terraform plan

# Apply - create the resources
terraform apply

# Verify
cat hello.txt

# Destroy - remove the resources
terraform destroy
```

## Configuring Terraform Backend for Remote State

For production use, store Terraform state remotely:

```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}
```

For Azure:

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "tfstate12345"
    container_name       = "tfstate"
    key                  = "production.tfstate"
  }
}
```

## Setting Up Terraform in CI/CD

For automated pipelines, install Terraform non-interactively:

```bash
#!/bin/bash
# install-terraform.sh - for CI/CD environments

set -euo pipefail

TERRAFORM_VERSION="${TERRAFORM_VERSION:-1.7.4}"

# Download and install
wget -q "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_amd64.zip" -O /tmp/terraform.zip
unzip -q /tmp/terraform.zip -d /tmp/
sudo install -m 755 /tmp/terraform /usr/local/bin/terraform
rm /tmp/terraform.zip /tmp/terraform

echo "Terraform $(terraform version -json | jq -r .terraform_version) installed"
```

## Keeping Terraform Updated

```bash
# If installed via APT
sudo apt update && sudo apt upgrade terraform

# If installed via tfenv
tfenv install latest
tfenv use latest

# If installed manually, re-run the binary download steps with the new version
```

Terraform moves quickly with frequent releases. Check [releases.hashicorp.com/terraform](https://releases.hashicorp.com/terraform) for the latest version, and use `tfenv` or the APT repository to keep your installation current without manual binary management.
