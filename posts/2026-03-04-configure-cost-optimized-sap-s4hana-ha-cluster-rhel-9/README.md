# How to Configure a Cost-Optimized SAP S/4HANA HA Cluster on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP S/4HANA, Cost Optimization, HA

Description: Configure a cost-optimized SAP S/4HANA HA cluster on RHEL.

---

## Overview

Configure a cost-optimized SAP S/4HANA HA cluster on RHEL. Running SAP on RHEL requires specific system preparation, kernel tuning, and high-availability configuration.

## Prerequisites

- RHEL with the SAP Solutions subscription
- Systems meeting SAP hardware requirements (see SAP Note 2772999)
- Root or sudo access
- For HA clusters: at least two RHEL nodes with the HA add-on

## Step 1 - Register and Enable SAP Repositories

```bash
sudo subscription-manager repos --enable=rhel-9-for-x86_64-sap-solutions-rpms
sudo subscription-manager repos --enable=rhel-9-for-x86_64-sap-netweaver-rpms
```

## Step 2 - Install SAP-Specific Packages

```bash
sudo dnf install -y tuned-profiles-sap-hana resource-agents-sap-hana
# For RHEL System Roles for SAP:
sudo dnf install -y rhel-system-roles-sap
```

## Step 3 - Apply SAP Tuning Profile

```bash
sudo tuned-adm profile sap-hana
```

This configures kernel parameters, memory settings, and I/O schedulers as recommended by SAP.

## Step 4 - Configure Kernel Parameters

Verify the critical settings in `/etc/sysctl.conf`:

```text
vm.swappiness = 10
vm.dirty_ratio = 10
vm.dirty_background_ratio = 3
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 8192
```

Apply:

```bash
sudo sysctl -p
```

## Step 5 - Set Up High Availability (If Required)

Install the HA add-on:

```bash
sudo dnf install -y pacemaker pcs fence-agents-all
sudo systemctl enable --now pcsd
sudo passwd hacluster
```

Configure the cluster with pcs commands following the SAP-specific resource agent documentation.

## Step 6 - Validate the Configuration

Use the SAP HANA Hardware Configuration Check Tool (HWCCT) or the RHEL System Roles validation tasks to confirm your system meets SAP requirements.

## Summary

You have learned how to configure a cost-optimized sap s/4hana ha cluster. SAP workloads on RHEL require careful preparation, but RHEL System Roles and tuned profiles automate much of the configuration.
