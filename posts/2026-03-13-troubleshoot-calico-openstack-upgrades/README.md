# How to  Calico on OpenStack Upgrades - Troubleshoot

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Kubernetes, Networking, Upgrade

Description: Diagnose and resolve Calico upgrade failures specific to OpenStack, including Neutron agent conflicts, etcd connectivity issues, and compute node networking.

---

## Introduction

Calico upgrade failures on OpenStack present unique challenges: problems may manifest in OpenStack VM networking rather than Kubernetes pod networking, making the connection to the Calico upgrade less obvious. Understanding the OpenStack-Calico integration points helps diagnose which layer is failing.

The key integration points are: etcd (shared between Calico and OpenStack in some deployments), the Neutron ML2 calico plugin, and the calico-felix agent on compute nodes. Each can fail independently during an upgrade.

## Prerequisites

- Calico installed in OpenStack with Neutron ML2 calico plugin
- Access to OpenStack control plane and compute nodes
- Ansible for compute node management
- kubectl and oc (if also running OpenShift on OpenStack)

## Key Steps

```bash
# Diagnose Neutron ML2 agent issues after upgrade
openstack network agent list | grep calico
# Look for "down" agents

# Check calico-felix logs on a compute node
ssh compute01 journalctl -u calico-felix -n 100

# Check if etcd connectivity is working
etcdctl --endpoints=https://etcd-cluster:2379 endpoint health

# Check Neutron ML2 plugin compatibility
grep "mechanism_drivers" /etc/neutron/plugins/ml2/ml2_conf.ini

# If VM networking broken after upgrade:
# Check if calico-felix on compute nodes was updated
openstack network agent list --agent-type calico
```

## Conclusion

OpenStack Calico upgrade issues require checking both Kubernetes and OpenStack layers. The most unique OpenStack failure mode is the Neutron agent going down or becoming incompatible after the upgrade. Always check  alongside standard Kubernetes checks when diagnosing post-upgrade networking issues.
