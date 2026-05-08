# How to  Calico on OpenStack Upgrades - Validate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Kubernetes, Networking, Upgrade

Description: Validate Calico upgrades on OpenStack by verifying Neutron integration, VM network connectivity, and floating IP functionality post-upgrade.

---

## Introduction

Validating Calico upgrades on OpenStack requires testing both Kubernetes pod networking and OpenStack VM networking. A successful upgrade means both layers work correctly and the integration between them (floating IPs when Calico is configured as the Neutron core plugin, OpenStack security groups, and any Calico policies) functions as expected.

The validation must confirm: all calico-felix agents on compute nodes are updated, the Neutron Calico integration is compatible with the new Calico version, OpenStack VMs can communicate, and Kubernetes pods can communicate.

## Prerequisites

- Calico installed in OpenStack as the Neutron core plugin (`core_plugin = calico`) when validating floating IPs, or as the Calico ML2 mechanism driver when floating IPs are not required
- Access to OpenStack control plane and compute nodes
- Ansible for compute node management
- kubectl and oc (if also running OpenShift on OpenStack)

## Key Steps

```bash
# Standard Kubernetes validation

kubectl get tigerastatus
kubectl get pods -n calico-system

# OpenStack-specific validation
echo "Checking Felix on compute nodes..."
ansible compute_nodes -m command -a 'calico-felix --version'

echo "Testing VM connectivity..."
openstack server list | head -5
# SSH to a VM and test connectivity

echo "Testing floating IP routing..."
openstack floating ip list | head -5
```

## Conclusion

Validating OpenStack Calico upgrades requires running both standard Kubernetes validation (TigeraStatus, pod connectivity) and OpenStack-specific validation (Felix version checks, VM connectivity, floating IP routing when Calico is configured as the Neutron core plugin). Only declare the upgrade successful when both layers pass their respective validations.
