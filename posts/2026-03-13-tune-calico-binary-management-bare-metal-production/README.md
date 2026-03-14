# How to Tune Calico with Binary Management on Bare Metal for Production

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binary Management, Performance, Production

Description: A guide to automating Calico performance tuning on bare metal nodes using Ansible for consistent production configuration.

---

## Introduction

Production tuning for binary-managed Calico on bare metal follows the same principles as other deployment models — disable encapsulation, enable eBPF, tune Felix timers, optimize the OS network stack. What differs is that all of these changes are encoded in Ansible roles and applied consistently across the entire node fleet, rather than being applied manually node by node.

Encoding tuning parameters in Ansible variables also makes them auditable and version-controlled. When you change a tuning parameter, the change is recorded in your playbook repository alongside the reason for the change. This is valuable for production environments where configuration drift is a compliance concern.

This guide covers production tuning for binary-managed Calico on bare metal using Ansible.

## Prerequisites

- Calico binary installation managed by Ansible on all bare metal nodes
- Ansible control node with SSH access
- `kubectl` and `calicoctl` available

## Step 1: Add Tuning Variables to Ansible

```yaml
# group_vars/all.yml
calico_encapsulation: "None"
calico_mtu: 1500
calico_bpf_enabled: true
calico_prometheus_enabled: true
calico_prometheus_port: 9091
calico_log_level: "WARNING"
calico_route_refresh: "60s"
calico_iptables_refresh: "90s"
```

## Step 2: Write OS Tuning Tasks

```yaml
# roles/calico-tuning/tasks/main.yml
- name: Apply sysctl performance tuning
  sysctl:
    name: "{{ item.name }}"
    value: "{{ item.value }}"
    state: present
    sysctl_file: /etc/sysctl.d/99-calico-prod.conf
    reload: true
  loop:
    - { name: 'net.core.rmem_max', value: '134217728' }
    - { name: 'net.core.wmem_max', value: '134217728' }
    - { name: 'net.core.netdev_max_backlog', value: '250000' }
    - { name: 'net.netfilter.nf_conntrack_max', value: '1048576' }
```

## Step 3: Update Service Unit with Tuning Parameters

```ini
# templates/calico-node.service.j2
[Service]
Environment=FELIX_LOGSEVERITYSCREEN={{ calico_log_level }}
Environment=FELIX_PROMETHEUSMETRICSENABLED={{ calico_prometheus_enabled | lower }}
Environment=FELIX_PROMETHEUSMETRICSPORT={{ calico_prometheus_port }}
Environment=FELIX_ROUTEREFRESHINTERVAL={{ calico_route_refresh | replace('s', '') }}
Environment=FELIX_IPTABLESREFRESHINTERVAL={{ calico_iptables_refresh | replace('s', '') }}
```

## Step 4: Apply CRD-Level Tuning

```yaml
# apply-tuning.yml
- name: Apply Calico CRD tuning
  hosts: localhost
  tasks:
    - name: Patch IP pool for no encapsulation
      shell: |
        calicoctl patch ippool default-ipv4-ippool \
          --patch '{"spec":{"encapsulation":"None"}}'

    - name: Enable eBPF
      shell: |
        calicoctl patch felixconfiguration default \
          --patch '{"spec":{"bpfEnabled":true}}'
```

## Step 5: Run Tuning Playbook

```bash
ansible-playbook -i inventory.ini tune-calico.yml
ansible-playbook apply-tuning.yml
```

## Step 6: Verify Tuning Effect

```bash
ansible all -i inventory.ini -m shell \
  -a "sysctl net.core.rmem_max net.netfilter.nf_conntrack_max"
calicoctl get felixconfiguration default -o yaml | grep -E "bpf|prometheus|refresh"
```

## Conclusion

Automating Calico production tuning with Ansible on bare metal ensures consistent performance configuration across every node in the fleet. Encoding tuning parameters as Ansible variables makes them version-controlled and auditable, while Ansible's idempotent execution ensures that any node added to the cluster automatically receives the same tuned configuration as existing nodes.
