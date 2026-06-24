# How to Deploy RHEL 9 HA Clusters on GCP with Pacemaker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, GCP, High Availability, Pacemaker

Description: Learn how to deploy and configure highly available RHEL clusters on GCP using Pacemaker for automated failover.

---

## Overview

Deploy RHEL 9 instances on GCP. RHEL 9 is supported on Google Cloud with official images and integrated tooling.

## Prerequisites

- A RHEL 9 subscription or cloud marketplace entitlement
- A Google Cloud account
- The gcloud CLI installed and configured

## Step 1 - Choose Your Deployment Method

You can deploy RHEL 9 on GCP using:

1. **Google Cloud images** - pre-built RHEL images from the rhel-cloud image project or Google Cloud Marketplace
2. **Custom images** - built with Image Builder and uploaded
3. **Terraform** - infrastructure as code provisioning
4. **Red Hat Hybrid Cloud Console** - centralized management

## Step 2 - Launch a RHEL 9 Instance

For GCP:

```bash
gcloud compute instances create myvm --zone=us-central1-a --image-project=rhel-cloud --image-family=rhel-9 --machine-type=e2-medium
```

## Step 3 - Configure cloud-init

RHEL 9 cloud images use cloud-init for first-boot customization. Create a user-data script:

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

If you are using a BYOS or custom image, register the instance with Red Hat:

```bash
sudo subscription-manager register --auto-attach
# Or connect to Red Hat Insights:

sudo insights-client --register
```

## Step 5 - Configure Security and Networking

Set up Google Cloud firewall rules to allow only necessary traffic. Enable SELinux (it is on by default) and configure firewalld.

## Step 6 - Set Up Monitoring

Connect your cloud instances to your monitoring infrastructure:

```bash
# Install Node Exporter for Prometheus
# Or register with Red Hat Insights
sudo insights-client
```

## Summary

You have learned how to deploy RHEL 9 instances on GCP. RHEL 9 on Google Cloud benefits from official support, pre-configured images, and integration with Red Hat management tools.
