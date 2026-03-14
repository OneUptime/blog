# How to Monitor Calico on OpenStack Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Kubernetes, Networking, Upgrade

Description: Monitor Calico upgrades on OpenStack with visibility into Neutron agent status, VM connectivity, and compute node networking health.

---

## Introduction

Monitoring Calico upgrades on OpenStack requires visibility into both Kubernetes components (calico-node, TigeraStatus) and OpenStack components (Neutron agents, VM connectivity). The two monitoring systems (Prometheus for Kubernetes, OpenStack's built-in monitoring) need to be checked in parallel during an upgrade window.

Critical signals during an OpenStack Calico upgrade include: Neutron agent heartbeats, VM ARP resolution, and floating IP routing.

## Prerequisites

- Calico installed in OpenStack with Neutron ML2 calico plugin
- Access to OpenStack control plane and compute nodes
- Ansible for compute node management
- kubectl and oc (if also running OpenShift on OpenStack)

## Key Steps

```bash
# Monitor during OpenStack Calico upgrade
watch -n15 'openstack network agent list | grep calico'

# Check Neutron agent heartbeats
watch -n30 'openstack network agent list --agent-type calico --format json |   jq '"'"'.[].alive'"'"''

# Test VM connectivity during upgrade
while true; do
  openstack server ssh <test-vm> -- ping -c1 8.8.8.8 > /dev/null 2>&1     && echo "$(date): VM connectivity OK"     || echo "$(date): VM connectivity FAILED"
  sleep 30
done
```

## Conclusion

Monitoring OpenStack Calico upgrades requires parallel visibility into Kubernetes metrics (via Prometheus) and OpenStack metrics (via Neutron agent health checks). The Neutron agent list is your primary signal for OpenStack-side health - any agent going 'down' during the upgrade window requires immediate investigation.
