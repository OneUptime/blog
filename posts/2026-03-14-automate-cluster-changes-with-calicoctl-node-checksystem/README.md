# Automating System Checks with calicoctl node checksystem

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, calicoctl, Automation, System Requirements, Kubernetes, Pre-flight

Description: Integrate calicoctl node checksystem into automated deployment pipelines and infrastructure provisioning to ensure every node meets Calico requirements before joining the cluster.

---

## Introduction

Manually running `calicoctl node checksystem` on each new node is impractical in dynamic environments where nodes are frequently added and removed. By automating system checks into your infrastructure provisioning pipeline, you catch configuration issues before they affect your cluster.

This guide shows how to integrate checksystem into various automation frameworks, from cloud-init scripts to Ansible playbooks and Kubernetes admission controllers.

## Prerequisites

- Infrastructure provisioning system (Terraform, cloud-init, Ansible)
- `calicoctl` binary available in provisioning images
- Understanding of your node provisioning pipeline

## Cloud-Init Integration

Add system checks to your cloud-init user data:

```yaml
#cloud-config
write_files:
  - path: /etc/modules-load.d/calico.conf
    content: |
      ip_tables
      iptable_filter
      iptable_nat
      ip_set
      xt_set
      xt_mark
      xt_multiport
      xt_conntrack
      nf_conntrack
      vxlan
      ipip
  
  - path: /etc/sysctl.d/99-calico.conf
    content: |
      net.ipv4.ip_forward = 1
      net.ipv6.conf.all.forwarding = 1
      net.ipv4.conf.all.rp_filter = 1

runcmd:
  # Load kernel modules
  - for mod in ip_tables iptable_filter iptable_nat ip_set xt_set xt_mark xt_multiport xt_conntrack nf_conntrack vxlan ipip; do modprobe $mod; done
  
  # Apply sysctl settings
  - sysctl --system
  
  # Install and run checksystem
  - curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 -o /usr/local/bin/calicoctl
  - chmod +x /usr/local/bin/calicoctl
  - calicoctl node checksystem
```

## Ansible Pre-Deployment Role

```yaml
# roles/calico-prereqs/tasks/main.yaml
---
- name: Load required kernel modules
  modprobe:
    name: "{{ item }}"
    state: present
  loop:
    - ip_tables
    - iptable_filter
    - iptable_nat
    - ip_set
    - xt_set
    - xt_mark
    - xt_multiport
    - xt_conntrack
    - nf_conntrack
    - vxlan
    - ipip

- name: Persist kernel modules
  copy:
    dest: /etc/modules-load.d/calico.conf
    content: |
      ip_tables
      iptable_filter
      iptable_nat
      ip_set
      xt_set
      xt_mark
      xt_multiport
      xt_conntrack
      nf_conntrack
      vxlan
      ipip

- name: Set sysctl parameters
  sysctl:
    name: "{{ item.key }}"
    value: "{{ item.value }}"
    sysctl_file: /etc/sysctl.d/99-calico.conf
    reload: yes
  loop:
    - { key: "net.ipv4.ip_forward", value: "1" }
    - { key: "net.ipv6.conf.all.forwarding", value: "1" }
    - { key: "net.ipv4.conf.all.rp_filter", value: "1" }

- name: Run Calico system check
  command: calicoctl node checksystem
  register: checksystem_result

- name: Display checksystem results
  debug:
    var: checksystem_result.stdout_lines

- name: Fail if checksystem has errors
  fail:
    msg: "Calico system check failed"
  when: "'ERROR' in checksystem_result.stdout"
```

## Kubernetes DaemonSet for Continuous Checking

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: calico-system-checker
  namespace: calico-system
spec:
  selector:
    matchLabels:
      app: calico-system-checker
  template:
    metadata:
      labels:
        app: calico-system-checker
    spec:
      hostNetwork: true
      hostPID: true
      tolerations:
      - operator: Exists
      containers:
      - name: checker
        image: calico/ctl:v3.27.0
        securityContext:
          privileged: true
        command:
        - /bin/sh
        - -c
        - |
          while true; do
            RESULT=$(calicoctl node checksystem 2>&1)
            ERRORS=$(echo "$RESULT" | grep -c "ERROR" || echo 0)
            if [ "$ERRORS" -gt 0 ]; then
              echo "ALERT: System check failed on $(hostname)"
              echo "$RESULT"
            else
              echo "OK: System check passed on $(hostname)"
            fi
            sleep 3600  # Check every hour
          done
```

## CI/CD Pipeline Gate

```yaml
# GitHub Actions example
name: Validate Node Prerequisites
on:
  workflow_dispatch:
    inputs:
      node_ip:
        description: 'Node IP to check'
        required: true

jobs:
  check-system:
    runs-on: ubuntu-latest
    steps:
      - name: Install calicoctl
        run: |
          curl -L https://github.com/projectcalico/calico/releases/download/v3.27.0/calicoctl-linux-amd64 -o calicoctl
          chmod +x calicoctl
          sudo mv calicoctl /usr/local/bin/

      - name: Run system check on target node
        run: |
          ssh ${{ inputs.node_ip }} "sudo calicoctl node checksystem"
        env:
          SSH_KEY: ${{ secrets.SSH_KEY }}
```

## Verification

Test the automated checks:

```bash
# Run Ansible role
ansible-playbook -i inventory playbooks/calico-prereqs.yaml

# Check DaemonSet status
kubectl get ds calico-system-checker -n calico-system
kubectl logs -n calico-system -l app=calico-system-checker --tail=5
```

## Troubleshooting

- **Cloud-init script fails silently**: Check `/var/log/cloud-init-output.log` for errors.
- **Ansible modprobe fails**: The kernel module may need to be installed first. Add a package installation step.
- **DaemonSet cannot run checksystem**: Ensure the pod has `privileged: true` and `hostPID: true` security context.

## Conclusion

Integrating `calicoctl node checksystem` into your automation pipeline ensures that every node entering your cluster meets Calico's requirements. Whether through cloud-init, Ansible, or continuous Kubernetes-based checking, automated system validation prevents deployment failures and maintains a consistent, Calico-ready infrastructure.
