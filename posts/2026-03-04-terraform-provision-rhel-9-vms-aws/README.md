# How to Use Terraform to Provision RHEL 9 VMs on AWS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Terraform, AWS, Infrastructure as Code

Description: Learn how to use Terraform to automate provisioning of RHEL 9 virtual machines on AWS.

---

## Overview

Use Terraform to provision RHEL 9 VMs on AWS. RHEL 9 is fully supported on major cloud platforms with official images and integrated tooling.

## Prerequisites

- A RHEL 9 subscription or cloud marketplace entitlement
- An AWS account with permission to create EC2 resources
- Terraform and the AWS CLI installed and configured

## Step 1 - Choose Your Deployment Method

You can deploy RHEL 9 on AWS using:

1. **AWS Marketplace images** - pre-built, official Red Hat images
2. **Custom AMIs** - built with Image Builder and uploaded
3. **Red Hat Gold Images** - Cloud Access images for existing Red Hat subscriptions
4. **Terraform** - infrastructure as code provisioning

## Step 2 - Launch a RHEL 9 Instance

Create a Terraform configuration that looks up the latest official RHEL 9 AMI from Red Hat's AWS account and launches an EC2 instance:

```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

data "aws_ami" "rhel9" {
  most_recent = true
  owners      = ["309956199498"]

  filter {
    name   = "name"
    values = ["RHEL-9*_HVM-*-x86_64-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

resource "aws_instance" "rhel9" {
  ami           = data.aws_ami.rhel9.id
  instance_type = "m5.large"
  key_name      = "mykey"

  tags = {
    Name = "my-rhel-server"
  }
}
```

Apply the configuration:

```bash
terraform init
terraform plan
terraform apply
```

## Step 3 - Configure cloud-init

RHEL 9 cloud images use cloud-init for first-boot customization. Add user data to the Terraform instance resource:

```hcl
user_data = <<-EOF
#cloud-config
hostname: my-rhel-server
users:
  - name: admin
    groups: wheel
    ssh_authorized_keys:
      - ssh-rsa AAAA...your-key-here
packages:
  - vim
  - tmux
EOF
```

## Step 4 - Register with Red Hat

AWS Marketplace RHEL images are pay-as-you-go images and receive updates through Red Hat Update Infrastructure (RHUI). For BYOS or custom images, register the system with Subscription Manager:

```bash
sudo subscription-manager register --activationkey=<activation_key_name> --org=<organization_ID>
# Or connect to Red Hat Insights:

sudo insights-client --register
```

## Step 5 - Configure Security and Networking

Set up security groups and firewall rules to allow only necessary traffic. Enable SELinux (it is on by default) and configure firewalld.

## Step 6 - Set Up Monitoring

Connect your cloud instances to your monitoring infrastructure:

```bash
# Install Node Exporter for Prometheus
# Or register with Red Hat Insights
sudo insights-client
```

## Summary

You have learned how to use Terraform to provision RHEL 9 VMs on AWS. RHEL 9 on AWS benefits from official support, pre-configured images, and integration with Red Hat management tools.
