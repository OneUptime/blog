# How to Create Custom RHEL AMIs for AWS Using Image Builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, AWS, AMI, Image Builder, Custom Images, Cloud, Linux

Description: Create custom RHEL AMIs for AWS using Image Builder with pre-installed packages, security hardening, and organization-specific configurations baked in.

---

Custom AMIs let you standardize your RHEL deployments on AWS. Using Image Builder, you can create AMIs with your organization's packages, security baselines, and configurations pre-installed, reducing instance startup time and ensuring consistency.

## Creating a Blueprint for AWS

Define a blueprint with AWS-optimized settings and your custom packages:

```toml
# aws-golden-image.toml
name = "aws-golden-image"
description = "Organization standard RHEL AMI for AWS"
version = "1.0.0"

# AWS integration packages
[[packages]]
name = "cloud-init"
version = "*"

[[packages]]
name = "cloud-utils-growpart"
version = "*"

[[packages]]
name = "insights-client"
version = "*"

# Security packages
[[packages]]
name = "aide"
version = "*"

[[packages]]
name = "openscap-scanner"
version = "*"

# Standard organization packages
[[packages]]
name = "vim-enhanced"
version = "*"

[[packages]]
name = "tmux"
version = "*"

[[packages]]
name = "git"
version = "*"

[[packages]]
name = "rsync"
version = "*"

# Customizations
[customizations]
hostname = ""

[customizations.services]
enabled = ["cloud-init", "cloud-init-local", "cloud-config", "cloud-final", "sshd", "firewalld"]
disabled = ["kdump"]

[customizations.kernel]
append = "console=ttyS0,115200n8 console=tty0 net.ifnames=0 nvme_core.io_timeout=4294967295"

[[customizations.filesystem]]
mountpoint = "/var"
size = "10 GiB"

[[customizations.filesystem]]
mountpoint = "/var/log"
size = "5 GiB"

[[customizations.filesystem]]
mountpoint = "/tmp"
size = "2 GiB"
```

## Building the AMI

```bash
# Push the blueprint
composer-cli blueprints push aws-golden-image.toml

# Validate dependencies
composer-cli blueprints depsolve aws-golden-image

# Start the AMI build
composer-cli compose start aws-golden-image ami

# Monitor progress
watch composer-cli compose status
```

## Uploading to AWS

```bash
# Download the completed image
composer-cli compose image <compose-uuid>

# Upload to S3
aws s3 cp <compose-uuid>-image.raw s3://rhel-images-bucket/golden-image.raw

# Import as an AMI
aws ec2 import-image \
  --description "RHEL 9 Golden Image v1.0.0" \
  --license-type BYOL \
  --disk-containers "[{
    \"Description\": \"RHEL 9 Golden Image\",
    \"Format\": \"raw\",
    \"UserBucket\": {
      \"S3Bucket\": \"rhel-images-bucket\",
      \"S3Key\": \"golden-image.raw\"
    }
  }]"

# Check import status
aws ec2 describe-import-image-tasks \
  --query 'ImportImageTasks[*].{ID:ImportTaskId,Status:Status,Progress:Progress}'
```

## Tagging the AMI

```bash
# Get the AMI ID from the completed import
AMI_ID=$(aws ec2 describe-import-image-tasks \
  --query 'ImportImageTasks[?Status==`completed`].ImageId' \
  --output text)

# Tag the AMI for identification
aws ec2 create-tags --resources "$AMI_ID" \
  --tags \
    Key=Name,Value="RHEL9-Golden-v1.0.0" \
    Key=Environment,Value=production \
    Key=BuildDate,Value=$(date +%Y-%m-%d) \
    Key=ManagedBy,Value=image-builder
```

## Launching Instances from the Custom AMI

```bash
# Launch an instance from your golden AMI
aws ec2 run-instances \
  --image-id "$AMI_ID" \
  --instance-type t3.large \
  --key-name my-keypair \
  --security-group-ids sg-0123456789abcdef \
  --subnet-id subnet-0123456789abcdef \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=app-server-01}]'
```

Every instance launched from this AMI will have your standard packages, security tools, and filesystem layout pre-configured.
