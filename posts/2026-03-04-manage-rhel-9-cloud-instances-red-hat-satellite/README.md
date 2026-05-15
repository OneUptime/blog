# How to Manage RHEL 9 Cloud Instances with Red Hat Satellite

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Red Hat Satellite, Cloud, Management

Description: Manage RHEL 9 cloud instances with Red Hat Satellite.

---

## Overview

Manage RHEL 9 cloud instances with Red Hat Satellite. RHEL 9 is fully supported on major cloud platforms with official images and integrated tooling.

## Prerequisites

- A RHEL 9 subscription or cloud marketplace entitlement
- A Red Hat Satellite Server with a RHEL 9 activation key and synced RHEL 9 content
- An account on the target cloud platform (AWS, Azure, or GCP)
- CLI tools installed: AWS CLI, Azure CLI, or Google Cloud CLI

## Step 1 - Choose Your Deployment Method

You can deploy RHEL 9 in the cloud using:

1. **Marketplace images** - pre-built, official Red Hat images
2. **Custom images** - built with Image Builder and uploaded
3. **Terraform** - infrastructure as code provisioning
4. **Red Hat Hybrid Cloud Console** - centralized management

## Step 2 - Launch a RHEL 9 Instance

For AWS:

```bash
aws ec2 run-instances --image-id ami-0abcdef1234567890 --instance-type m5.large --count 1 --key-name mykey
```

For Azure:

```bash
az vm create --resource-group myRG --name myVM --image RedHat:RHEL:9-lvm-gen2:latest --size Standard_D2s_v3 --admin-username azureuser --generate-ssh-keys
```

For GCP:

```bash
gcloud compute instances create myvm --image-project=rhel-cloud --image-family=rhel-9 --machine-type=e2-medium --zone=us-central1-a
```

## Step 3 - Configure cloud-init

RHEL 9 cloud images use cloud-init for first-boot customization. Create a user-data script:

```yaml
#cloud-config
hostname: my-rhel-server
users:
  - name: admin
    groups: wheel
    sudo: "ALL=(ALL) NOPASSWD:ALL"
    ssh_authorized_keys:
      - ssh-rsa AAAA...your-key-here
packages:
  - vim
  - tmux
```

## Step 4 - Register with Red Hat

Generate a host registration command in Satellite from **Hosts > Register Host**, select the activation key for your RHEL 9 content, and run the generated command on the instance as root:

```bash
curl -sS 'https://satellite.example.com/register?...' | sudo bash
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

You have learned how to manage rhel 9 cloud instances with red hat satellite. RHEL 9 on cloud platforms benefits from official support, pre-configured images, and integration with Red Hat management tools.
