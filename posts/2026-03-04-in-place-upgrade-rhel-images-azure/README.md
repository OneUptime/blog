# How to Perform an In-Place Upgrade of RHEL Images on Azure

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Azure, In-Place Upgrade, Leapp

Description: Perform an in-place upgrade of RHEL images on Azure.

---

## Overview

Perform an in-place upgrade of Red Hat Enterprise Linux (RHEL) virtual machines on Azure with Leapp. In-place upgrades are supported for specific RHEL major-version paths and require preparation, a backup, and a successful Leapp pre-upgrade report before the system is upgraded.

## Prerequisites

- A supported RHEL VM on Azure
- A current backup or managed disk snapshot before starting
- Azure CLI installed and signed in
- RHEL package access through Azure RHUI for pay-as-you-go images or Red Hat Subscription Management/Satellite for BYOS images
- Root or sudo access to the VM

## Step 1 - Choose Your Deployment Method

Choose the right upgrade path for the image and subscription model:

1. **Azure pay-as-you-go RHEL images** - use Azure RHUI repositories and the Azure-specific Leapp packages when available
2. **BYOS or custom RHEL images** - register the VM with Red Hat Subscription Management or Satellite and enable the required RHEL and Leapp repositories
3. **Unsupported or heavily customized images** - rebuild on a supported RHEL image instead of attempting an in-place upgrade
4. **Production systems** - test the same upgrade path on a cloned VM before upgrading the original VM

## Step 2 - Back Up the RHEL Instance

Create a snapshot or backup before running Leapp. For example, snapshot the OS disk:

```bash
OS_DISK_ID=$(az vm show \
  --resource-group myRG \
  --name myVM \
  --query "storageProfile.osDisk.managedDisk.id" \
  --output tsv)

az snapshot create \
  --resource-group myRG \
  --name myVM-osdisk-before-leapp \
  --source "$OS_DISK_ID"
```

## Step 3 - Prepare the VM

Update the current RHEL system, reboot if the kernel was updated, and confirm the VM is healthy before starting the upgrade:

```bash
sudo dnf update -y
sudo reboot
```

For RHEL 7, use `yum` instead of `dnf`:

```bash
sudo yum update -y
sudo reboot
```

## Step 4 - Install Leapp

On a pay-as-you-go Azure image, use the Azure RHUI repositories configured for the VM:

```bash
sudo dnf config-manager --set-enabled rhui-microsoft-azure-rhel8
sudo dnf -y install rhui-azure-rhel8 leapp-rhui-azure
sudo dnf install -y leapp-upgrade
```

For RHEL 7 pay-as-you-go images, use `yum` and the RHEL 7 RHUI repositories instead:

```bash
sudo yum-config-manager --enable rhui-microsoft-azure-rhel7
sudo yum -y install rhui-azure-rhel7
sudo yum-config-manager --enable rhui-rhel-7-server-rhui-extras-rpms
sudo yum -y install leapp-rhui-azure
sudo yum install -y leapp-upgrade
```

On a BYOS image, register the system and enable the required Red Hat repositories before installing Leapp.

```bash
sudo subscription-manager register --auto-attach
```

## Step 5 - Run the Pre-Upgrade Check

Make sure you can recover the VM if network access is interrupted during the upgrade. Keep Azure serial console access available, confirm SSH is allowed by the VM's network security group, and review the Leapp pre-upgrade report before proceeding.

```bash
sudo -r unconfined_r -t unconfined_t leapp preupgrade --target 9.6 --no-rhsm
sudo less /var/log/leapp/leapp-report.txt
```

Replace `9.6` with the target minor version for your supported upgrade path. Omit `--no-rhsm` for BYOS VMs that are using Red Hat Subscription Management. Resolve all inhibitors reported by Leapp. Do not continue until the pre-upgrade report is clean enough for the upgrade path you are using.

## Step 6 - Run the Upgrade

Run the upgrade, reboot into the upgrade environment, and verify the final RHEL release:

```bash
sudo -r unconfined_r -t unconfined_t leapp upgrade --target 9.6 --no-rhsm
sudo reboot
cat /etc/redhat-release
uname -r
sudo dnf repolist
```

After the VM comes back online, check your application, logs, monitoring agent, Azure VM agent, and any Red Hat Insights or security tooling you use.

## Summary

You have learned how to perform an in-place upgrade of RHEL images on Azure. The important steps are to confirm that the RHEL upgrade path is supported, create a backup, prepare the VM, install Leapp from the correct repositories, resolve all pre-upgrade inhibitors, and verify the system after the reboot.
