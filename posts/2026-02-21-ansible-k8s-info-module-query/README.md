# How to Use Ansible k8s_info Module to Query Kubernetes Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, k8s_info, Querying, DevOps

Description: Master the Ansible k8s_info module with advanced filtering, field selectors, label queries, and data extraction techniques for Kubernetes resources.

---

The `kubernetes.core.k8s_info` module is the read-only counterpart to `k8s`. While `k8s` creates, updates, and deletes resources, `k8s_info` queries the Kubernetes API to retrieve resource details. It returns structured data that you can filter, transform, and use to drive decisions in your playbooks.

This guide goes deep into `k8s_info` with advanced query techniques, Jinja2 data processing, and real-world patterns for cluster auditing, health checking, and dynamic playbook behavior.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A valid kubeconfig

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Module Parameters

The `k8s_info` module accepts these key parameters:

- `kind`: The resource type (Deployment, Pod, Service, etc.)
- `api_version`: The API version (apps/v1, v1, networking.k8s.io/v1, etc.)
- `name`: Query a specific resource by name
- `namespace`: The namespace to search in (omit for cluster-scoped or all-namespace queries)
- `label_selectors`: Filter by labels (list of strings)
- `field_selectors`: Filter by fields (list of strings)

## Querying by Name

The most direct query returns a single resource.

```yaml
# playbook: query-by-name.yml
# Retrieves a specific Deployment by name and extracts key details
---
- name: Query specific resource
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Get the web-api deployment
      kubernetes.core.k8s_info:
        kind: Deployment
        api_version: apps/v1
        name: web-api
        namespace: production
      register: result

    - name: Show the full resource
      ansible.builtin.debug:
        var: result.resources[0]
      when: result.resources | length > 0

    - name: Handle missing resource
      ansible.builtin.debug:
        msg: "Resource not found"
      when: result.resources | length == 0
```

Always check `result.resources | length > 0` before accessing `resources[0]`. If the resource does not exist, the list is empty (not an error).

## Advanced Label Selectors

Label selectors support equality, inequality, set-based, and existence checks.

```yaml
# playbook: label-selector-examples.yml
# Demonstrates different label selector patterns
---
- name: Query with label selectors
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Equality selector - exact match
      kubernetes.core.k8s_info:
        kind: Pod
        namespace: production
        label_selectors:
          - "app=web-api"
          - "tier=frontend"
      register: eq_pods

    - name: Inequality selector - exclude a label value
      kubernetes.core.k8s_info:
        kind: Pod
        namespace: production
        label_selectors:
          - "app=web-api"
          - "environment!=test"
      register: neq_pods

    - name: Set-based selector - match any of several values
      kubernetes.core.k8s_info:
        kind: Pod
        namespace: production
        label_selectors:
          - "tier in (frontend, backend)"
      register: set_pods

    - name: Existence selector - has the label regardless of value
      kubernetes.core.k8s_info:
        kind: Pod
        namespace: production
        label_selectors:
          - "version"
      register: labeled_pods

    - name: Non-existence selector - does not have the label
      kubernetes.core.k8s_info:
        kind: Pod
        namespace: production
        label_selectors:
          - "!canary"
      register: non_canary_pods

    - name: Display counts
      ansible.builtin.debug:
        msg:
          exact_match: "{{ eq_pods.resources | length }}"
          not_test: "{{ neq_pods.resources | length }}"
          frontend_or_backend: "{{ set_pods.resources | length }}"
          has_version_label: "{{ labeled_pods.resources | length }}"
          not_canary: "{{ non_canary_pods.resources | length }}"
```

## Field Selectors

Field selectors filter on actual resource fields rather than labels.

```yaml
# playbook: field-selector-examples.yml
# Uses field selectors to query by resource status and metadata
---
- name: Query with field selectors
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Find running pods on a specific node
      kubernetes.core.k8s_info:
        kind: Pod
        namespace: production
        field_selectors:
          - "status.phase=Running"
          - "spec.nodeName=worker-node-1"
      register: node_pods

    - name: Find all non-running pods
      kubernetes.core.k8s_info:
        kind: Pod
        namespace: production
        field_selectors:
          - "status.phase!=Running"
      register: problem_pods

    - name: Find a specific service account's pods
      kubernetes.core.k8s_info:
        kind: Pod
        namespace: production
        field_selectors:
          - "spec.serviceAccountName=web-api-sa"
      register: sa_pods

    - name: Display results
      ansible.builtin.debug:
        msg:
          pods_on_node1: "{{ node_pods.resources | length }}"
          non_running_pods: "{{ problem_pods.resources | length }}"
          sa_pods: "{{ sa_pods.resources | length }}"
```

Note that field selectors are more limited than label selectors. Not all fields are indexable. The Kubernetes API supports field selectors for `metadata.name`, `metadata.namespace`, `status.phase` (for pods), and `spec.nodeName`.

## Processing Query Results with Jinja2

The real power of `k8s_info` comes from processing the results with Jinja2 filters.

