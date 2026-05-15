# How to Automate SAP System Preparation on RHEL 9 with Ansible System Roles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP, Ansible, System Roles

Description: Automate SAP system preparation on RHEL 9 using Ansible System Roles.

---

## Overview

Automate SAP system preparation on RHEL 9 using Ansible System Roles. Running SAP on RHEL 9 requires specific system preparation, kernel tuning, and high-availability configuration.

## Prerequisites

- RHEL 9 with the SAP Solutions subscription
- Systems meeting SAP hardware requirements (see SAP Note 2772999)
- Root or sudo access
- For HA clusters: at least two RHEL 9 nodes with the HA add-on

## Step 1 - Register and Enable SAP Repositories

```bash
sudo subscription-manager release --set=9.6
sudo subscription-manager repos \
  --disable="*" \
  --enable="rhel-9-for-$(uname -m)-baseos-e4s-rpms" \
  --enable="rhel-9-for-$(uname -m)-appstream-e4s-rpms" \
  --enable="rhel-9-for-$(uname -m)-sap-solutions-e4s-rpms" \
  --enable="rhel-9-for-$(uname -m)-sap-netweaver-e4s-rpms"
```

## Step 2 - Install SAP-Specific Packages

```bash
sudo dnf install -y ansible-core tuned-profiles-sap-hana
# For RHEL System Roles for SAP:

sudo dnf install -y rhel-system-roles-sap rhel-system-roles
```

## Step 3 - Apply SAP Tuning Profile

```bash
sudo tuned-adm profile sap-hana
```

This configures kernel parameters, memory settings, and I/O schedulers as recommended by SAP.

## Step 4 - Configure Kernel Parameters

RHEL System Roles for SAP manages the required sysctl configuration. If you configure manually, verify SAP-related settings under `/etc/sysctl.d/`, such as `/etc/sysctl.d/sap.conf`:

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
sudo subscription-manager repos --enable="rhel-9-for-$(uname -m)-highavailability-e4s-rpms"
sudo dnf install -y pacemaker pcs fence-agents-all sap-hana-ha
sudo systemctl enable --now pcsd
sudo passwd hacluster
```

Configure the cluster with pcs commands following the SAP-specific resource agent documentation.

## Step 6 - Validate the Configuration

Use SAP HANA Hardware and Cloud Measurement Tools (HCMT) or the RHEL System Roles validation tasks to confirm your system meets SAP requirements.

## Summary

You have learned how to automate sap system preparation with ansible system roles. SAP workloads on RHEL 9 require careful preparation, but RHEL System Roles and tuned profiles automate much of the configuration.
