# How to Build Immutable RHEL Edge Images with Image Builder

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Image Builder, Edge, Immutable

Description: Build immutable RHEL Edge images with Image Builder for secure deployments.

---

## Overview

Build immutable RHEL Edge images with Image Builder for secure deployments. RHEL for Edge provides an immutable, atomic operating system designed for edge computing, IoT, and remote deployments.

## Prerequisites

- A RHEL 9 system for building edge images (with Image Builder; minimum 2 CPU cores, 4 GiB RAM, and 20 GiB disk space)
- Root or sudo access
- For MicroShift: a system with at least 2 CPU cores and 2 GB RAM

## Step 1 - Understand the Edge Architecture

RHEL for Edge uses rpm-ostree to deliver immutable OS images:

- The OS is deployed as a single atomic unit
- Updates are applied as new image versions
- Rollback is automatic if a health check fails (Greenboot)
- Applications run in containers on Podman or MicroShift (Kubernetes)

## Step 2 - Build an Edge Image

Using Image Builder, create an edge commit:

```bash
composer-cli compose start my-edge-blueprint edge-commit
```

For an installer image:

```bash
composer-cli compose start-ostree --ref rhel/9/x86_64/edge --url http://10.0.2.2:8080/repo my-edge-installer-blueprint edge-installer
```

## Step 3 - Deploy to Edge Devices

Write the installer to a USB drive or serve it over the network:

```bash
sudo dd if=<UUID>-boot.iso of=/dev/sdX bs=4M status=progress
```

## Step 4 - Configure Automatic Updates

RHEL for Edge supports automatic OS updates with `rpm-ostreed-automatic`; Greenboot health checks validate the booted deployment and can roll back after repeated failures:

```bash
# In /etc/rpm-ostreed.conf, set AutomaticUpdatePolicy=stage
sudo systemctl enable rpm-ostreed-automatic.timer --now

# Required Greenboot scripts go in /etc/greenboot/check/required.d/
# If required checks keep failing, Greenboot rolls back to the previous deployment
```

## Step 5 - Deploy Workloads

For container workloads, use Podman:

```bash
podman run -d --name myapp registry.example.com/myapp:latest
```

For Kubernetes workloads, install MicroShift after enabling the required MicroShift repositories and configuring the pull secret:

```bash
sudo dnf install -y microshift
sudo systemctl enable --now microshift
```

## Summary

You have learned how to build immutable rhel edge images with image builder. RHEL for Edge with rpm-ostree and MicroShift provides a robust platform for running workloads in remote and resource-constrained environments.
