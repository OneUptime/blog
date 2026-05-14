# How to Tune RHEL 9 Kernel Parameters for SAP HANA Performance

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP HANA, Kernel Tuning, Performance

Description: Tune RHEL 9 kernel parameters for optimal SAP HANA performance.

---

## Overview

Tune RHEL 9 kernel parameters for optimal SAP HANA performance. Running SAP on RHEL 9 requires specific system preparation, kernel tuning, and high-availability configuration.

## Prerequisites

- RHEL 9 with the SAP Solutions subscription
- Systems meeting SAP hardware requirements (see SAP Note 2772999)
- Root or sudo access
- For HA clusters: at least two RHEL 9 nodes with the HA add-on

## Step 1 - Register and Enable SAP Repositories

Replace `9.0` with the SAP-supported RHEL 9 E4S minor release you are standardizing on:

```bash
sudo subscription-manager release --set=9.0
sudo subscription-manager repos \
  --disable="*" \
  --enable="rhel-9-for-$(uname -m)-baseos-e4s-rpms" \
  --enable="rhel-9-for-$(uname -m)-appstream-e4s-rpms" \
  --enable="rhel-9-for-$(uname -m)-sap-solutions-e4s-rpms" \
  --enable="rhel-9-for-$(uname -m)-sap-netweaver-e4s-rpms"
# For HA clusters, also enable:
sudo subscription-manager repos --enable="rhel-9-for-$(uname -m)-highavailability-e4s-rpms"
```

## Step 2 - Install SAP-Specific Packages

```bash
sudo dnf install -y tuned-profiles-sap-hana resource-agents-sap-hana
# For RHEL System Roles for SAP:

sudo dnf install -y rhel-system-roles-sap
```

## Step 3 - Apply SAP Tuning Profile

```bash
sudo systemctl enable --now tuned
sudo tuned-adm profile sap-hana
```

This configures kernel parameters, memory settings, and I/O schedulers as recommended by SAP.

## Step 4 - Configure Kernel Parameters

Verify the critical settings. If you maintain local overrides, place them in a file such as `/etc/sysctl.d/99-sap-hana.conf`:

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

Use the SAP HANA hardware and cloud measurement tools or the RHEL System Roles validation tasks to confirm your system meets SAP requirements.

## Summary

You have learned how to tune rhel 9 kernel parameters for sap hana performance. SAP workloads on RHEL 9 require careful preparation, but RHEL System Roles and tuned profiles automate much of the configuration.
