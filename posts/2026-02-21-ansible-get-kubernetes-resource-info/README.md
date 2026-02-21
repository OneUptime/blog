# How to Use Ansible to Get Kubernetes Resource Information

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, k8s_info, Monitoring, DevOps

Description: Query and extract Kubernetes resource information using Ansible's k8s_info module for health checks, auditing, and dynamic playbook logic.

---

Ansible is not just for pushing changes to Kubernetes. It is equally useful for reading cluster state, auditing configurations, and feeding resource information into downstream tasks. The `kubernetes.core.k8s_info` module queries the Kubernetes API and returns structured data about any resource type. You can filter by name, namespace, labels, and field selectors.

This guide covers practical patterns for gathering Kubernetes resource information with Ansible: checking deployment health, finding resources by label, extracting specific fields, and using the data to drive conditional logic in your playbooks.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A valid kubeconfig
- Python `kubernetes` library

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Querying a Specific Resource

The most direct query: get a resource by name and namespace.

```yaml
# playbook: get-resource-info.yml
# Retrieves details about a specific Deployment
---
- name: Get Kubernetes resource information
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Get deployment details
      kubernetes.core.k8s_info:
        kind: Deployment
        name: web-api
        namespace: production
      register: deploy_info

    - name: Display deployment status
      ansible.builtin.debug:
        msg:
          name: "{{ deploy_info.resources[0].metadata.name }}"
          replicas: "{{ deploy_info.resources[0].spec.replicas }}"
          ready: "{{ deploy_info.resources[0].status.readyReplicas | default(0) }}"
          image: "{{ deploy_info.resources[0].spec.template.spec.containers[0].image }}"
          created: "{{ deploy_info.resources[0].metadata.creationTimestamp }}"
```

The `resources` field is always a list, even when querying by name. If the resource does not exist, it will be an empty list.

## Querying Resources by Label

Label selectors let you find groups of related resources.

```yaml
# playbook: query-by-label.yml
# Finds all pods with a specific label combination
---
- name: Query resources by label
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Find all pods for the web-api application
      kubernetes.core.k8s_info:
        kind: Pod
        namespace: production
        label_selectors:
          - "app=web-api"
          - "tier=frontend"
      register: app_pods

    - name: Show pod names and their status
      ansible.builtin.debug:
        msg: "{{ item.metadata.name }} - Phase: {{ item.status.phase }} - Node: {{ item.spec.nodeName }}"
      loop: "{{ app_pods.resources }}"
      loop_control:
        label: "{{ item.metadata.name }}"
```

You can use multiple label selectors, and they are ANDed together. Only pods matching all labels will be returned.

## Querying Across All Namespaces

Omit the `namespace` parameter to search cluster-wide.

```yaml
# task: find all deployments across all namespaces with a specific label
- name: Find all Ansible-managed deployments cluster-wide
  kubernetes.core.k8s_info:
    kind: Deployment
    label_selectors:
      - "managed-by=ansible"
  register: all_managed_deploys

- name: List managed deployments
  ansible.builtin.debug:
    msg: "{{ item.metadata.namespace }}/{{ item.metadata.name }} - {{ item.spec.replicas }} replicas"
  loop: "{{ all_managed_deploys.resources }}"
  loop_control:
    label: "{{ item.metadata.namespace }}/{{ item.metadata.name }}"
```

## Using Field Selectors

Field selectors filter on resource fields rather than labels. They are useful for filtering by status.

```yaml
# task: find pods that are not in Running phase
- name: Find non-running pods in production
  kubernetes.core.k8s_info:
    kind: Pod
    namespace: production
    field_selectors:
      - "status.phase!=Running"
      - "status.phase!=Succeeded"
  register: problem_pods

- name: Report problem pods
  ansible.builtin.debug:
    msg: "Problem pod: {{ item.metadata.name }} - Phase: {{ item.status.phase }} - Reason: {{ item.status.reason | default('unknown') }}"
  loop: "{{ problem_pods.resources }}"
  loop_control:
    label: "{{ item.metadata.name }}"
  when: problem_pods.resources | length > 0
```

## Building a Cluster Health Report

Combine multiple queries to build a comprehensive cluster overview.

