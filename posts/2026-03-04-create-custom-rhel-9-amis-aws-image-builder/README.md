# How to Create Custom RHEL 9 AMIs for AWS Using Image Builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, AWS, AMI, Image Builder

Description: Create custom RHEL 9 AMIs for AWS using Image Builder.

---

## Overview

Create custom RHEL 9 AMIs for AWS using RHEL image builder. RHEL 9 is fully supported on AWS with official images and integrated tooling.

## Prerequisites

- A RHEL 9 subscription or cloud marketplace entitlement
- An AWS account with an access key and a writable S3 bucket
- CLI tools installed: composer-cli and aws-cli

## Step 1 - Choose Your Image Builder Method

You can create RHEL 9 images for AWS using:

1. **Marketplace images** - pre-built, official Red Hat images
2. **Custom AMI images** - built with RHEL image builder and uploaded
3. **RHEL web console** - graphical image builder workflow
4. **Red Hat Hybrid Cloud Console** - centralized management

## Step 2 - Build a RHEL 9 AMI

Create a blueprint:

```toml
name = "rhel9-aws-base"
description = "RHEL 9 AWS base image"
version = "0.0.1"

[[packages]]
name = "vim"
version = "*"

[[packages]]
name = "tmux"
version = "*"
```

Push the blueprint and start an AMI compose:

```bash
sudo composer-cli blueprints push rhel9-aws-base.toml
sudo composer-cli blueprints depsolve rhel9-aws-base
```

Create an AWS upload configuration:

```toml
provider = "aws"

[settings]
accessKeyID = "AWS_ACCESS_KEY_ID"
secretAccessKey = "AWS_SECRET_ACCESS_KEY"
bucket = "AWS_BUCKET"
region = "AWS_REGION"
key = "rhel9-aws-base"
```

Then build and upload the AMI:

```bash
sudo composer-cli compose start rhel9-aws-base ami rhel9-aws-base aws-config.toml
sudo composer-cli compose status
```

## Step 3 - Configure the Image

Use the blueprint to define image customizations such as the hostname, users, SSH key, and packages:

```toml
[customizations]
hostname = "my-rhel-server"

[[customizations.user]]
name = "admin"
key = "ssh-rsa AAAA...your-key-here"
groups = ["users", "wheel"]
```

## Step 4 - Register with Red Hat

```bash
sudo subscription-manager register --auto-attach
# Or connect to Red Hat Insights:

sudo insights-client --register
```

## Step 5 - Configure Security and Networking

Set up AWS security groups and host firewall rules to allow only necessary traffic. SELinux enforcing mode is the default and recommended mode on RHEL 9, and you can use firewalld for common host firewall rules.

## Step 6 - Set Up Monitoring

Connect your cloud instances to your monitoring infrastructure:

```bash
# Install Node Exporter for Prometheus
# Or register with Red Hat Insights
sudo insights-client
```

## Summary

You have learned how to create custom RHEL 9 AMIs for AWS using image builder. RHEL 9 on AWS benefits from official support, pre-configured images, and integration with Red Hat management tools.
