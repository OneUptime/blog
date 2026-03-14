# How to  Calico on OpenStack Upgrades - Setup

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Kubernetes, Networking, Upgrade

Description: Step-by-step guide to upgrading Calico on OpenStack deployments, handling Neutron ML2 driver compatibility and Calico's OpenStack networking agent updates.

---

## Introduction

Upgrading Calico on OpenStack requires coordination between Calico's Kubernetes-facing components and the OpenStack Neutron ML2 plugin (networking-calico). Unlike pure Kubernetes deployments, OpenStack Calico deployments run a calico-felix agent on each OpenStack compute node alongside the standard Kubernetes networking components.

The upgrade process must handle two layers: the Kubernetes-facing Calico components (calico-node DaemonSet, kube-controllers) and the OpenStack networking agent (calico-felix or networking-calico). Both must be upgraded in a coordinated manner to avoid network disruption to OpenStack VMs.

This guide covers the specific upgrade steps for Calico in an OpenStack environment, including Neutron ML2 driver compatibility verification and compute node agent updates.

## Prerequisites

- Calico installed in OpenStack with Neutron ML2 calico plugin
- Access to OpenStack control plane and compute nodes
- Ansible for compute node management
- kubectl and oc (if also running OpenShift on OpenStack)

## Key Steps

```bash
# 1. Check Neutron ML2 plugin version compatibility
neutron-db-manage --config-file /etc/neutron/neutron.conf   --config-file /etc/neutron/plugins/ml2/ml2_conf.ini   current

# 2. Check all calico-felix agents on compute nodes
openstack network agent list | grep calico

# 3. Upgrade Kubernetes-facing Calico (standard operator upgrade)
kubectl patch installation default --type=merge   -p '{"spec":{"version":"v3.28.0"}}'

# 4. Upgrade calico-felix on compute nodes (via Ansible)
ansible compute_nodes -m package -a "name=calico-felix state=latest"

# 5. Restart calico-felix agents
ansible compute_nodes -m service -a "name=calico-felix state=restarted"
```

## Conclusion

Upgrading Calico on OpenStack requires a two-phase approach: standard Kubernetes operator upgrade for the Calico Kubernetes components, followed by Ansible-managed agent upgrades for calico-felix on OpenStack compute nodes. Coordinate both phases within the same maintenance window to avoid running mixed versions across the OpenStack-Kubernetes boundary.
