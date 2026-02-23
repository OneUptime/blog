# How to Install Terraform on Amazon Linux 2023

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, Amazon Linux, AWS, Installation, DevOps, Infrastructure as Code

Description: Learn how to install Terraform on Amazon Linux 2023 using the HashiCorp repository and manual methods with full instructions for EC2 instances.

---

Amazon Linux 2023 (AL2023) is AWS's latest Linux distribution, designed specifically for cloud workloads on EC2. If you are running infrastructure on AWS, chances are good that some of your instances are running AL2023. Installing Terraform on these instances is useful for running automation pipelines, managing infrastructure from bastion hosts, or setting up CI/CD runners that provision AWS resources.

This guide covers two methods: the official HashiCorp repository approach and the manual binary download.

## Prerequisites

You will need:

- An Amazon Linux 2023 instance (EC2 or local VM)
- SSH access to the instance
- sudo privileges
- Internet connectivity (or a local mirror if you are in a private subnet)

Verify your OS first:

```bash
# Check that you are running Amazon Linux 2023
cat /etc/os-release | grep PRETTY_NAME
```

You should see `Amazon Linux 2023` in the output.

## Method 1 - Install from HashiCorp Repository (Recommended)

Amazon Linux 2023 uses DNF as its package manager and is compatible with RHEL-based repositories.

### Step 1 - Install Required Tools

```bash
# Install yum-utils for managing repositories
sudo dnf install -y yum-utils
```

### Step 2 - Add the HashiCorp Repository

```bash
# Add the official HashiCorp RPM repository
# AL2023 is compatible with the RHEL repository
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo
```

Note that we use `AmazonLinux` in the URL rather than `RHEL`. HashiCorp maintains a specific repository for Amazon Linux distributions.

### Step 3 - Install Terraform

```bash
# Install Terraform
sudo dnf install -y terraform
```

### Step 4 - Verify

```bash
# Check the installed version
terraform -version
```

You should see output like:

```
Terraform v1.7.x
on linux_amd64
```

If your instance is running on Graviton (ARM) processors, it will show `linux_arm64` instead.

## Method 2 - Manual Binary Download

This method is useful when you cannot add external repositories, such as in hardened environments or when you need a specific Terraform version.

### Step 1 - Determine Your Architecture

```bash
# Check your system architecture
uname -m
```

This returns `x86_64` for Intel/AMD instances or `aarch64` for Graviton (ARM) instances.

### Step 2 - Download the Binary

```bash
# Set the version you want
TERRAFORM_VERSION="1.7.5"

# Determine architecture
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    TERRAFORM_ARCH="amd64"
elif [ "$ARCH" = "aarch64" ]; then
    TERRAFORM_ARCH="arm64"
fi

# Download Terraform
curl -LO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${TERRAFORM_ARCH}.zip"
```

### Step 3 - Extract and Install

```bash
# Install unzip if not present
sudo dnf install -y unzip

# Extract the binary
unzip "terraform_${TERRAFORM_VERSION}_linux_${TERRAFORM_ARCH}.zip"

# Move to a directory in PATH
sudo mv terraform /usr/local/bin/

# Make it executable
sudo chmod +x /usr/local/bin/terraform

# Verify
terraform -version

# Clean up
rm -f "terraform_${TERRAFORM_VERSION}_linux_${TERRAFORM_ARCH}.zip"
```

## Using Terraform with AWS on AL2023

One of the advantages of running Terraform on an EC2 instance is that you can leverage IAM instance profiles for authentication instead of storing credentials on disk.

### Using IAM Instance Profiles

Attach an IAM role to your EC2 instance with the permissions Terraform needs. Then Terraform's AWS provider picks up the credentials automatically:

```hcl
# main.tf - No explicit credentials needed when using instance profiles
provider "aws" {
  region = "us-east-1"
  # Credentials come from the instance profile automatically
}

resource "aws_s3_bucket" "example" {
  bucket = "my-terraform-test-bucket-unique-id"
}
```

This is more secure than storing access keys in files or environment variables.

### Using Environment Variables

If you are not using instance profiles, set AWS credentials via environment variables:

