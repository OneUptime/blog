# How to Configure RHEL for AWS Systems Manager Integration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, AWS, Systems Manager, SSM

Description: Configure RHEL for AWS Systems Manager integration.

---

## Overview

Configure RHEL for AWS Systems Manager integration. RHEL is fully supported on major cloud platforms with official images and integrated tooling.

## Prerequisites

- A RHEL subscription or AWS Marketplace entitlement
- An AWS account
- AWS CLI installed and configured
- An IAM instance profile with the `AmazonSSMManagedInstanceCore` policy attached

## Step 1 - Choose Your Deployment Method

You can deploy RHEL on AWS using:

1. **AWS Marketplace images** - pre-built, official Red Hat images
2. **Custom images** - built with Image Builder and uploaded
3. **Terraform** - infrastructure as code provisioning
4. **Red Hat Hybrid Cloud Console** - centralized management

## Step 2 - Launch a RHEL Instance

For AWS:

```bash
aws ec2 run-instances \
  --image-id ami-xxxxxxxxxxxxxxxxx \
  --instance-type m5.large \
  --key-name mykey \
  --iam-instance-profile Name=SSMInstanceProfile \
  --user-data file://cloud-init.yaml
```

## Step 3 - Configure cloud-init

RHEL cloud images use cloud-init for first-boot customization. AWS-provided RHEL 8 and 9 AMIs do not include SSM Agent by default, so install and start it in the user-data script:

```yaml
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
runcmd:
  - dnf install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
  - systemctl enable --now amazon-ssm-agent
```

## Step 4 - Register with Red Hat

AWS Marketplace RHEL images use Red Hat Update Infrastructure (RHUI). For bring-your-own-subscription images, register the instance with Red Hat:

```bash
sudo subscription-manager register --auto-attach
# Or connect to Red Hat Insights:

sudo insights-client --register
```

## Step 5 - Configure Security and Networking

Set up security groups and firewall rules to allow only necessary traffic. SSM Agent needs outbound HTTPS access on port 443 to the Systems Manager endpoints, or VPC endpoints for Systems Manager. Enable SELinux (it is on by default) and configure firewalld.

## Step 6 - Set Up Monitoring

Connect your cloud instances to your monitoring infrastructure:

```bash
# Install Node Exporter for Prometheus
# Or register with Red Hat Insights
sudo insights-client
```

## Summary

You have learned how to configure RHEL for AWS Systems Manager integration. RHEL on AWS benefits from official support, pre-configured images, and integration with Red Hat management tools.
