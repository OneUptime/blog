# How to  Calico on OpenStack Upgrades - Validate

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Kubernetes, Networking, Upgrade

Description: Validate Calico upgrades on OpenStack by verifying Neutron integration, VM network connectivity, and floating IP functionality post-upgrade.

---

## Introduction

Validating Calico upgrades on OpenStack requires testing both Kubernetes pod networking and OpenStack VM networking. A successful upgrade means both layers work correctly and the integration between them (floating IPs, security groups via Calico policies) functions as expected.

The validation must confirm: all calico-felix agents on compute nodes are updated, Neutron ML2 plugin is compatible with the new Calico version, OpenStack VMs can communicate, and Kubernetes pods can communicate.

## Prerequisites

- Calico installed in OpenStack with Neutron ML2 calico plugin
- Access to OpenStack control plane and compute nodes
- Ansible for compute node management
- kubectl and oc (if also running OpenShift on OpenStack)

## Key Steps

```bash
# Standard Kubernetes validation
kubectl get tigerastatus
kubectl get pods -n calico-system

# OpenStack-specific validation
echo "Checking Neutron calico agents..."
openstack network agent list --agent-type calico |   awk '{if($8!="True") print "FAIL: Agent " $4 " is down"}'

echo "Testing VM connectivity..."
openstack server list | head -5
# SSH to a VM and test connectivity

echo "Testing floating IP routing..."
openstack floating ip list | head -5
```

## Conclusion

Validating OpenStack Calico upgrades requires running both standard Kubernetes validation (TigeraStatus, pod connectivity) and OpenStack-specific validation (Neutron agent health, VM connectivity, floating IP routing). Only declare the upgrade successful when both layers pass their respective validations.
