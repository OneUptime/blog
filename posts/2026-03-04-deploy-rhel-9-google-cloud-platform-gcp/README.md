# How to Deploy RHEL 9 on Google Cloud Platform (GCP)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GCP, Google Cloud, Linux

Description: Deploy RHEL 9 on Google Cloud Platform using Compute Engine.

---

## Overview

Deploy RHEL 9 on Google Cloud Platform using Compute Engine. RHEL 9 is fully supported on major cloud platforms with official images and integrated tooling.

## Prerequisites

- A Google Cloud account with billing enabled
- The Google Cloud CLI installed and authenticated
- A project with the Compute Engine API enabled

## Step 1 - Choose Your Deployment Method

You can deploy RHEL 9 on GCP using:

1. **Marketplace images** - pre-built, official Red Hat images
2. **Custom images** - built with Image Builder and uploaded
3. **Terraform** - infrastructure as code provisioning
4. **Red Hat Hybrid Cloud Console** - centralized management

## Step 2 - Launch a RHEL 9 Instance

For GCP:

```bash
gcloud compute instances create myvm \
  --zone=us-central1-a \
  --image-project=rhel-cloud \
  --image-family=rhel-9 \
  --machine-type=e2-medium
```

## Step 3 - Configure cloud-init

RHEL 9 cloud images use cloud-init for first-boot customization. Create a `cloud-config.yaml` user-data script:

```yaml
#cloud-config
hostname: my-rhel-server
users:
  - default
  - name: admin
    groups: wheel
    sudo: ["ALL=(ALL) NOPASSWD:ALL"]
    ssh_authorized_keys:
      - ssh-rsa AAAA...your-key-here
packages:
  - vim
  - tmux
```

Pass it to the instance through the `user-data` metadata key:

```bash
gcloud compute instances create myvm \
  --zone=us-central1-a \
  --image-project=rhel-cloud \
  --image-family=rhel-9 \
  --machine-type=e2-medium \
  --metadata-from-file=user-data=cloud-config.yaml
```

## Step 4 - Register with Red Hat

Google Cloud pay-as-you-go RHEL images receive updates through Google's Red Hat Update Infrastructure (RHUI) and do not use `subscription-manager`. For BYOS or custom images, register with Red Hat:

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

You have learned how to deploy rhel 9 on google cloud platform (gcp). RHEL 9 on cloud platforms benefits from official support, pre-configured images, and integration with Red Hat management tools.
