# How to Set Up a RHEL Edge Gateway for Industrial IoT Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Edge Gateway, Industrial IoT, Linux

Description: Set up a RHEL edge gateway for industrial IoT applications.

---

## Overview

Set up a RHEL edge gateway for industrial IoT applications. RHEL for Edge provides an immutable, atomic operating system designed for edge computing, IoT, and remote deployments.

## Prerequisites

- A RHEL 9 system for building edge images (with Image Builder)
- Root or sudo access
- For MicroShift: a system with at least 2 CPU cores and 2 GB RAM

## Step 1 - Understand the Edge Architecture

RHEL for Edge uses rpm-ostree to deliver immutable OS images:

- The OS is deployed as a single atomic unit
- Updates are applied as new image versions
- Rollback can be automatic if a health check fails after retries and a previous deployment is available (Greenboot)
- Applications run in containers on Podman or MicroShift (Kubernetes)

## Step 2 - Build an Edge Image

Using Image Builder, create an edge commit:

```bash
composer-cli compose start my-edge-blueprint edge-commit
```

For an installer image:

```bash
composer-cli compose start-ostree --ref rhel/9/x86_64/edge --url http://edge-repo.example.com/repo my-edge-blueprint edge-installer
```

## Step 3 - Deploy to Edge Devices

Write the installer to a USB drive or serve it over the network:

```bash
sudo dd if=<UUID>-boot.iso of=/dev/sdX bs=4M status=progress
```

## Step 4 - Configure Health Checks for Updates

RHEL for Edge supports update validation with Greenboot health checks:

```bash
# Greenboot scripts in /etc/greenboot/check/required.d/

# If required checks keep failing after retries, the system rolls back if a previous deployment is available
```

## Step 5 - Deploy Workloads

For container workloads, use Podman:

```bash
podman run -d --name myapp registry.example.com/myapp:latest
```

For Kubernetes workloads, install MicroShift:

```bash
sudo subscription-manager repos \
  --enable rhocp-4.19-for-rhel-9-$(uname -m)-rpms \
  --enable fast-datapath-for-rhel-9-$(uname -m)-rpms
sudo subscription-manager release --set=9.6
sudo dnf install -y microshift
sudo cp $HOME/openshift-pull-secret /etc/crio/openshift-pull-secret
sudo chown root:root /etc/crio/openshift-pull-secret
sudo chmod 600 /etc/crio/openshift-pull-secret
sudo systemctl enable --now microshift
```

## Summary

You have learned how to set up a rhel edge gateway for industrial iot applications. RHEL for Edge with rpm-ostree and MicroShift provides a robust platform for running workloads in remote and resource-constrained environments.
