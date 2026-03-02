# How to Find Ubuntu Cloud Images for AWS, Azure, and GCP

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Cloud, AWS, Azure, GCP

Description: Find the correct Ubuntu cloud image IDs and URLs for AWS, Azure, and GCP, including official lookup tools, minimal vs standard images, and keeping image references current.

---

Launching an Ubuntu instance on a cloud provider requires knowing the correct image identifier - an AMI ID on AWS, an image name on Azure, or an image family on GCP. These identifiers change frequently as new Ubuntu releases and patches come out. Using stale image IDs can mean deploying outdated systems. This post covers the authoritative ways to find current Ubuntu images on each major cloud.

## Ubuntu Official Cloud Images

Canonical publishes official Ubuntu cloud images at https://cloud-images.ubuntu.com/. These are the source for all cloud provider images and are updated daily with the latest security patches.

Image variants available:
- **Standard**: Full Ubuntu server image (~1.5-2GB compressed)
- **Minimal**: Stripped-down image for faster boot and smaller footprint
- **Pro**: Ubuntu Pro with ESM and compliance tools

## Finding Ubuntu Images on AWS

### Using the AWS CLI

The most reliable method is querying AWS directly:

```bash
# Install AWS CLI if not already installed
sudo apt install awscli -y

# Configure AWS credentials
aws configure

# Find latest Ubuntu 24.04 (Noble) LTS AMI in us-east-1
aws ec2 describe-images \
    --owners 099720109477 \
    --filters \
        "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*" \
        "Name=state,Values=available" \
        "Name=architecture,Values=x86_64" \
    --query 'sort_by(Images, &CreationDate)[-1].[ImageId,Name,CreationDate]' \
    --output table \
    --region us-east-1
```

Canonical's AWS account ID is `099720109477`. Always filter by this owner to ensure you're getting official images.

```bash
# Find Ubuntu 22.04 (Jammy) LTS AMI
aws ec2 describe-images \
    --owners 099720109477 \
    --filters \
        "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*" \
        "Name=state,Values=available" \
    --query 'sort_by(Images, &CreationDate)[-1].[ImageId,Name,CreationDate]' \
    --output table \
    --region us-east-1

# Find Ubuntu 24.04 ARM (Graviton) AMI
aws ec2 describe-images \
    --owners 099720109477 \
    --filters \
        "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-arm64-server-*" \
        "Name=state,Values=available" \
    --query 'sort_by(Images, &CreationDate)[-1].[ImageId,Name,CreationDate]' \
    --output table \
    --region us-east-1

# Find minimal Ubuntu 24.04 images
aws ec2 describe-images \
    --owners 099720109477 \
    --filters \
        "Name=name,Values=ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-minimal-*" \
        "Name=state,Values=available" \
    --query 'sort_by(Images, &CreationDate)[-1].[ImageId,Name,CreationDate]' \
    --output table \
    --region us-east-1
```

### Using the Ubuntu AMI Locator

Canonical maintains an official AMI locator at https://cloud-images.ubuntu.com/locator/ec2/

You can also query it programmatically:

```bash
# Get the latest Noble AMI for us-east-1
curl -s "https://cloud-images.ubuntu.com/locator/ec2/releasesTable" | \
    python3 -c "
import json, sys
data = json.load(sys.stdin)['aaData']
for row in data:
    if 'noble' in row[0].lower() and 'us-east-1' in row[1] and 'amd64' in row[2] and 'hvm' in row[4]:
        print(row)
"
```

### AWS SSM Parameter Store (Recommended for Automation)

AWS maintains public SSM parameters with current Ubuntu AMI IDs:

```bash
# Get latest Ubuntu 24.04 LTS AMI via SSM (no auth required for public params)
aws ssm get-parameter \
    --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp2/ami-id \
    --query "Parameter.Value" \
    --output text \
    --region us-east-1

# Ubuntu 22.04
aws ssm get-parameter \
    --name /aws/service/canonical/ubuntu/server/22.04/stable/current/amd64/hvm/ebs-gp2/ami-id \
    --query "Parameter.Value" \
    --output text \
    --region us-east-1

# Minimal Ubuntu 24.04
aws ssm get-parameter \
    --name /aws/service/canonical/ubuntu/server-minimal/24.04/stable/current/amd64/hvm/ebs-gp2/ami-id \
    --query "Parameter.Value" \
    --output text \
    --region us-east-1
```

Use this in Terraform:

```hcl
# Terraform - always use the latest Ubuntu AMI
data "aws_ssm_parameter" "ubuntu_noble" {
  name = "/aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp2/ami-id"
}

resource "aws_instance" "web" {
  ami           = data.aws_ssm_parameter.ubuntu_noble.value
  instance_type = "t3.micro"
}
```

