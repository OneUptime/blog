# How to Build and Deploy Air-Gapped RHEL Edge Systems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Air-Gapped, Edge, Offline

Description: Build and deploy RHEL Edge systems in air-gapped environments.

---

## Overview

Build and deploy RHEL Edge systems in air-gapped environments. RHEL for Edge provides an immutable, atomic operating system designed for edge computing, IoT, and remote deployments.

## Prerequisites

- A RHEL system for building edge images (with Image Builder)
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
composer-cli compose start my-edge-blueprint edge-installer
```

## Step 3 - Deploy to Edge Devices

Write the installer to a USB drive or serve it over the network:

```bash
sudo dd if=edge-installer.iso of=/dev/sdX bs=4M status=progress
```

## Step 4 - Configure Automatic Updates

RHEL for Edge supports automatic OS updates with Greenboot health checks:

```bash
# Greenboot scripts in /etc/greenboot/check/required.d/
# If any script fails, the system rolls back to the previous version
```

## Step 5 - Deploy Workloads

For container workloads, use Podman:

```bash
podman run -d --name myapp registry.example.com/myapp:latest
```

For Kubernetes workloads, install MicroShift:

```bash
sudo dnf install -y microshift
sudo systemctl enable --now microshift
```

## Summary

You have learned how to build and deploy air-gapped rhel edge systems. RHEL for Edge with rpm-ostree and MicroShift provides a robust platform for running workloads in remote and resource-constrained environments.
