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

For an installer image that embeds an OSTree commit:

```bash
composer-cli compose start-ostree --ref rhel/9/x86_64/edge --url http://localhost:8080/repo my-edge-blueprint edge-installer
```

## Step 3 - Deploy to Edge Devices

Write the installer to a USB drive or serve it over the network:

```bash
sudo dd if=edge-installer.iso of=/dev/sdX bs=4M status=progress
```

## Step 4 - Configure Update Rollbacks

RHEL for Edge supports update rollback with Greenboot health checks:

```bash
# Greenboot scripts in /etc/greenboot/check/required.d/

# If required checks keep failing after retry attempts,
# Greenboot rolls back to the previous rpm-ostree deployment
```

## Step 5 - Deploy Workloads

For container workloads, use Podman:

```bash
podman run -d --name myapp registry.example.com/myapp:latest
```

For Kubernetes workloads in an air-gapped RHEL for Edge image, add MicroShift and its generated container image references to the Image Builder blueprint:

```toml
[[packages]]
name = "microshift"
version = "*"

[customizations.services]
enabled = ["microshift"]

[[containers]]
source = "<microshift_image_pullspec_with_digest>"
```

## Summary

You have learned how to build and deploy air-gapped rhel edge systems. RHEL for Edge with rpm-ostree and MicroShift provides a robust platform for running workloads in remote and resource-constrained environments.
