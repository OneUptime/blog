# How to Operationalize Calico on OpenStack Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Kubernetes, Networking, Upgrade

Description: Build operational processes for Calico upgrades in OpenStack environments, coordinating with OpenStack release cycles and neutron maintenance windows.

---

## Introduction

Operationalizing Calico upgrades in OpenStack environments requires coordination with OpenStack release cycles, Neutron maintenance windows, and the OpenStack operations team. The upgrade involves two different teams (Kubernetes platform and OpenStack infrastructure) and must be carefully sequenced.

Establishing clear ownership boundaries - where Kubernetes platform team responsibility ends and OpenStack team responsibility begins - is essential for smooth upgrades.

## Prerequisites

- Calico installed in OpenStack with Neutron ML2 calico plugin
- Access to OpenStack control plane and compute nodes
- Ansible for compute node management
- kubectl and oc (if also running OpenShift on OpenStack)

## Key Steps

```markdown
## OpenStack Calico Upgrade Coordination Process

Teams Involved:
- Kubernetes Platform Team: calico-node, kube-controllers, TigeraStatus
- OpenStack Networking Team: calico-felix on compute, Neutron ML2 plugin
- Change Advisory Board: Both teams must present

Upgrade Sequence:
1. Kubernetes Platform Team: upgrades Calico operator components
2. OpenStack Networking Team: upgrades calico-felix on compute nodes
3. Both teams: run their respective validation steps
4. Joint: test VM-to-Pod connectivity (cross-boundary test)

Communication:
- Shared incident channel during upgrade window
- Each team signals "done" before other team proceeds
```

## Conclusion

Operationalizing OpenStack Calico upgrades requires clear ownership boundaries between the Kubernetes platform team and OpenStack networking team, a defined upgrade sequence, and cross-boundary testing (VM-to-Pod connectivity) that validates the integration between both platforms. Document this coordination process in your runbook so it's consistent every upgrade cycle.