```bash
# Export AWS credentials (add to ~/.bashrc for persistence)
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"
```

## Running Terraform in User Data

You can install and run Terraform as part of an EC2 instance's user data script. This is handy for bootstrapping automation:

```bash
#!/bin/bash
# EC2 User Data script to install Terraform on Amazon Linux 2023

# Install Terraform
dnf install -y yum-utils
yum-config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo
dnf install -y terraform

# Verify installation
terraform -version >> /var/log/terraform-install.log

# Clone your Terraform configs and apply
# dnf install -y git
# git clone https://your-repo.git /opt/terraform-configs
# cd /opt/terraform-configs && terraform init && terraform apply -auto-approve
```

## Setting Up Terraform for Multiple AWS Accounts

If your AL2023 instance manages resources across multiple AWS accounts, configure named profiles:

```bash
# Create AWS config with multiple profiles
mkdir -p ~/.aws

cat > ~/.aws/config <<'EOF'
[default]
region = us-east-1

[profile staging]
role_arn = arn:aws:iam::123456789012:role/TerraformRole
source_profile = default
region = us-west-2

[profile production]
role_arn = arn:aws:iam::987654321098:role/TerraformRole
source_profile = default
region = us-east-1
EOF
```

Then reference the profile in your Terraform configuration:

```hcl
# Use a specific AWS profile
provider "aws" {
  profile = "staging"
  region  = "us-west-2"
}
```

## Updating Terraform

### Repository Method

```bash
# Check for updates
sudo dnf check-update terraform

# Apply the update
sudo dnf update -y terraform
```

### Manual Method

Download the new version and replace the binary:

```bash
TERRAFORM_VERSION="1.8.0"
TERRAFORM_ARCH="amd64"  # or arm64 for Graviton
curl -LO "https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_linux_${TERRAFORM_ARCH}.zip"
unzip "terraform_${TERRAFORM_VERSION}_linux_${TERRAFORM_ARCH}.zip"
sudo mv terraform /usr/local/bin/terraform
rm -f "terraform_${TERRAFORM_VERSION}_linux_${TERRAFORM_ARCH}.zip"
```

## Troubleshooting

### Repository Not Found

If the `AmazonLinux` repository URL does not work, try the RHEL repository as a fallback:

```bash
# Alternative: use the RHEL repository
sudo yum-config-manager --add-repo https://rpm.releases.hashicorp.com/RHEL/hashicorp.repo
```

### DNS Resolution Issues in Private Subnets

If your EC2 instance is in a private subnet without internet access, you will need either a NAT Gateway or VPC endpoints for S3 (to access the repository). Alternatively, use the manual method and copy the zip file to the instance via SCP or from an S3 bucket:

```bash
# Copy Terraform binary from S3
aws s3 cp s3://your-bucket/terraform_1.7.5_linux_amd64.zip .
unzip terraform_1.7.5_linux_amd64.zip
sudo mv terraform /usr/local/bin/
```

### DNF Lock Errors

If another process is using DNF:

```bash
# Wait for the lock to be released, or kill the blocking process
sudo fuser -v /var/cache/dnf/metadata_lock.pid

# Force release the lock if needed (use with caution)
sudo rm -f /var/cache/dnf/metadata_lock.pid
```

## Automating Installation with SSM

If you manage a fleet of AL2023 instances, you can use AWS Systems Manager Run Command to install Terraform across all of them:

```bash
# Install Terraform on multiple instances via SSM
aws ssm send-command \
  --document-name "AWS-RunShellScript" \
  --targets "Key=tag:Role,Values=terraform-runner" \
  --parameters 'commands=["dnf install -y yum-utils","yum-config-manager --add-repo https://rpm.releases.hashicorp.com/AmazonLinux/hashicorp.repo","dnf install -y terraform","terraform -version"]'
```

## Next Steps

Now that Terraform is running on your Amazon Linux 2023 instance, you are well positioned to manage AWS infrastructure directly from EC2. Consider setting up a remote backend using S3 and DynamoDB for state management, and explore Terraform workspaces if you need to manage multiple environments from the same configuration.
