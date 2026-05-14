# How to  Calico on OpenStack Upgrades - Avoid

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Kubernetes, Networking, Upgrade

Description: Avoid OpenStack-specific Calico upgrade mistakes including Neutron ML2 driver incompatibilities and etcd cluster conflicts.

---

## Introduction

OpenStack-specific Calico upgrade mistakes often involve the Neutron ML2 plugin compatibility, etcd cluster management, and compute node agent updates being missed. The most dangerous mistake is upgrading Kubernetes-facing Calico components without simultaneously upgrading the OpenStack-facing calico-felix agents, leaving the two sides out of sync.

## Prerequisites

- Calico installed in OpenStack with Neutron ML2 calico plugin
- Access to OpenStack control plane and compute nodes
- Ansible for compute node management
- kubectl and oc (if also running OpenShift on OpenStack)

## Key Steps

```bash
# WRONG - upgrading Kubernetes Calico without upgrading OpenStack agents

kubectl apply -f https://raw.githubusercontent.com/projectcalico/calico/v3.28.0/manifests/tigera-operator.yaml
# calico-felix on compute nodes still on old version = version mismatch = breakage!

# CORRECT - coordinate both upgrades
# 1. Upgrade Kubernetes Calico
# 2. Immediately upgrade calico-felix (and networking-calico) on compute nodes
# 3. Verify both layers before closing the maintenance window

# WRONG - not checking the networking-calico compatibility matrix
# CORRECT - always verify:
# https://docs.tigera.io/calico/latest/getting-started/openstack/
# Check that the new Calico version is compatible with your networking-calico (Neutron ML2) plugin version
```

## Conclusion

The most dangerous OpenStack Calico upgrade mistake is upgrading the Kubernetes components without simultaneously upgrading the OpenStack compute node agents, creating a version mismatch that breaks the OpenStack-Kubernetes networking boundary. Always coordinate both upgrades within the same maintenance window and verify the Neutron ML2 calico plugin compatibility matrix before every upgrade.
