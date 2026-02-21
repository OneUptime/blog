# How to Use Ansible to Configure Kubernetes Resource Quotas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Resource Quotas, Cluster Management, DevOps

Description: Set up Kubernetes Resource Quotas with Ansible to limit CPU, memory, storage, and object counts per namespace for multi-tenant clusters.

---

In a shared Kubernetes cluster, one runaway application can consume all available resources and starve everything else. Resource Quotas prevent this by setting hard limits on how much CPU, memory, storage, and how many objects a namespace can use. They are essential for multi-tenant clusters where different teams share infrastructure and need predictable resource availability.

Managing Resource Quotas through Ansible keeps your cluster governance policies in code, versioned and consistent across environments. This guide covers creating compute quotas, storage quotas, object count limits, and quota scoping.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A Kubernetes cluster
- A valid kubeconfig

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Understanding Resource Quotas

Resource Quotas operate at the namespace level. They limit:

- **Compute resources**: CPU and memory (requests and limits)
- **Storage resources**: PVC count and total storage capacity
- **Object counts**: Pods, Services, ConfigMaps, Secrets, etc.

When a quota is active, pods must specify resource requests and limits. If they do not, the pod creation will be rejected. You can use a LimitRange to provide defaults (covered in a companion guide).

## Creating a Compute Resource Quota

Start with the most common type: CPU and memory limits for a namespace.

```yaml
# playbook: create-compute-quota.yml
# Sets CPU and memory limits for a namespace
---
- name: Create Compute Resource Quota
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: development
    cpu_requests: "10"
    cpu_limits: "20"
    memory_requests: "20Gi"
    memory_limits: "40Gi"

  tasks:
    - name: Create the namespace
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ namespace }}"

    - name: Create compute resource quota
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ResourceQuota
          metadata:
            name: compute-quota
            namespace: "{{ namespace }}"
          spec:
            hard:
              requests.cpu: "{{ cpu_requests }}"
              requests.memory: "{{ memory_requests }}"
              limits.cpu: "{{ cpu_limits }}"
              limits.memory: "{{ memory_limits }}"
```

This quota means all pods in the `development` namespace collectively cannot request more than 10 CPU cores and 20Gi of memory. The `limits` fields cap the maximum resources pods can burst to.

## Creating a Storage Resource Quota

Prevent teams from consuming all available storage.

```yaml
# playbook: create-storage-quota.yml
# Limits storage consumption per namespace
---
- name: Create Storage Resource Quota
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create storage quota
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ResourceQuota
          metadata:
            name: storage-quota
            namespace: development
          spec:
            hard:
              # Total storage across all PVCs
              requests.storage: "500Gi"
              # Maximum number of PVCs
              persistentvolumeclaims: "20"
              # Per-StorageClass limits
              fast-ssd.storageclass.storage.k8s.io/requests.storage: "100Gi"
              fast-ssd.storageclass.storage.k8s.io/persistentvolumeclaims: "5"
              standard.storageclass.storage.k8s.io/requests.storage: "400Gi"
              standard.storageclass.storage.k8s.io/persistentvolumeclaims: "15"
```

The per-StorageClass limits are useful when you have expensive high-performance storage (like io2 EBS volumes) and want to restrict its usage while allowing more generous limits for standard storage.

## Creating an Object Count Quota

Limit how many Kubernetes objects can exist in a namespace.

```yaml
# playbook: create-object-quota.yml
# Limits the number of Kubernetes objects per namespace
---
- name: Create Object Count Quota
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create object count quota
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ResourceQuota
          metadata:
            name: object-quota
            namespace: development
          spec:
            hard:
              pods: "50"
              services: "20"
              services.loadbalancers: "2"
              services.nodeports: "5"
              configmaps: "30"
              secrets: "30"
              replicationcontrollers: "10"
              resourcequotas: "5"
```

The `services.loadbalancers: "2"` limit is particularly useful because each LoadBalancer service typically provisions a cloud load balancer, which costs money. Limiting them prevents unexpected cloud bills.

## Comprehensive Quota for a Team Namespace

