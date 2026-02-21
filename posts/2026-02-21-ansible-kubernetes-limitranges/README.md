# How to Use Ansible to Manage Kubernetes LimitRanges

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, LimitRanges, Resource Management, DevOps

Description: Configure Kubernetes LimitRanges with Ansible to set default resource requests and limits, enforce minimum and maximum constraints per container.

---

LimitRanges work alongside Resource Quotas to control resource consumption in Kubernetes. While Resource Quotas set aggregate limits for an entire namespace, LimitRanges set constraints on individual pods and containers. They define default resource requests and limits, enforce minimum and maximum values, and prevent anyone from creating a pod that requests an absurd amount of CPU or memory.

When a namespace has a Resource Quota for compute resources, every container must specify requests and limits. LimitRanges provide those defaults automatically, so developers do not need to figure out the right values for every single pod.

This guide covers creating LimitRanges with Ansible for containers, pods, and PVCs, along with practical patterns for multi-tenant clusters.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A valid kubeconfig

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## How LimitRanges Work

LimitRanges operate at three levels:

- **Container**: Default and min/max for individual containers
- **Pod**: Aggregate min/max across all containers in a pod
- **PersistentVolumeClaim**: Min/max storage size for PVCs

When a pod is created without resource specifications, the LimitRange's `default` values are injected automatically. If a pod specifies values outside the min/max range, the API server rejects it.

## Creating a Container LimitRange

The most common use case: set defaults and bounds for individual containers.

```yaml
# playbook: create-container-limitrange.yml
# Sets default resource requests and limits for containers
---
- name: Create Container LimitRange
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: production

  tasks:
    - name: Create container LimitRange
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: LimitRange
          metadata:
            name: container-limits
            namespace: "{{ namespace }}"
          spec:
            limits:
              - type: Container
                # Default limits applied if none specified
                default:
                  cpu: "500m"
                  memory: "256Mi"
                # Default requests applied if none specified
                defaultRequest:
                  cpu: "100m"
                  memory: "128Mi"
                # Maximum allowed values
                max:
                  cpu: "4"
                  memory: "8Gi"
                # Minimum allowed values
                min:
                  cpu: "50m"
                  memory: "64Mi"
```

With this LimitRange in place:

- A container without resource specs gets 100m CPU request, 500m CPU limit, 128Mi memory request, and 256Mi memory limit automatically
- A container requesting 10 CPU cores will be rejected (exceeds the max of 4)
- A container requesting 10m CPU will be rejected (below the min of 50m)

## Creating a Pod-Level LimitRange

Pod-level limits constrain the total resources across all containers in a pod.

```yaml
# playbook: create-pod-limitrange.yml
# Sets aggregate resource limits for entire pods
---
- name: Create Pod LimitRange
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create pod LimitRange
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: LimitRange
          metadata:
            name: pod-limits
            namespace: production
          spec:
            limits:
              - type: Pod
                max:
                  cpu: "8"
                  memory: "16Gi"
                min:
                  cpu: "100m"
                  memory: "128Mi"
```

This prevents any single pod from requesting more than 8 CPU cores and 16Gi of memory total, regardless of how many containers it has.

## Creating a PVC LimitRange

Control the size of PersistentVolumeClaims that can be created in a namespace.

```yaml
# playbook: create-pvc-limitrange.yml
# Sets minimum and maximum sizes for PersistentVolumeClaims
---
- name: Create PVC LimitRange
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create PVC LimitRange
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: LimitRange
          metadata:
            name: storage-limits
            namespace: production
          spec:
            limits:
              - type: PersistentVolumeClaim
                max:
                  storage: "100Gi"
                min:
                  storage: "1Gi"
```

This prevents someone from accidentally creating a 10TB PVC, while also rejecting PVCs smaller than 1Gi (which would be too small for most workloads).

## Combined LimitRange

You can include Container, Pod, and PVC limits in a single LimitRange resource.

```yaml
# playbook: create-combined-limitrange.yml
# Creates a comprehensive LimitRange covering containers, pods, and PVCs
---
- name: Create combined LimitRange
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create comprehensive LimitRange
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: LimitRange
          metadata:
            name: resource-limits
            namespace: production
          spec:
            limits:
              # Container-level defaults and bounds
              - type: Container
                default:
                  cpu: "500m"
                  memory: "256Mi"
                defaultRequest:
                  cpu: "100m"
                  memory: "128Mi"
                max:
                  cpu: "4"
                  memory: "8Gi"
                min:
                  cpu: "50m"
                  memory: "64Mi"
                # Ratio between limit and request
                maxLimitRequestRatio:
                  cpu: "10"
                  memory: "4"
              # Pod-level bounds
              - type: Pod
                max:
                  cpu: "8"
                  memory: "16Gi"
              # PVC size bounds
              - type: PersistentVolumeClaim
                max:
                  storage: "100Gi"
                min:
                  storage: "1Gi"
```

The `maxLimitRequestRatio` is particularly useful. A ratio of 10 for CPU means the limit cannot be more than 10x the request. This prevents configurations like "request 10m CPU, limit 10 cores" which would be meaningless and could cause noisy-neighbor problems during bursting.

