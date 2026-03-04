# How to Perform an In-Place Upgrade of RHEL Images on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Azure, In-Place Upgrade, Leapp

Description: Perform an in-place upgrade of RHEL images on Azure.

---

## Overview

Perform an in-place upgrade of RHEL images on Azure. RHEL is fully supported on major cloud platforms with official images and integrated tooling.

## Prerequisites

- A RHEL subscription or cloud marketplace entitlement
- An account on the target cloud platform (AWS, Azure, or GCP)
- CLI tools installed: aws-cli, az-cli, or gcloud

## Step 1 - Choose Your Deployment Method

You can deploy RHEL in the cloud using:

1. **Marketplace images** - pre-built, official Red Hat images
2. **Custom images** - built with Image Builder and uploaded
3. **Terraform** - infrastructure as code provisioning
4. **Red Hat Hybrid Cloud Console** - centralized management

## Step 2 - Launch a RHEL Instance

For AWS:

```bash
aws ec2 run-instances --image-id ami-rhel9-xxxxx --instance-type m5.large --key-name mykey
```

For Azure:

```bash
az vm create --resource-group myRG --name myVM --image RedHat:RHEL:9:latest --size Standard_D2s_v3
```

For GCP:

```bash
gcloud compute instances create myvm --image-project=rhel-cloud --image-family=rhel-9 --machine-type=e2-medium
```

## Step 3 - Configure cloud-init

RHEL cloud images use cloud-init for first-boot customization. Create a user-data script:

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
```

## Step 4 - Register with Red Hat

```bash
sudo subscription-manager register --auto-attach
# Or connect to Red Hat Insights:
sudo insights-client --register
```

## Step 5 - Configure Security and Networking

Set up security groups, NSGs, or firewall rules to allow only necessary traffic. Enable SELinux (it is on by default) and configure firewalld.

## Step 6 - Set Up Monitoring

Connect your cloud instances to your monitoring infrastructure:

```bash
# Install Node Exporter for Prometheus
# Or register with Red Hat Insights
sudo insights-client
```

## Summary

You have learned how to perform an in-place upgrade of rhel images on azure. RHEL on cloud platforms benefits from official support, pre-configured images, and integration with Red Hat management tools.
