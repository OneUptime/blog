# How to Configure Multus Networking for MicroShift on RHEL Edge Devices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, MicroShift, Multus, Networking

Description: Configure Multus networking for MicroShift on RHEL edge devices.

---

## Overview

Configure Multus networking for MicroShift on RHEL edge devices. RHEL for Edge provides an immutable, atomic operating system designed for edge computing, IoT, and remote deployments.

## Prerequisites

- A RHEL 9 system for building edge images (with Image Builder)
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
composer-cli compose start-ostree --ref rhel/9/x86_64/edge --url http://example.com/repo my-edge-blueprint edge-installer
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

Install the MicroShift Multus RPM and restart the host so existing pods are recreated with Multus annotations:

```bash
sudo dnf install -y microshift-multus
sudo systemctl reboot
```

After the system restarts, verify that Multus is running:

```bash
oc get pods -n openshift-multus
```

Create a `NetworkAttachmentDefinition` for a bridge secondary network:

```yaml
apiVersion: "k8s.cni.cncf.io/v1"
kind: NetworkAttachmentDefinition
metadata:
  name: bridge-conf
spec:
  config: '{
      "cniVersion": "0.4.0",
      "type": "bridge",
      "bridge": "br-test",
      "mode": "bridge",
      "ipam": {
        "type": "host-local",
        "ranges": [
          [
            {
              "subnet": "10.10.0.0/24",
              "rangeStart": "10.10.0.20",
              "rangeEnd": "10.10.0.50",
              "gateway": "10.10.0.254"
            }
          ]
        ],
        "dataDir": "/var/lib/cni/br-test"
      }
    }'
```

Apply the definition:

```bash
oc apply -f network-attachment-definition.yaml
```

Attach a pod to the secondary network with the Multus annotation:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: test-bridge
  annotations:
    k8s.v1.cni.cncf.io/networks: bridge-conf
spec:
  containers:
  - name: hello-microshift
    image: quay.io/microshift/busybox:1.36
    command: ["/bin/sh"]
    args: ["-c", "while true; do sleep 3600; done"]
```

## Summary

You have learned how to configure Multus networking for MicroShift edge devices. RHEL for Edge with rpm-ostree and MicroShift provides a robust platform for running workloads in remote and resource-constrained environments.
