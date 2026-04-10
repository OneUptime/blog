# How to Automate Ceph Cluster Deployment with Ansible

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Ansible, Automation, Deployment

Description: Learn how to automate Rook-Ceph cluster deployment using Ansible to install prerequisites, apply manifests, and verify cluster health across environments.

---

Automating Ceph deployment with Ansible ensures repeatable, consistent cluster builds across development, staging, and production environments. While Rook itself handles Ceph lifecycle management, Ansible is ideal for bootstrapping Kubernetes clusters and applying Rook manifests.

## Project Structure

```text
ceph-ansible-rook/
  inventory/
    production/
    staging/
  roles/
    k8s-prereqs/
    rook-operator/
    ceph-cluster/
    ceph-pool/
  playbooks/
    deploy.yml
    verify.yml
```

## Prerequisites Role

```yaml
# roles/k8s-prereqs/tasks/main.yml
- name: Ensure kernel modules loaded
  modprobe:
    name: "{{ item }}"
    state: present
  loop:
  - rbd
  - ceph
  - nbd

- name: Install required packages
  package:
    name:
    - lvm2
    - cryptsetup
    - sg3_utils
    state: present

- name: Disable swap
  command: swapoff -a
  changed_when: false

- name: Label worker nodes for Ceph storage
  command: >
    kubectl label node {{ item }} storage=ceph --overwrite
  loop: "{{ groups['ceph_nodes'] }}"
  delegate_to: "{{ groups['k8s_master'][0] }}"
  run_once: true
```

## Deploy Rook Operator Role

```yaml
# roles/rook-operator/tasks/main.yml
- name: Clone Rook repository
  git:
    repo: https://github.com/rook/rook.git
    dest: /tmp/rook
    version: "{{ rook_version }}"
    depth: 1

- name: Apply Rook CRDs
  command: kubectl apply -f /tmp/rook/deploy/examples/crds.yaml

- name: Apply Rook RBAC
  command: kubectl apply -f /tmp/rook/deploy/examples/common.yaml

- name: Apply Rook Operator
  command: kubectl apply -f /tmp/rook/deploy/examples/operator.yaml

- name: Wait for operator to be ready
  command: >
    kubectl -n rook-ceph rollout status deploy/rook-ceph-operator
    --timeout=300s
```

## Deploy CephCluster Role

```yaml
# roles/ceph-cluster/tasks/main.yml
- name: Template CephCluster manifest
  template:
    src: cluster.yaml.j2
    dest: /tmp/ceph-cluster.yaml

- name: Apply CephCluster
  command: kubectl apply -f /tmp/ceph-cluster.yaml

- name: Wait for cluster to be ready
  command: >
    kubectl -n rook-ceph wait cephcluster rook-ceph
    --for=jsonpath='{.status.phase}'=Ready
    --timeout=600s
```

## CephCluster Template

```yaml
# roles/ceph-cluster/templates/cluster.yaml.j2
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  cephVersion:
    image: quay.io/ceph/ceph:{{ ceph_version }}
  dataDirHostPath: /var/lib/rook
  mon:
    count: {{ ceph_mon_count | default(3) }}
  storage:
    useAllNodes: false
    nodes:
{% for node in groups['ceph_nodes'] %}
    - name: {{ node }}
      devices:
      - name: {{ ceph_data_device }}
{% endfor %}
```

## Main Deployment Playbook

```yaml
# playbooks/deploy.yml
- hosts: ceph_nodes
  become: true
  roles:
  - k8s-prereqs

- hosts: localhost
  gather_facts: false
  roles:
  - rook-operator
  - ceph-cluster
  - ceph-pool
```

## Running the Deployment

```bash
# Deploy to staging
ansible-playbook playbooks/deploy.yml \
  -i inventory/staging \
  -e rook_version=v1.16.0 \
  -e ceph_version=v18.2.0 \
  -e ceph_mon_count=3 \
  -e ceph_data_device=sdb

# Verify health
ansible-playbook playbooks/verify.yml \
  -i inventory/production
```

## Summary

Automating Rook-Ceph deployment with Ansible provides consistent, version-controlled cluster builds. Using roles for prerequisites, operator deployment, and cluster configuration keeps the playbooks modular and reusable. Templating the CephCluster manifest with variables allows the same playbook to deploy clusters of different sizes and configurations across multiple environments.
