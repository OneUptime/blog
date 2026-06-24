# How to  Calico on OpenStack Upgrades - Avoid

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Kubernetes, Networking, Upgrade

Description: Avoid OpenStack-specific Calico upgrade mistakes including Neutron ML2 driver incompatibilities and etcd cluster conflicts.

---

## Introduction

OpenStack-specific Calico upgrade mistakes often involve networking-calico compatibility, etcd cluster management, and compute node agent updates being missed. The most dangerous mistake is upgrading Kubernetes-facing Calico components without coordinating the OpenStack Calico packages, especially the calico-felix agents on compute nodes, leaving the two sides out of sync.

## Prerequisites

- Calico installed in OpenStack with networking-calico as the Neutron core plugin or ML2 mechanism driver
- Access to OpenStack control plane and compute nodes
- Ansible for compute node management
- kubectl and oc (if also running OpenShift on OpenStack)

## Key Steps

```bash
# WRONG - upgrading Kubernetes Calico without upgrading OpenStack packages

kubectl apply --server-side --force-conflicts -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/v1_crd_projectcalico_org.yaml
kubectl apply --server-side --force-conflicts -f https://raw.githubusercontent.com/projectcalico/calico/v3.32.0/manifests/tigera-operator.yaml
# calico-felix and networking-calico packages on OpenStack nodes still on old version = mismatch risk!

# CORRECT - coordinate both upgrades
# 1. Upgrade Kubernetes Calico
# 2. Upgrade OpenStack Calico packages on compute and control nodes
# 3. Verify both layers before closing the maintenance window

# WRONG - not checking OpenStack Calico upgrade guidance
# CORRECT - always verify:
# https://docs.tigera.io/calico/latest/operations/upgrading/openstack-upgrade
# https://docs.tigera.io/calico/latest/networking/openstack/configuration
# Check that the new Calico version and networking-calico deployment model are supported
```

## Conclusion

The most dangerous OpenStack Calico upgrade mistake is upgrading the Kubernetes components without coordinating the OpenStack Calico packages, creating a version mismatch that can break the OpenStack-Kubernetes networking boundary. Always coordinate both upgrades within the same maintenance window and verify the OpenStack Calico upgrade guidance before every upgrade.
