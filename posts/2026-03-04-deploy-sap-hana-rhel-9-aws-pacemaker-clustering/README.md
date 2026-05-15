# How to Deploy SAP HANA on RHEL 9 in AWS with Pacemaker Clustering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP HANA, AWS, Pacemaker

Description: Deploy SAP HANA on RHEL 9 in AWS with Pacemaker clustering.

---

## Overview

Deploy SAP HANA on RHEL 9 in AWS with Pacemaker clustering. Running SAP on RHEL 9 requires specific system preparation, kernel tuning, and high-availability configuration.

## Prerequisites

- RHEL 9 with the SAP Solutions subscription
- Systems meeting SAP HANA hardware requirements in the SAP HANA Hardware Directory and SAP Product Availability Matrix
- Root or sudo access
- For HA clusters: at least two RHEL 9 nodes with the HA add-on

## Step 1 - Register and Enable SAP Repositories

```bash
sudo subscription-manager repos --enable=rhel-9-for-x86_64-sap-solutions-rpms
sudo subscription-manager repos --enable=rhel-9-for-x86_64-sap-netweaver-rpms
```

## Step 2 - Install SAP-Specific Packages

```bash
sudo dnf install -y tuned-profiles-sap-hana resource-agents-sap-hana
# For RHEL System Roles for SAP:

sudo dnf install -y rhel-system-roles-sap rhel-system-roles
```

## Step 3 - Apply SAP Tuning Profile

```bash
sudo tuned-adm profile sap-hana
```

This configures kernel parameters, memory settings, and I/O schedulers as recommended by SAP.

## Step 4 - Configure Kernel Parameters

Verify SAP-required settings managed by RHEL System Roles or tuned. For example, SAP applications on RHEL require `vm.max_map_count` in `/etc/sysctl.d/sap.conf`, and the same file might also contain `kernel.pid_max`:

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
sudo dnf install -y pacemaker corosync pcs chrony resource-agents resource-agents-cloud fence-agents-aws resource-agents-sap-hana
sudo systemctl enable --now pcsd
sudo passwd hacluster
```

Configure the cluster with pcs commands following the SAP-specific resource agent documentation.

## Step 6 - Validate the Configuration

Use the SAP HANA Hardware and Cloud Measurement Tools (HCMT) or the RHEL System Roles validation tasks to confirm your system meets SAP requirements.

## Summary

You have learned how to deploy sap hana in aws with pacemaker clustering. SAP workloads on RHEL 9 require careful preparation, but RHEL System Roles and tuned profiles automate much of the configuration.
