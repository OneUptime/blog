# How to Configure a High-Availability SAP HANA Cluster with RHEL HA Add-On

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, SAP HANA, High Availability, Pacemaker

Description: Configure a high-availability SAP HANA cluster using the RHEL HA Add-On.

---

## Overview

Configure a high-availability SAP HANA cluster using the RHEL HA Add-On. Running SAP on RHEL requires specific system preparation, kernel tuning, and high-availability configuration.

## Prerequisites

- RHEL with the SAP Solutions subscription
- Systems meeting SAP hardware requirements (see SAP Note 2772999)
- Root or sudo access
- For HA clusters: at least two RHEL nodes with the HA add-on

## Step 1 - Register and Enable SAP Repositories

Replace `9.0` with the supported RHEL 9 minor release for your SAP HANA deployment:

```bash
sudo subscription-manager release --set=9.0
sudo subscription-manager repos \
  --enable=rhel-9-for-$(uname -m)-baseos-e4s-rpms \
  --enable=rhel-9-for-$(uname -m)-appstream-e4s-rpms \
  --enable=rhel-9-for-$(uname -m)-sap-solutions-e4s-rpms \
  --enable=rhel-9-for-$(uname -m)-sap-netweaver-e4s-rpms \
  --enable=rhel-9-for-$(uname -m)-highavailability-e4s-rpms
```

## Step 2 - Install SAP-Specific Packages

```bash
sudo dnf install -y tuned-profiles-sap-hana resource-agents-sap-hana
# For RHEL System Roles for SAP:

sudo dnf install -y ansible-core rhel-system-roles-sap
```

## Step 3 - Apply SAP Tuning Profile

```bash
sudo tuned-adm profile sap-hana
```

This configures kernel parameters, memory settings, and I/O schedulers as recommended by SAP.

## Step 4 - Configure Kernel Parameters

Use the RHEL System Roles for SAP, such as `sap_general_preconfigure` and `sap_hana_preconfigure`, to apply the supported kernel, network, and package settings for your RHEL and SAP HANA versions. If you manage settings manually, verify the resulting values with the current SAP notes and Red Hat documentation instead of copying fixed values into `/etc/sysctl.conf`.

Do not override settings already managed by `tuned` or RHEL System Roles unless SAP or Red Hat support directs you to do so.

## Step 5 - Set Up High Availability (If Required)

Install the HA add-on:

```bash
sudo dnf install -y pacemaker pcs fence-agents-all
sudo systemctl enable --now pcsd
sudo passwd hacluster
```

Configure the cluster with pcs commands following the SAP-specific resource agent documentation.

## Step 6 - Validate the Configuration

Use the SAP HANA Hardware and Cloud Measurement Tools (HCMT) or the RHEL System Roles validation tasks to confirm your system meets SAP requirements.

## Summary

You have learned how to configure a high-availability sap hana cluster with rhel ha add-on. SAP workloads on RHEL require careful preparation, but RHEL System Roles and tuned profiles automate much of the configuration.
