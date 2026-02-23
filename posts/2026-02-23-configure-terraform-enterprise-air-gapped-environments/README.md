# How to Configure Terraform Enterprise with Air-Gapped Environments

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Terraform Enterprise, Air-Gapped, Offline, Security, Compliance

Description: Complete guide to deploying and running Terraform Enterprise in air-gapped environments without internet access, including image mirroring, provider caching, and offline workflows.

---

Air-gapped environments - networks with no internet access - are common in government, defense, financial services, and healthcare organizations. Running Terraform Enterprise in these environments requires extra planning because TFE normally pulls container images, Terraform binaries, and provider plugins from the internet. In an air-gapped setup, every dependency must be pre-staged internally.

This guide covers the end-to-end process of getting TFE running without internet access.

## What "Air-Gapped" Means for TFE

In a standard TFE deployment, the application reaches out to the internet for several things:

- Pulling the TFE container image from HashiCorp's registry
- Downloading Terraform CLI binaries
- Downloading provider plugins (aws, azurerm, google, etc.)
- Connecting to VCS providers (GitHub, GitLab)
- Checking the HashiCorp license server

In an air-gapped deployment, all of these must be handled differently.

## Prerequisites

You need a "transfer workstation" - a machine with internet access that you use to download everything, then transfer it to the air-gapped network via approved media (USB drive, data diode, etc.).

- Transfer workstation with Docker installed and internet access
- Approved data transfer mechanism to the air-gapped network
- Internal container registry in the air-gapped network
- Internal file server or artifact repository (Artifactory, Nexus, etc.)

## Step 1: Mirror the TFE Container Image

```bash
# On the internet-connected workstation:

# Log in to the HashiCorp registry
echo "${HASHICORP_TOKEN}" | docker login images.releases.hashicorp.com -u terraform --password-stdin

# Pull the TFE image
docker pull images.releases.hashicorp.com/hashicorp/terraform-enterprise:v202402-1

# Save the image to a tar file for transfer
docker save images.releases.hashicorp.com/hashicorp/terraform-enterprise:v202402-1 \
  -o tfe-v202402-1.tar

# Compress it for easier transfer
gzip tfe-v202402-1.tar

echo "Image saved: tfe-v202402-1.tar.gz ($(du -h tfe-v202402-1.tar.gz | cut -f1))"
```

Transfer the file to the air-gapped network, then load it:

```bash
# On the air-gapped network:

# Load the image into Docker
gunzip tfe-v202402-1.tar.gz
docker load -i tfe-v202402-1.tar

# Tag and push to your internal registry
docker tag images.releases.hashicorp.com/hashicorp/terraform-enterprise:v202402-1 \
  registry.internal.example.com/hashicorp/terraform-enterprise:v202402-1

docker push registry.internal.example.com/hashicorp/terraform-enterprise:v202402-1
```

## Step 2: Mirror Terraform CLI Binaries

TFE needs Terraform CLI binaries to execute plans and applies. Normally it downloads them on demand, but in an air-gapped environment you must pre-stage them.

```bash
# On the internet-connected workstation:
# Download the Terraform versions your workspaces use

VERSIONS="1.5.7 1.6.6 1.7.5 1.8.5 1.9.8"
DOWNLOAD_DIR="./terraform-binaries"

mkdir -p "${DOWNLOAD_DIR}"

for VERSION in ${VERSIONS}; do
  echo "Downloading Terraform ${VERSION}..."
  curl -Lo "${DOWNLOAD_DIR}/terraform_${VERSION}_linux_amd64.zip" \
    "https://releases.hashicorp.com/terraform/${VERSION}/terraform_${VERSION}_linux_amd64.zip"

  # Also download the SHA256 checksum
  curl -Lo "${DOWNLOAD_DIR}/terraform_${VERSION}_SHA256SUMS" \
    "https://releases.hashicorp.com/terraform/${VERSION}/terraform_${VERSION}_SHA256SUMS"
done

echo "Downloaded $(ls ${DOWNLOAD_DIR}/*.zip | wc -l) Terraform versions"
```

After transferring to the air-gapped network:

```bash
# On the air-gapped network:
# Set up a local Terraform binary mirror

MIRROR_DIR="/opt/tfe/terraform-binaries"
mkdir -p "${MIRROR_DIR}"

for ZIP in /transfer/terraform-binaries/terraform_*.zip; do
  VERSION=$(echo "${ZIP}" | grep -oP '\d+\.\d+\.\d+')
  TARGET_DIR="${MIRROR_DIR}/${VERSION}"
  mkdir -p "${TARGET_DIR}"
  unzip -o "${ZIP}" -d "${TARGET_DIR}"
  chmod +x "${TARGET_DIR}/terraform"
done
```

## Step 3: Create a Provider Mirror

This is often the most labor-intensive part. You need to download every provider and version that your workspaces use.

```bash
#!/bin/bash
# download-providers.sh
# Run on the internet-connected workstation

PROVIDERS_DIR="./provider-mirror"
mkdir -p "${PROVIDERS_DIR}"

# List of providers and versions to mirror
# Format: namespace/name:version
PROVIDERS=(
  "hashicorp/aws:5.40.0"
  "hashicorp/azurerm:3.90.0"
  "hashicorp/google:5.15.0"
  "hashicorp/kubernetes:2.25.0"
  "hashicorp/helm:2.12.0"
  "hashicorp/vault:3.24.0"
  "hashicorp/random:3.6.0"
  "hashicorp/null:3.2.2"
  "hashicorp/local:2.4.1"
  "hashicorp/tls:4.0.5"
)

for PROVIDER_VERSION in "${PROVIDERS[@]}"; do
  PROVIDER="${PROVIDER_VERSION%%:*}"
  VERSION="${PROVIDER_VERSION##*:}"
  NAMESPACE="${PROVIDER%%/*}"
  NAME="${PROVIDER##*/}"

  echo "Downloading ${PROVIDER} v${VERSION}..."

  # Create directory structure matching Terraform's filesystem mirror layout
  DEST="${PROVIDERS_DIR}/registry.terraform.io/${NAMESPACE}/${NAME}/${VERSION}/linux_amd64"
  mkdir -p "${DEST}"

  # Download the provider binary
  curl -Lo "${DEST}/terraform-provider-${NAME}_${VERSION}_linux_amd64.zip" \
    "https://releases.hashicorp.com/terraform-provider-${NAME}/${VERSION}/terraform-provider-${NAME}_${VERSION}_linux_amd64.zip"
done

echo "Provider mirror ready at ${PROVIDERS_DIR}"
```

Alternatively, use Terraform's built-in mirroring:

```bash
# Create a minimal Terraform config that references all needed providers
cat > providers.tf << 'EOF'
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "5.40.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "3.90.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "5.15.0"
    }
  }
}
EOF

# Use terraform providers mirror to create the mirror directory
terraform providers mirror -platform=linux_amd64 ./provider-mirror
```

## Step 4: Configure TFE for Air-Gapped Operation

```bash
# TFE environment variables for air-gapped deployment

# Use the internal registry for the container image
# (set in docker-compose.yml or Helm values)

# Disable internet-dependent features
TFE_RUN_PIPELINE_DRIVER=docker
TFE_CAPACITY_CONCURRENCY=10

# Point to the local Terraform binary mirror
TFE_TERRAFORM_BINARY_PATH=/opt/tfe/terraform-binaries

# Configure the provider mirror as a filesystem mirror
# This is done via the Terraform CLI config, not TFE itself
# Create a .terraformrc that TFE will use for runs
```

### Docker Compose for Air-Gapped Deployment