```yaml
# playbook: cluster-health-report.yml
# Generates a health report by querying multiple resource types
---
- name: Generate cluster health report
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: production

  tasks:
    - name: Get all deployments
      kubernetes.core.k8s_info:
        kind: Deployment
        namespace: "{{ namespace }}"
      register: deployments

    - name: Get all services
      kubernetes.core.k8s_info:
        kind: Service
        namespace: "{{ namespace }}"
      register: services

    - name: Get all pods
      kubernetes.core.k8s_info:
        kind: Pod
        namespace: "{{ namespace }}"
      register: pods

    - name: Get all PVCs
      kubernetes.core.k8s_info:
        kind: PersistentVolumeClaim
        namespace: "{{ namespace }}"
      register: pvcs

    - name: Display cluster summary
      ansible.builtin.debug:
        msg:
          - "=== Cluster Health Report for {{ namespace }} ==="
          - "Deployments: {{ deployments.resources | length }}"
          - "Services: {{ services.resources | length }}"
          - "Pods: {{ pods.resources | length }} (Running: {{ pods.resources | selectattr('status.phase', 'equalto', 'Running') | list | length }})"
          - "PVCs: {{ pvcs.resources | length }} (Bound: {{ pvcs.resources | selectattr('status.phase', 'equalto', 'Bound') | list | length }})"

    - name: List deployments with issues
      ansible.builtin.debug:
        msg: "DEGRADED: {{ item.metadata.name }} - Ready: {{ item.status.readyReplicas | default(0) }}/{{ item.spec.replicas }}"
      loop: "{{ deployments.resources }}"
      loop_control:
        label: "{{ item.metadata.name }}"
      when: (item.status.readyReplicas | default(0)) < item.spec.replicas
```

## Extracting Specific Data for Downstream Tasks

Often you query a resource to extract a value that other tasks need.

```yaml
# playbook: extract-and-use.yml
# Queries a resource and uses the result to drive other tasks
---
- name: Extract resource data for conditional logic
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Get the current image version
      kubernetes.core.k8s_info:
        kind: Deployment
        name: web-api
        namespace: production
      register: current_deploy

    - name: Extract the current image tag
      ansible.builtin.set_fact:
        current_image: "{{ current_deploy.resources[0].spec.template.spec.containers[0].image }}"
        current_replicas: "{{ current_deploy.resources[0].spec.replicas }}"

    - name: Display current state
      ansible.builtin.debug:
        msg: "Currently running {{ current_image }} with {{ current_replicas }} replicas"

    - name: Get the LoadBalancer external IP
      kubernetes.core.k8s_info:
        kind: Service
        name: web-api
        namespace: production
      register: svc_info

    - name: Extract external endpoint
      ansible.builtin.set_fact:
        external_ip: "{{ svc_info.resources[0].status.loadBalancer.ingress[0].ip | default(svc_info.resources[0].status.loadBalancer.ingress[0].hostname, true) | default('pending') }}"

    - name: Show the public endpoint
      ansible.builtin.debug:
        msg: "Service available at: {{ external_ip }}"
```

## Querying Custom Resources

The `k8s_info` module works with any resource type, including CRDs.

```yaml
# task: query cert-manager Certificate resources
- name: Get all certificates
  kubernetes.core.k8s_info:
    api_version: cert-manager.io/v1
    kind: Certificate
    namespace: production
  register: certificates

- name: Show certificate status
  ansible.builtin.debug:
    msg: "{{ item.metadata.name }}: Ready={{ item.status.conditions | selectattr('type', 'equalto', 'Ready') | map(attribute='status') | first | default('Unknown') }}"
  loop: "{{ certificates.resources }}"
  loop_control:
    label: "{{ item.metadata.name }}"
```

## Checking Resource Existence

Use `k8s_info` to check whether a resource exists before creating or modifying it.

```yaml
# task: conditionally create a resource only if it does not exist
- name: Check if the namespace exists
  kubernetes.core.k8s_info:
    kind: Namespace
    name: production
  register: ns_check

- name: Create namespace if it does not exist
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: v1
      kind: Namespace
      metadata:
        name: production
  when: ns_check.resources | length == 0
```

## Counting Resources for Capacity Planning

```yaml
# task: count resources for capacity reporting
- name: Get node information
  kubernetes.core.k8s_info:
    kind: Node
  register: nodes

- name: Get all pods across the cluster
  kubernetes.core.k8s_info:
    kind: Pod
    field_selectors:
      - "status.phase=Running"
  register: running_pods

- name: Report capacity
  ansible.builtin.debug:
    msg:
      - "Nodes: {{ nodes.resources | length }}"
      - "Running pods: {{ running_pods.resources | length }}"
      - "Average pods per node: {{ (running_pods.resources | length / nodes.resources | length) | round(1) }}"
```

## Summary

The `kubernetes.core.k8s_info` module is your window into cluster state from Ansible. Whether you are building health checks, extracting values for downstream tasks, auditing configurations, or gating pipeline steps on resource status, it provides a consistent interface to the Kubernetes API. Combine it with Jinja2 filters like `selectattr`, `map`, and `default` to slice and dice the returned data however you need. Every production playbook should include verification steps that query actual state rather than assuming the desired state was achieved.