```yaml
# playbook: process-results.yml
# Demonstrates advanced result processing with Jinja2
---
- name: Process query results
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Get all deployments in production
      kubernetes.core.k8s_info:
        kind: Deployment
        namespace: production
      register: all_deploys

    - name: Extract just the names
      ansible.builtin.set_fact:
        deploy_names: "{{ all_deploys.resources | map(attribute='metadata.name') | list }}"

    - name: Find deployments with fewer ready replicas than desired
      ansible.builtin.set_fact:
        degraded_deploys: "{{ all_deploys.resources | selectattr('status.readyReplicas', 'defined') | rejectattr('status.readyReplicas', 'equalto', none) | list | json_query('[?status.readyReplicas < spec.replicas]') }}"

    - name: Find deployments using a specific image registry
      ansible.builtin.set_fact:
        internal_deploys: "{{ all_deploys.resources | selectattr('spec.template.spec.containers', 'defined') | list }}"

    - name: Extract container images from all deployments
      ansible.builtin.set_fact:
        all_images: "{{ all_deploys.resources | map(attribute='spec.template.spec.containers') | flatten | map(attribute='image') | unique | sort | list }}"

    - name: Display findings
      ansible.builtin.debug:
        msg:
          total_deployments: "{{ all_deploys.resources | length }}"
          deployment_names: "{{ deploy_names }}"
          unique_images: "{{ all_images }}"
```

## Querying Custom Resources (CRDs)

`k8s_info` works with any resource type, including custom resources.

```yaml
# playbook: query-custom-resources.yml
# Queries custom resources from various operators
---
- name: Query Custom Resources
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Get all cert-manager Certificates
      kubernetes.core.k8s_info:
        api_version: cert-manager.io/v1
        kind: Certificate
        namespace: production
      register: certs

    - name: Show certificate expiry status
      ansible.builtin.debug:
        msg: "{{ item.metadata.name }}: Ready={{ item.status.conditions | selectattr('type', 'equalto', 'Ready') | map(attribute='status') | first }}"
      loop: "{{ certs.resources }}"
      loop_control:
        label: "{{ item.metadata.name }}"
      when: certs.resources | length > 0

    - name: Get all Prometheus ServiceMonitors
      kubernetes.core.k8s_info:
        api_version: monitoring.coreos.com/v1
        kind: ServiceMonitor
        namespace: monitoring
      register: monitors

    - name: List monitored services
      ansible.builtin.debug:
        msg: "{{ item.metadata.name }} monitors: {{ item.spec.selector.matchLabels | default({}) }}"
      loop: "{{ monitors.resources }}"
      loop_control:
        label: "{{ item.metadata.name }}"
      when: monitors.resources | length > 0
```

## Building Dynamic Inventory from k8s_info

Use `k8s_info` results to drive dynamic behavior in your playbooks.

```yaml
# playbook: dynamic-behavior.yml
# Uses query results to conditionally execute tasks
---
- name: Dynamic playbook behavior
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Check if the database is deployed
      kubernetes.core.k8s_info:
        kind: StatefulSet
        name: postgres
        namespace: databases
      register: db_check

    - name: Deploy the application database
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: StatefulSet
          metadata:
            name: postgres
            namespace: databases
          spec:
            serviceName: postgres
            replicas: 1
            selector:
              matchLabels:
                app: postgres
            template:
              metadata:
                labels:
                  app: postgres
              spec:
                containers:
                  - name: postgres
                    image: postgres:15
      when: db_check.resources | length == 0

    - name: Get current replica count for scaling decisions
      kubernetes.core.k8s_info:
        kind: Deployment
        name: web-api
        namespace: production
      register: current_deploy

    - name: Scale up if under-replicated
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: web-api
            namespace: production
          spec:
            replicas: 5
      when:
        - current_deploy.resources | length > 0
        - current_deploy.resources[0].spec.replicas < 5
```

## Cluster-Wide Resource Audit

Query resources across all namespaces for compliance auditing.

```yaml
# playbook: cluster-audit.yml
# Audits the cluster for security and compliance concerns
---
- name: Cluster security audit
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Find pods running as root
      kubernetes.core.k8s_info:
        kind: Pod
      register: all_pods

    - name: Identify privileged containers
      ansible.builtin.debug:
        msg: "WARNING: {{ item.metadata.namespace }}/{{ item.metadata.name }} has containers without security context"
      loop: "{{ all_pods.resources }}"
      loop_control:
        label: "{{ item.metadata.namespace }}/{{ item.metadata.name }}"
      when: item.spec.containers | selectattr('securityContext', 'undefined') | list | length > 0

    - name: Find services of type LoadBalancer
      kubernetes.core.k8s_info:
        kind: Service
      register: all_services

    - name: List external services
      ansible.builtin.debug:
        msg: "External: {{ item.metadata.namespace }}/{{ item.metadata.name }} ({{ item.spec.type }})"
      loop: "{{ all_services.resources | selectattr('spec.type', 'equalto', 'LoadBalancer') | list }}"
      loop_control:
        label: "{{ item.metadata.name }}"
```

## Summary

The `k8s_info` module is the foundation for intelligent Ansible playbooks that respond to cluster state rather than blindly applying changes. It supports every resource type including CRDs, handles filtering through labels and field selectors, and returns structured data that integrates naturally with Jinja2's filtering capabilities. Use it for pre-flight checks before deployments, health verification after changes, compliance auditing, and building dynamic playbook logic. Any playbook that modifies cluster state should also query it first.
