# How to Deploy RHEL HA Clusters on Azure with Pacemaker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Azure, High Availability, Pacemaker

Description: Learn how to deploy and configure highly available RHEL clusters on Azure using Pacemaker for automated failover.

---

## Overview

Deploy RHEL HA clusters on Azure using Pacemaker. RHEL is supported on Azure with official images, Azure Marketplace entitlement options, and integrated tooling.

## Prerequisites

- A RHEL subscription or Azure Marketplace entitlement that includes the High Availability Add-On
- An Azure account with permission to create virtual machines, managed identities, role assignments, load balancers, and networking resources
- Azure CLI (`az`) installed and an SSH public key for VM access

## Step 1 - Choose Your Deployment Method

You can deploy RHEL on Azure using:

1. **Marketplace images** - pre-built, official Red Hat images
2. **Custom images** - built with Image Builder and uploaded
3. **Terraform** - infrastructure as code provisioning
4. **Red Hat Hybrid Cloud Console** - centralized management

## Step 2 - Launch RHEL Instances

List the available RHEL 9 High Availability images, then create multiple VMs for the cluster:

```bash
az vm image list --publisher RedHat --offer RHEL-HA --all --output table
RHEL_HA_IMAGE="RedHat:RHEL-HA:<sku-from-list>:latest"

az group create --name myRG --location eastus
az vm availability-set create \
  --resource-group myRG \
  --name rhel-ha-as \
  --platform-fault-domain-count 2 \
  --platform-update-domain-count 5

for node in node01 node02 node03; do
  az vm create \
    --resource-group myRG \
    --name "$node" \
    --availability-set rhel-ha-as \
    --image "$RHEL_HA_IMAGE" \
    --size Standard_D2s_v3 \
    --admin-username azureuser \
    --ssh-key-values ~/.ssh/id_rsa.pub \
    --public-ip-sku Standard
done
```

## Step 3 - Configure cloud-init

RHEL cloud images use cloud-init for first-boot customization. Create a user-data script for each node:

```yaml
#cloud-config
hostname: node01
users:
  - name: azureuser
    groups: wheel
    sudo: ALL=(ALL) NOPASSWD:ALL
    ssh_authorized_keys:
      - ssh-rsa AAAA...your-key-here
packages:
  - pcs
  - pacemaker
  - fence-agents-azure-arm
  - resource-agents-cloud
  - nmap-ncat
```

## Step 4 - Register with Red Hat

For BYOS or custom images, register the nodes and enable the RHEL 9 High Availability repository. On each node, install the HA packages and start `pcsd`:

```bash
sudo subscription-manager register
sudo subscription-manager repos --enable=rhel-9-for-x86_64-highavailability-rpms
sudo dnf update -y
sudo dnf install -y pcs pacemaker fence-agents-azure-arm resource-agents-cloud nmap-ncat
sudo passwd hacluster
sudo firewall-cmd --permanent --add-service=high-availability
sudo firewall-cmd --reload
sudo systemctl enable --now pcsd.service

sudo insights-client --register
```

## Step 5 - Configure Security and Networking

Set up Azure NSGs and firewalld to allow only the required cluster, application, and SSH traffic. Enable SELinux (it is on by default), configure an Azure internal load balancer for clustered services, and configure fencing with either an Azure managed identity or a service principal.

On one node, create and start the Pacemaker cluster:

```bash
sudo pcs host auth node01 node02 node03
sudo pcs cluster setup rhel_azure_cluster node01 node02 node03
sudo pcs cluster enable --all
sudo pcs cluster start --all
```

After assigning the managed identity role needed by the Azure fence agent, enable STONITH and create the Azure fencing resource:

```bash
sudo pcs property set stonith-timeout=900
sudo pcs property set stonith-enabled=true
sudo pcs stonith create rsc_st_azure fence_azure_arm msi=true \
  resourceGroup="myRG" \
  subscriptionId="<subscription-id>" \
  power_timeout=240 \
  pcmk_reboot_timeout=900 \
  pcmk_monitor_timeout=120 \
  pcmk_monitor_retries=4 \
  pcmk_action_limit=3 \
  meta failure-timeout=120s \
  op monitor interval=3600
```

## Step 6 - Set Up Monitoring

Connect your cloud instances to your monitoring infrastructure:

```bash
sudo pcs status
sudo insights-client --checkin
```

## Summary

You have learned how to deploy RHEL HA clusters on Azure with Pacemaker. RHEL on Azure benefits from official support, pre-configured images, Azure fencing integration, and Red Hat management tools.
