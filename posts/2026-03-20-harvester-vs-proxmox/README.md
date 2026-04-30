# Harvester vs Proxmox: HCI Platform Comparison

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Harvester, Proxmox, HCI, Hyperconverged, Comparison, Virtualization

Description: A comprehensive comparison of SUSE Harvester and Proxmox VE for hyperconverged infrastructure, covering virtualization, Kubernetes integration, and operational management.

## Overview

Hyperconverged Infrastructure (HCI) platforms combine compute, storage, and networking into a single software-defined platform. SUSE Harvester and Proxmox VE are both popular HCI platforms, but they approach the problem differently. Harvester is built on Kubernetes and designed for cloud-native workloads alongside traditional VMs. Proxmox is a mature, KVM-based virtualization platform with a simpler operational model. This guide compares them to help you choose the right HCI platform.

## What Is Harvester?

Harvester is an open-source HCI platform from SUSE built on Kubernetes (RKE2), KubeVirt, and Longhorn. It provides VM management and storage in a single platform, and integrates closely with Rancher for unified virtualization and Kubernetes management. Harvester can be managed by Rancher, making it a natural fit for organizations already using the SUSE stack.

## What Is Proxmox VE?

Proxmox Virtual Environment (VE) is an open-source server virtualization platform based on KVM and LXC. It is developed by Proxmox Server Solutions GmbH and provides VM management, container (LXC) management, clustered storage, and a web-based management interface. Proxmox is widely used in small to medium enterprises and home labs.

## Feature Comparison

| Feature | Harvester | Proxmox VE |
|---|---|---|
| Virtualization | KVM (via KubeVirt) | KVM |
| Container Support | Kubernetes integration via Rancher; direct workloads on Harvester are experimental | LXC containers |
| Storage | Longhorn (distributed) | Ceph, ZFS, LVM, NFS |
| Management UI | Web (Kubernetes-native) | Web (traditional) |
| API | Kubernetes API | REST API |
| Rancher Integration | Native | No |
| High Availability | Yes (Kubernetes native) | Yes (Corosync + Proxmox HA Manager) |
| Live Migration | Yes | Yes |
| Snapshots | Yes (Longhorn) | Yes |
| Backup/Restore | Yes | Yes (via Proxmox Backup Server) |
| VLAN Support | Yes | Yes |
| GPU Passthrough | Yes | Yes |
| License | Apache 2.0 | AGPLv3; optional enterprise subscription |
| Maturity | Newer (v1.0, 2022) | Mature (2008+) |
| Target Audience | Cloud-native / DevOps | Traditional IT / SMB |

## Architecture

### Harvester Architecture

Harvester is built entirely on Kubernetes:

```text
┌─────────────────────────────────────┐
│         Harvester Node               │
│  ┌─────────────────────────────┐    │
│  │  RKE2 (Kubernetes)           │    │
│  │  ┌──────────┐ ┌──────────┐  │    │
│  │  │ KubeVirt │ │ Longhorn │  │    │
│  │  │  (VMs)   │ │(Storage) │  │    │
│  │  └──────────┘ └──────────┘  │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

All VMs are Kubernetes resources (VirtualMachine CRDs), which means they can be managed with standard Kubernetes tools.

### Proxmox Architecture

Proxmox uses a traditional KVM + QEMU stack with Corosync for cluster communication:

```text
Proxmox Node 1 ──── Corosync ──── Proxmox Node 2
     |                                   |
    KVM/QEMU                         KVM/QEMU
     |                                   |
    Ceph / NFS / other shared storage
```

## VM Management

### Harvester (KubeVirt)

```yaml
# Create a VM using Kubernetes API

apiVersion: kubevirt.io/v1
kind: VirtualMachine
metadata:
  name: ubuntu-vm
  namespace: default
spec:
  running: true
  template:
    spec:
      domain:
        cpu:
          cores: 2
        memory:
          guest: 4Gi
        devices:
          disks:
            - name: rootdisk
              disk:
                bus: virtio
      volumes:
        - name: rootdisk
          dataVolume:
            name: ubuntu-rootdisk
```

### Proxmox (via API or UI)

```bash
# Create a VM via Proxmox API
curl -X POST https://proxmox:8006/api2/json/nodes/pve/qemu \
  -H "Authorization: PVEAPIToken=user@pam!mytoken=..." \
  -d 'vmid=100&name=ubuntu-vm&memory=4096&cores=2&scsihw=virtio-scsi-pci'
```

## Kubernetes Workloads

Harvester is built on an underlying RKE2 cluster, but running general container workloads directly on the Harvester cluster is an experimental Rancher-integrated feature. A common pattern is to provision Kubernetes clusters on Harvester VMs through Rancher.

Proxmox does not include native Kubernetes support. To run containers on Proxmox, you either use LXC containers (not Kubernetes) or deploy Kubernetes VMs on top of Proxmox (adding a layer of complexity).

## Rancher Integration

Harvester integrates directly with Rancher. You can provision RKE2 Kubernetes clusters on Harvester VMs directly from the Rancher UI, creating a unified cloud-native stack.

Proxmox does not integrate with Rancher. You can manually deploy Rancher on top of Proxmox-hosted VMs, but there is no native integration.

## When to Choose Harvester

- You are building a cloud-native infrastructure with Kubernetes at the core
- Rancher management is a priority
- You want unified VM and Kubernetes management through Rancher
- Your team is Kubernetes-native

## When to Choose Proxmox

- You need a mature, battle-tested virtualization platform
- Your team manages traditional virtual machines without Kubernetes
- Advanced storage options (ZFS, Ceph) with fine-grained configuration are needed
- Proxmox Backup Server integration is valuable
- Home lab or SMB environments

## Conclusion

Harvester and Proxmox serve different infrastructure philosophies. Harvester is the right choice for cloud-native organizations that want to unify VM and Kubernetes management on a Kubernetes-native platform, especially when used with Rancher. Proxmox is the right choice for organizations that need a proven, stable VM management platform with broad storage options and a simpler operational model. For organizations migrating from VMware ESXi, both are viable alternatives - Harvester for cloud-native transformation and Proxmox for a like-for-like VM replacement.
