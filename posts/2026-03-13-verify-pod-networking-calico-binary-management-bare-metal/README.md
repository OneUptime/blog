# How to Verify Pod Networking with Calico with Binary Management on Bare Metal

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Calico, Kubernetes, Networking, CNI, Bare Metal, Binary Management, Verification

Description: A guide to verifying pod networking when Calico is installed and managed as binaries on bare metal Kubernetes nodes.

---

## Introduction

Verifying pod networking in a binary-managed Calico environment combines Kubernetes-level checks with automated OS-level verification using your configuration management tool. Ansible can run checks across all nodes simultaneously, making it far faster to confirm that every node in a large fleet has correct networking state.

The verification workflow should run both immediately after installation and as a recurring health check in production. Embedding the verification checks into an Ansible playbook makes them repeatable and auditable.

This guide covers a comprehensive verification workflow for binary-managed Calico on bare metal.

## Prerequisites

- Calico binary installation managed by Ansible running on all nodes
- `kubectl` and `calicoctl` installed
- Ansible control node with SSH access to all nodes

## Step 1: Verify Service Health Across All Nodes

```bash
ansible all -i inventory.ini -m shell \
  -a "systemctl is-active calico-node && echo OK || echo FAILED"
```

All nodes should return `active` and `OK`.

## Step 2: Check CNI Plugin Presence Across Nodes

```bash
ansible all -i inventory.ini -m shell \
  -a "test -x /opt/cni/bin/calico && test -x /opt/cni/bin/calico-ipam && echo OK"
```

## Step 3: Verify IP Pool and IPAM

```bash
calicoctl ipam show
calicoctl ipam show --show-blocks
```

Deploy a test pod on each node to trigger IPAM allocation.

```bash
for node in worker1 worker2 worker3; do
  kubectl run test-$node --image=busybox \
    --overrides="{\"spec\":{\"nodeName\":\"$node\"}}" --command -- sleep 60 &
done
wait
for node in worker1 worker2 worker3; do
  kubectl wait --for=condition=Ready pod/test-$node --timeout=120s
done
kubectl get pods -o wide | grep test-
kubectl delete pod test-worker1 test-worker2 test-worker3
```

## Step 4: Test Cross-Node Pod Connectivity

```bash
kubectl run pod-a --image=busybox --overrides='{"spec":{"nodeName":"worker1"}}' --command -- sleep 300
kubectl run pod-b --image=busybox --overrides='{"spec":{"nodeName":"worker2"}}' --command -- sleep 300
kubectl wait --for=condition=Ready pod/pod-a pod/pod-b --timeout=120s

POD_B_IP=$(kubectl get pod pod-b -o jsonpath='{.status.podIP}')
kubectl exec pod-a -- ping -c5 $POD_B_IP
kubectl delete pod pod-a pod-b
```

## Step 5: Verify Routing Table on All Nodes

```bash
ansible all -i inventory.ini -m shell \
  -a "ip route show | grep -c 'proto bird'"
```

Each worker should show multiple BGP-learned routes.

## Step 6: Run Automated Verification Playbook

```yaml
# verify-calico.yml

---
- name: Verify Calico networking
  hosts: all
  tasks:
    - name: Check calico-node service
      command: systemctl is-active calico-node
      changed_when: false

    - name: Check Calico CNI binary exists and is executable
      stat:
        path: /opt/cni/bin/calico
      register: cni_stat
      failed_when: not cni_stat.stat.exists or not cni_stat.stat.executable

    - name: Check Calico IPAM binary exists and is executable
      stat:
        path: /opt/cni/bin/calico-ipam
      register: ipam_stat
      failed_when: not ipam_stat.stat.exists or not ipam_stat.stat.executable

    - name: Check BGP routes present
      shell: ip route show | grep -c 'proto bird'
      register: route_count
      failed_when: route_count.stdout|int < 1
      changed_when: false
```

```bash
ansible-playbook -i inventory.ini verify-calico.yml
```

## Conclusion

Verifying binary-managed Calico on bare metal leverages Ansible to run checks across all nodes simultaneously. Automated playbooks that check service state, CNI binary presence, IPAM allocation, and BGP route counts give you confidence that every node in a large fleet has correct networking configuration without requiring manual SSH into each node.