## Finding Ubuntu Images on Azure

### Using Azure CLI

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# List all Ubuntu offers from Canonical
az vm image list-offers \
    --publisher Canonical \
    --location eastus \
    --output table

# List Ubuntu 24.04 SKUs (versions)
az vm image list-skus \
    --publisher Canonical \
    --offer ubuntu-24_04-lts \
    --location eastus \
    --output table

# Find the latest Ubuntu 24.04 image version
az vm image list \
    --publisher Canonical \
    --offer ubuntu-24_04-lts \
    --sku server \
    --location eastus \
    --all \
    --query "[-1]" \
    --output table

# Find Ubuntu 22.04 images
az vm image list \
    --publisher Canonical \
    --offer 0001-com-ubuntu-server-jammy \
    --sku 22_04-lts \
    --location eastus \
    --all \
    --query "[-1]" \
    --output table
```

Azure image reference format for Ubuntu:
- Publisher: `Canonical`
- Offer: `ubuntu-24_04-lts` (Noble) or `0001-com-ubuntu-server-jammy` (Jammy)
- SKU: `server` or `server-gen2` for Gen2 VMs
- Version: `latest` (recommended for automation)

```bash
# Use 'latest' version for always-current images
az vm create \
    --resource-group myRG \
    --name myVM \
    --image Canonical:ubuntu-24_04-lts:server:latest \
    --size Standard_B2s \
    --admin-username azureuser \
    --generate-ssh-keys
```

In Terraform:

```hcl
resource "azurerm_linux_virtual_machine" "web" {
  # ... other config ...

  source_image_reference {
    publisher = "Canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }
}
```

## Finding Ubuntu Images on GCP

### Using gcloud CLI

```bash
# Install Google Cloud SDK
sudo apt install google-cloud-sdk -y

# Authenticate
gcloud auth login

# List Ubuntu images in the ubuntu-os-cloud project
gcloud compute images list \
    --project ubuntu-os-cloud \
    --filter="family~'ubuntu'" \
    --format="table(name,family,creationTimestamp)"

# Find the latest Ubuntu 24.04 LTS image
gcloud compute images describe-from-family ubuntu-2404-lts \
    --project ubuntu-os-cloud \
    --format="table(name,selfLink,status)"

# Latest Ubuntu 22.04 LTS
gcloud compute images describe-from-family ubuntu-2204-lts \
    --project ubuntu-os-cloud \
    --format="table(name,selfLink,status)"

# ARM/Ampere images
gcloud compute images describe-from-family ubuntu-2404-lts-arm64 \
    --project ubuntu-os-cloud \
    --format="table(name,selfLink,status)"

# Minimal images
gcloud compute images describe-from-family ubuntu-minimal-2404-lts \
    --project ubuntu-os-cloud \
    --format="table(name,selfLink,status)"
```

GCP image families automatically point to the latest image in that family, so using `--image-family` in instance creation is best practice:

```bash
# Create instance using image family (always uses latest)
gcloud compute instances create myinstance \
    --image-family ubuntu-2404-lts \
    --image-project ubuntu-os-cloud \
    --machine-type n2-standard-2 \
    --zone us-central1-a
```

In Terraform:

```hcl
data "google_compute_image" "ubuntu_noble" {
  family  = "ubuntu-2404-lts"
  project = "ubuntu-os-cloud"
}

resource "google_compute_instance" "web" {
  # ... other config ...

  boot_disk {
    initialize_params {
      image = data.google_compute_image.ubuntu_noble.self_link
    }
  }
}
```

## Keeping Image References Current

Hardcoding specific AMI IDs or image versions is a maintenance burden. Use these patterns to stay current:

- **AWS**: Use SSM parameter store parameters - they auto-update when new images are released
- **Azure**: Use `version = "latest"` in image references
- **GCP**: Use image families - they always resolve to the latest published image

For GitOps workflows, regularly update image references in your infrastructure code:

```bash
#!/bin/bash
# Script to update AWS AMI references in Terraform files

REGION="us-east-1"
NEW_AMI=$(aws ssm get-parameter \
    --name /aws/service/canonical/ubuntu/server/24.04/stable/current/amd64/hvm/ebs-gp2/ami-id \
    --query "Parameter.Value" \
    --output text \
    --region "$REGION")

echo "Current latest Ubuntu 24.04 AMI in $REGION: $NEW_AMI"

# Update all Terraform files with the new AMI
find . -name "*.tf" -exec sed -i "s/ami-[a-z0-9]*/\"$NEW_AMI\"/g" {} \;
```

Always prefer official Canonical images over community or third-party Ubuntu images - they're verified, regularly updated, and come with commercial support options.
