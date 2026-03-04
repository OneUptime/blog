# How to Create Cloud-Ready RHEL Images for AWS Using Image Builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, AWS, Image Builder, AMI, Cloud, Linux

Description: Use RHEL Image Builder to create custom AMI images for AWS, including cloud-init configuration and direct upload to your AWS account.

---

RHEL Image Builder can produce Amazon Machine Images (AMIs) ready for deployment on AWS. You can customize the image with your packages and configurations, then upload it directly to your AWS account.

## Creating an AWS-Optimized Blueprint

```toml
# aws-webserver.toml
name = "aws-webserver"
description = "Custom RHEL image for AWS web servers"
version = "1.0.0"

[[packages]]
name = "httpd"
version = "*"

[[packages]]
name = "cloud-init"
version = "*"

[[packages]]
name = "cloud-utils-growpart"
version = "*"

[[packages]]
name = "insights-client"
version = "*"

# AWS-specific customizations
[customizations]
hostname = ""

[customizations.services]
enabled = ["httpd", "cloud-init", "cloud-init-local", "cloud-config", "cloud-final"]

# Configure the kernel command line for AWS
[customizations.kernel]
append = "console=ttyS0,115200n8 console=tty0 net.ifnames=0"
```

Push the blueprint:

```bash
composer-cli blueprints push aws-webserver.toml
composer-cli blueprints depsolve aws-webserver
```

## Building the AMI

```bash
# Build an AMI image
composer-cli compose start aws-webserver ami

# Monitor the build
composer-cli compose status

# Download the image once complete
composer-cli compose image <compose-uuid>
```

## Uploading to AWS

### Option 1: Direct Upload via composer-cli

Configure AWS credentials for Image Builder:

```bash
# Create an AWS upload configuration
cat > aws-config.toml << 'AWS'
provider = "aws"

[settings]
accessKeyID = "AKIAIOSFODNN7EXAMPLE"
secretAccessKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
bucket = "my-image-builder-bucket"
region = "us-east-1"
key = "rhel-webserver-image"
AWS

# Start the build with upload
composer-cli compose start aws-webserver ami "" aws-config.toml
```

### Option 2: Manual Upload with AWS CLI

```bash
# Install and configure AWS CLI
sudo dnf install -y awscli2
aws configure

# Upload the raw image to S3
aws s3 cp <compose-uuid>-image.raw s3://my-image-bucket/rhel-webserver.raw

# Create an import task
aws ec2 import-image \
  --description "Custom RHEL Web Server" \
  --disk-containers "Description=RHEL,Format=raw,UserBucket={S3Bucket=my-image-bucket,S3Key=rhel-webserver.raw}"

# Monitor import progress
aws ec2 describe-import-image-tasks --import-task-ids <import-task-id>
```

## Launching an Instance from the AMI

```bash
# Launch an EC2 instance from your custom AMI
aws ec2 run-instances \
  --image-id <ami-id> \
  --instance-type t3.medium \
  --key-name my-key-pair \
  --security-group-ids sg-12345678 \
  --subnet-id subnet-12345678
```