Combine all quota types into a single resource for complete governance.

```yaml
# playbook: create-team-quota.yml
# Creates a comprehensive resource quota for a team namespace
---
- name: Create comprehensive team quota
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    teams:
      - name: backend
        namespace: backend-prod
        cpu_requests: "20"
        cpu_limits: "40"
        memory_requests: "40Gi"
        memory_limits: "80Gi"
        storage: "500Gi"
        pods: "100"
      - name: frontend
        namespace: frontend-prod
        cpu_requests: "10"
        cpu_limits: "20"
        memory_requests: "20Gi"
        memory_limits: "40Gi"
        storage: "200Gi"
        pods: "50"
      - name: data
        namespace: data-prod
        cpu_requests: "50"
        cpu_limits: "100"
        memory_requests: "200Gi"
        memory_limits: "400Gi"
        storage: "2Ti"
        pods: "200"

  tasks:
    - name: Create team namespaces
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ item.namespace }}"
            labels:
              team: "{{ item.name }}"
      loop: "{{ teams }}"
      loop_control:
        label: "{{ item.namespace }}"

    - name: Create resource quota for each team
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ResourceQuota
          metadata:
            name: team-quota
            namespace: "{{ item.namespace }}"
          spec:
            hard:
              requests.cpu: "{{ item.cpu_requests }}"
              limits.cpu: "{{ item.cpu_limits }}"
              requests.memory: "{{ item.memory_requests }}"
              limits.memory: "{{ item.memory_limits }}"
              requests.storage: "{{ item.storage }}"
              pods: "{{ item.pods }}"
              services: "30"
              services.loadbalancers: "3"
              configmaps: "50"
              secrets: "50"
              persistentvolumeclaims: "20"
      loop: "{{ teams }}"
      loop_control:
        label: "{{ item.namespace }}"
```

## Scoped Resource Quotas

You can scope quotas to specific priority classes or scope selectors, so the quota only applies to certain pods.

```yaml
# playbook: create-scoped-quota.yml
# Creates quotas scoped to different priority levels
---
- name: Create scoped Resource Quotas
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create quota for high-priority pods
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ResourceQuota
          metadata:
            name: high-priority-quota
            namespace: production
          spec:
            hard:
              pods: "20"
              requests.cpu: "40"
              requests.memory: "80Gi"
            scopeSelector:
              matchExpressions:
                - scopeName: PriorityClass
                  operator: In
                  values:
                    - high

    - name: Create quota for best-effort pods
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: ResourceQuota
          metadata:
            name: besteffort-quota
            namespace: production
          spec:
            hard:
              pods: "10"
            scopes:
              - BestEffort
```

The BestEffort scope applies only to pods without any resource requests or limits. This lets you restrict how many "unbounded" pods can exist while being more generous with pods that specify their needs.

## Monitoring Quota Usage

Check how much of the quota is being consumed.

```yaml
# playbook: check-quota-usage.yml
# Reports resource quota usage for a namespace
---
- name: Check Resource Quota usage
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: production

  tasks:
    - name: Get all resource quotas
      kubernetes.core.k8s_info:
        kind: ResourceQuota
        namespace: "{{ namespace }}"
      register: quotas

    - name: Display quota usage
      ansible.builtin.debug:
        msg: |
          Quota: {{ item.metadata.name }}
          {% for resource, limit in item.status.hard.items() %}
          {{ resource }}: {{ item.status.used[resource] | default('0') }} / {{ limit }}
          {% endfor %}
      loop: "{{ quotas.resources }}"
      loop_control:
        label: "{{ item.metadata.name }}"
```

## Summary

Resource Quotas are your first line of defense against resource exhaustion in shared Kubernetes clusters. They enforce fair resource distribution across teams and prevent any single namespace from monopolizing cluster capacity. Managing them through Ansible makes quota policies part of your infrastructure-as-code workflow, so changes are reviewed, tracked, and applied consistently. Remember that when you enable compute quotas, all pods must specify resource requests and limits. Pair Resource Quotas with LimitRanges to provide sensible defaults for pods that do not specify their own.
