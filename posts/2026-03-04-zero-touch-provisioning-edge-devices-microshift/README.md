# How to Set Up Zero-Touch Provisioning for Edge Devices with MicroShift

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MicroShift, Zero-Touch, Edge

Description: Set up zero-touch provisioning for edge devices running MicroShift on RHEL 9.

---

## Overview

Set up zero-touch provisioning for edge devices running MicroShift on RHEL 9.6. RHEL for Edge provides an immutable, atomic operating system designed for edge computing, IoT, and remote deployments.

## Prerequisites

- A RHEL 9.6 system for building edge images (with Image Builder)
- Root or sudo access
- For MicroShift: a system with at least 2 CPU cores and 2 GB RAM
- An active MicroShift subscription, access to the required RHEL 9.6 and OpenShift RPM repositories, and a Red Hat pull secret
- For zero-touch installation: a Kickstart file that automates the RHEL installation and MicroShift setup

## Step 1 - Understand the Edge Architecture

RHEL for Edge uses rpm-ostree to deliver immutable OS images:

- The OS is deployed as a single atomic unit
- Updates are applied as new image versions
- Rollback is automatic if required Greenboot health checks keep failing and a previous deployment is available
- Applications run in containers on Podman or MicroShift (Kubernetes)

## Step 2 - Build an Edge Image

Using Image Builder, create an edge commit:

```bash
composer-cli compose start my-edge-blueprint edge-commit
```

For an installer image:

```bash
composer-cli compose start-ostree \
  --ref rhel/9/x86_64/edge \
  --url http://10.0.2.2:8080/repo/ \
  my-edge-blueprint edge-installer
```

## Step 3 - Deploy to Edge Devices

Write the downloaded installer ISO to a USB drive or serve it over the network with a Kickstart file for unattended provisioning:

```bash
sudo dd if=UUID-boot.iso of=/dev/sdX bs=4M status=progress
```

## Step 4 - Configure Automatic Updates

RHEL for Edge supports automatic OS updates with rpm-ostreed and Greenboot health checks:

```bash
# In /etc/rpm-ostreed.conf, set AutomaticUpdatePolicy=stage
sudo systemctl reload rpm-ostreed
sudo systemctl enable --now rpm-ostreed-automatic.timer

# Greenboot scripts in /etc/greenboot/check/required.d/

# If required scripts keep failing after retries, Greenboot rolls back when a previous deployment is available
```

## Step 5 - Deploy Workloads

For container workloads, use Podman:

```bash
podman run -d --name myapp registry.example.com/myapp:latest
```

For Kubernetes workloads, install MicroShift:

```bash
sudo subscription-manager repos \
  --enable rhocp-4.20-for-rhel-9-$(uname -m)-rpms \
  --enable fast-datapath-for-rhel-9-$(uname -m)-rpms
sudo subscription-manager repos \
  --enable rhel-9-for-$(uname -m)-appstream-eus-rpms \
  --enable rhel-9-for-$(uname -m)-baseos-eus-rpms
sudo subscription-manager release --set=9.6
sudo dnf install -y microshift
sudo cp $HOME/openshift-pull-secret /etc/crio/openshift-pull-secret
sudo chown root:root /etc/crio/openshift-pull-secret
sudo chmod 600 /etc/crio/openshift-pull-secret
if sudo systemctl is-active --quiet firewalld; then
  sudo firewall-cmd --permanent --zone=trusted --add-source=10.42.0.0/16
  sudo firewall-cmd --permanent --zone=trusted --add-source=169.254.169.1
  sudo firewall-cmd --reload
fi
sudo systemctl enable --now microshift
```

## Summary

You have learned how to set up zero-touch provisioning for edge devices with microshift. RHEL for Edge with rpm-ostree and MicroShift provides a robust platform for running workloads in remote and resource-constrained environments.