## Environment-Specific LimitRanges

Different environments need different constraints. Development should be more restrictive (to prevent waste), while production needs more room.

```yaml
# playbook: create-env-limitranges.yml
# Creates environment-specific LimitRanges from a variable map
---
- name: Create environment-specific LimitRanges
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    environments:
      development:
        default_cpu: "200m"
        default_memory: "128Mi"
        default_request_cpu: "50m"
        default_request_memory: "64Mi"
        max_cpu: "1"
        max_memory: "2Gi"
        min_cpu: "10m"
        min_memory: "32Mi"
        max_storage: "10Gi"
      staging:
        default_cpu: "500m"
        default_memory: "256Mi"
        default_request_cpu: "100m"
        default_request_memory: "128Mi"
        max_cpu: "2"
        max_memory: "4Gi"
        min_cpu: "50m"
        min_memory: "64Mi"
        max_storage: "50Gi"
      production:
        default_cpu: "500m"
        default_memory: "512Mi"
        default_request_cpu: "200m"
        default_request_memory: "256Mi"
        max_cpu: "4"
        max_memory: "8Gi"
        min_cpu: "50m"
        min_memory: "64Mi"
        max_storage: "200Gi"

  tasks:
    - name: Create LimitRange for each environment
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: LimitRange
          metadata:
            name: resource-limits
            namespace: "{{ item.key }}"
          spec:
            limits:
              - type: Container
                default:
                  cpu: "{{ item.value.default_cpu }}"
                  memory: "{{ item.value.default_memory }}"
                defaultRequest:
                  cpu: "{{ item.value.default_request_cpu }}"
                  memory: "{{ item.value.default_request_memory }}"
                max:
                  cpu: "{{ item.value.max_cpu }}"
                  memory: "{{ item.value.max_memory }}"
                min:
                  cpu: "{{ item.value.min_cpu }}"
                  memory: "{{ item.value.min_memory }}"
              - type: PersistentVolumeClaim
                max:
                  storage: "{{ item.value.max_storage }}"
                min:
                  storage: "1Gi"
      loop: "{{ environments | dict2items }}"
      loop_control:
        label: "{{ item.key }}"
```

## Pairing LimitRanges with Resource Quotas

LimitRanges and Resource Quotas are complementary. Use them together for complete resource governance.

```yaml
# playbook: create-namespace-governance.yml
# Sets up both ResourceQuota and LimitRange for a namespace
---
- name: Configure namespace resource governance
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: team-alpha
    # Quota: total for the namespace
    total_cpu: "20"
    total_memory: "40Gi"
    # LimitRange: per-container
    container_max_cpu: "2"
    container_max_memory: "4Gi"

  tasks:
    - name: Create namespace
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: Namespace
          metadata:
            name: "{{ namespace }}"

    - name: Create Resource Quota (namespace-wide limits)
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
              requests.cpu: "{{ total_cpu }}"
              requests.memory: "{{ total_memory }}"
              limits.cpu: "{{ (total_cpu | int * 2) | string }}"
              limits.memory: "{{ total_memory }}"
              pods: "100"

    - name: Create LimitRange (per-container defaults and bounds)
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: LimitRange
          metadata:
            name: container-limits
            namespace: "{{ namespace }}"
          spec:
            limits:
              - type: Container
                default:
                  cpu: "500m"
                  memory: "256Mi"
                defaultRequest:
                  cpu: "100m"
                  memory: "128Mi"
                max:
                  cpu: "{{ container_max_cpu }}"
                  memory: "{{ container_max_memory }}"
                min:
                  cpu: "50m"
                  memory: "64Mi"
```

## Checking LimitRange Configuration

Verify your LimitRanges are applied correctly.

```yaml
# task: display current LimitRange settings
- name: Get LimitRange details
  kubernetes.core.k8s_info:
    kind: LimitRange
    namespace: production
  register: lr_info

- name: Show LimitRange details
  ansible.builtin.debug:
    msg: |
      LimitRange: {{ item.metadata.name }}
      {% for limit in item.spec.limits %}
      Type: {{ limit.type }}
      {% if limit.default is defined %}  Defaults: cpu={{ limit.default.cpu | default('N/A') }}, memory={{ limit.default.memory | default('N/A') }}{% endif %}
      {% if limit.max is defined %}  Max: cpu={{ limit.max.cpu | default('N/A') }}, memory={{ limit.max.memory | default('N/A') }}{% endif %}
      {% if limit.min is defined %}  Min: cpu={{ limit.min.cpu | default('N/A') }}, memory={{ limit.min.memory | default('N/A') }}{% endif %}
      {% endfor %}
  loop: "{{ lr_info.resources }}"
  loop_control:
    label: "{{ item.metadata.name }}"
```

## Summary

LimitRanges complement Resource Quotas to give you fine-grained control over individual pods and containers. They prevent oversized resource requests, provide sensible defaults for teams that do not specify resources, and enforce consistency across all workloads in a namespace. Always pair them with Resource Quotas in multi-tenant clusters: Quotas control the total pie, LimitRanges control the size of each slice. Managing both through Ansible means your governance policies are codified, reviewable, and consistently applied.
