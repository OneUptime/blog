# How to Deploy SAP HANA on RHEL 9 in Azure with Pacemaker Clustering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP HANA, Azure, Pacemaker

Description: Deploy SAP HANA on RHEL 9 in Azure with Pacemaker clustering.

---

## Overview

Deploy SAP HANA on RHEL 9 in Azure with Pacemaker clustering. Running SAP on RHEL 9 requires specific system preparation, kernel tuning, and high-availability configuration.

## Prerequisites

- RHEL 9.4 or later with the SAP Solutions subscription
- Systems meeting SAP hardware requirements (see SAP Note 2772999)
- Root or sudo access
- For HA clusters: at least two RHEL 9 nodes with the HA add-on

## Step 1 - Register and Enable SAP Repositories

```bash
sudo subscription-manager release --set=9.4
sudo subscription-manager repos --disable="*" \
  --enable="rhel-9-for-$(uname -m)-baseos-e4s-rpms" \
  --enable="rhel-9-for-$(uname -m)-appstream-e4s-rpms" \
  --enable="rhel-9-for-$(uname -m)-sap-solutions-e4s-rpms" \
  --enable="rhel-9-for-$(uname -m)-sap-netweaver-e4s-rpms" \
  --enable="rhel-9-for-$(uname -m)-highavailability-e4s-rpms"
```

## Step 2 - Install SAP-Specific Packages

```bash
sudo dnf install -y tuned-profiles-sap-hana sap-hana-ha
# For RHEL System Roles for SAP:

sudo dnf install -y rhel-system-roles-sap
```

## Step 3 - Apply SAP Tuning Profile

```bash
sudo tuned-adm profile sap-hana
```

This configures kernel parameters, memory settings, and I/O schedulers as recommended by SAP.

## Step 4 - Configure Kernel Parameters

Verify the SAP kernel settings in `/etc/sysctl.d/sap.conf`:

```text
vm.max_map_count = 2147483647
kernel.pid_max = 4194304
```

Apply:

```bash
sudo sysctl --system
```

## Step 5 - Set Up High Availability (If Required)

Install the HA add-on:

```bash
sudo dnf install -y pacemaker pcs resource-agents-cloud fence-agents-azure-arm
sudo systemctl enable --now pcsd
sudo passwd hacluster
```

Configure the cluster with pcs commands following the SAP-specific resource agent documentation and configure Azure fencing with `fence_azure_arm` or SBD.

## Step 6 - Validate the Configuration

Use the SAP HANA Hardware and Cloud Measurement Tools (HCMT), `hdblcm --action=check_installation`, or the RHEL System Roles validation tasks to confirm your system meets SAP requirements.

## Summary

You have learned how to deploy sap hana in azure with pacemaker clustering. SAP workloads on RHEL 9 require careful preparation, but RHEL System Roles and tuned profiles automate much of the configuration.
