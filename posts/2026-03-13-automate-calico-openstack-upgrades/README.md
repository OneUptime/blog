# How to Automate Calico on OpenStack Upgrades

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, OpenStack, Kubernetes, Networking, Upgrade

Description: Automate Calico upgrades on OpenStack using Ansible playbooks and CI/CD pipelines that account for Neutron ML2 driver dependencies.

---

## Introduction

Automating Calico upgrades in OpenStack environments requires Ansible to manage the distributed compute node agents alongside the Kubernetes operator-managed components. The automation must handle both the Kubernetes and OpenStack layers in the correct order.

The OpenStack layer requires Ansible as the primary tool since Neutron agents run outside Kubernetes on compute nodes. The Kubernetes layer uses GitOps as in standard Calico deployments. Combining these two automation approaches in a single pipeline ensures consistent upgrade execution.

## Prerequisites

- Calico installed in OpenStack with Neutron ML2 calico plugin
- Access to OpenStack control plane and compute nodes
- Ansible for compute node management
- kubectl and oc (if also running OpenShift on OpenStack)

## Key Steps

```yaml
# ansible/playbooks/calico-openstack-upgrade.yaml
---
- name: Upgrade Calico on OpenStack
  hosts: all
  vars:
    calico_version: "v3.28.0"
  tasks:
    - name: Check Neutron ML2 compatibility
      command: neutron-db-manage current
      delegate_to: "{{ groups['neutron_api'][0] }}"

    - name: Upgrade Kubernetes Calico via operator
      kubernetes.core.k8s:
        state: patched
        api_version: operator.tigera.io/v1
        kind: Installation
        name: default
        definition:
          spec:
            version: "{{ calico_version }}"
      delegate_to: localhost

    - name: Upgrade calico-felix on compute nodes
      package:
        name: calico-felix
        state: latest
      when: inventory_hostname in groups['compute']

    - name: Restart calico-felix
      service:
        name: calico-felix
        state: restarted
      when: inventory_hostname in groups['compute']
```

## Conclusion

Automating OpenStack Calico upgrades combines Ansible for the OpenStack layer with Kubernetes operator patterns for the Kubernetes layer. By encapsulating both in a single Ansible playbook, you ensure both layers are upgraded consistently and sequentially within the same automation run.
