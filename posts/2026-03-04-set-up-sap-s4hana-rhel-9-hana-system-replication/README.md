# How to Set Up SAP S/4HANA on RHEL 9 with HANA System Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP S/4HANA, System Replication, SAP

Description: Set up SAP S/4HANA on RHEL 9 with HANA System Replication.

---

## Overview

Set up SAP S/4HANA on RHEL 9 with HANA System Replication. Running SAP on RHEL 9 requires specific system preparation, kernel tuning, and high-availability configuration.

## Prerequisites

- RHEL 9 with the SAP Solutions subscription
- Systems meeting SAP HANA hardware and RHEL 9 operating system requirements (see SAP Notes 3108316 and 3108302)
- Root or sudo access
- For HA clusters: at least two RHEL 9 nodes with the HA add-on

## Step 1 - Register and Enable SAP Repositories

```bash
RHEL_MINOR="9.4" # Replace with your SAP-supported RHEL 9 E4S minor release.
sudo subscription-manager release --set="$RHEL_MINOR"
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

sudo dnf install -y ansible-core rhel-system-roles-sap rhel-system-roles
```

## Step 3 - Apply SAP Tuning Profile

```bash
sudo tuned-adm profile sap-hana
```

This configures kernel parameters, memory settings, and I/O schedulers as recommended by SAP.

## Step 4 - Configure Kernel Parameters

Verify relevant settings with `sysctl`; if you manage them manually, prefer a dedicated file such as `/etc/sysctl.d/99-sap-hana.conf`:

```text
vm.swappiness = 10
vm.dirty_ratio = 10
vm.dirty_background_ratio = 3
net.core.somaxconn = 4096
net.ipv4.tcp_max_syn_backlog = 8192
```

Apply:

```bash
sudo sysctl --system
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

Use the SAP HANA hardware and cloud measurement tool (HCMT) or the RHEL System Roles validation tasks to confirm your system meets SAP requirements.

## Summary

You have learned how to set up sap s/4hana with hana system replication. SAP workloads on RHEL 9 require careful preparation, but RHEL System Roles and tuned profiles automate much of the configuration.