```yaml
# docker-compose.yml - Air-gapped TFE deployment
version: "3.9"
services:
  tfe:
    # Use the internal registry image
    image: registry.internal.example.com/hashicorp/terraform-enterprise:v202402-1
    environment:
      TFE_HOSTNAME: tfe.internal.example.com
      TFE_LICENSE_PATH: /etc/tfe/license.rli
      TFE_OBJECT_STORAGE_TYPE: s3
      TFE_OBJECT_STORAGE_S3_BUCKET: tfe-objects
      TFE_OBJECT_STORAGE_S3_ENDPOINT: https://minio.internal.example.com
      TFE_OBJECT_STORAGE_S3_ACCESS_KEY_ID: "${MINIO_ACCESS_KEY}"
      TFE_OBJECT_STORAGE_S3_SECRET_ACCESS_KEY: "${MINIO_SECRET_KEY}"
      TFE_OBJECT_STORAGE_S3_REGION: us-east-1
      TFE_DATABASE_HOST: postgres.internal.example.com
      TFE_DATABASE_USER: tfe
      TFE_DATABASE_PASSWORD: "${DB_PASSWORD}"
      TFE_DATABASE_NAME: tfe
      TFE_REDIS_HOST: redis.internal.example.com
      TFE_REDIS_PORT: "6379"
      TFE_REDIS_PASSWORD: "${REDIS_PASSWORD}"
      TFE_TLS_CERT_FILE: /etc/tfe/tls/tfe.crt
      TFE_TLS_KEY_FILE: /etc/tfe/tls/tfe.key
      TFE_TLS_CA_BUNDLE_FILE: /etc/tfe/tls/ca-bundle.crt
      # Air-gap specific settings
      TFE_IACT_SUBNETS: "10.0.0.0/8"
    volumes:
      - ./license.rli:/etc/tfe/license.rli:ro
      - ./certs:/etc/tfe/tls:ro
      - ./terraform-binaries:/opt/tfe/terraform-binaries:ro
      - ./provider-mirror:/opt/tfe/provider-mirror:ro
      - tfe-data:/var/lib/terraform-enterprise
    ports:
      - "443:443"
    extra_hosts:
      - "registry.internal.example.com:10.0.1.10"
volumes:
  tfe-data:
```

## Step 5: Configure Provider Mirrors in Workspaces

Each workspace needs to know where to find providers. You can set this through the Terraform CLI configuration:

```hcl
# terraform.rc - Provider mirror configuration
# Place this in the TFE configuration directory

provider_installation {
  filesystem_mirror {
    path    = "/opt/tfe/provider-mirror"
    include = ["registry.terraform.io/*/*"]
  }

  # Optionally, add a network mirror if you run one
  # network_mirror {
  #   url = "https://terraform-mirror.internal.example.com/providers/"
  # }
}
```

## Step 6: VCS Integration Without Internet

In air-gapped environments, you need an internal VCS server:

- **GitLab Self-Managed**: Most common choice for air-gapped environments
- **GitHub Enterprise Server**: If your organization uses GitHub
- **Bitbucket Data Center**: For Atlassian shops

```bash
# Configure TFE to use an internal GitLab instance
# Go to Admin > VCS Providers > Add VCS Provider

# GitLab configuration:
# HTTP URL:  https://gitlab.internal.example.com
# API URL:   https://gitlab.internal.example.com/api/v4
# OAuth Application ID: your-app-id
# OAuth Secret: your-oauth-secret
```

## Ongoing Maintenance

Air-gapped TFE requires a regular update cycle:

```bash
#!/bin/bash
# update-airgap-mirror.sh
# Run periodically on the transfer workstation

echo "=== TFE Air-Gap Update Package ==="
echo "Date: $(date)"

# 1. Check for new TFE releases
echo "Checking for new TFE releases..."

# 2. Download any new provider versions needed
echo "Downloading updated providers..."

# 3. Download any new Terraform CLI versions needed
echo "Downloading Terraform binaries..."

# 4. Package everything into a transfer bundle
BUNDLE="tfe-update-$(date +%Y%m%d).tar.gz"
tar czf "${BUNDLE}" \
  tfe-images/ \
  terraform-binaries/ \
  provider-mirror/

echo "Transfer bundle created: ${BUNDLE} ($(du -h ${BUNDLE} | cut -f1))"
echo "Transfer this to the air-gapped network and run the import script."
```

## Summary

Running Terraform Enterprise in an air-gapped environment is entirely doable but requires discipline around dependency management. Every container image, Terraform binary, and provider plugin must be explicitly downloaded, transferred, and staged in the isolated network. The initial setup is the hardest part - once you have the mirror infrastructure and transfer process in place, ongoing maintenance becomes routine. Plan for regular update cycles to keep your air-gapped TFE current with security patches and new features.
