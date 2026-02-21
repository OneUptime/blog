# How to Use Ansible to Manage Kubernetes Annotations and Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Labels, Annotations, Resource Management

Description: Manage Kubernetes resource annotations and labels with Ansible for organizing, selecting, and attaching metadata to cluster resources.

---

Labels and annotations are the metadata layer of Kubernetes. Labels are used for selection and grouping: you attach them to resources and then use selectors to find, route traffic to, or apply policies against matching resources. Annotations store non-identifying information: build versions, owner contacts, monitoring configurations, and notes for operators.

Managing labels and annotations through Ansible ensures your metadata strategy is consistent across resources and environments. This guide covers adding, updating, and removing labels and annotations, along with practical patterns for resource organization.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A valid kubeconfig

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Labels vs Annotations

The distinction matters:

**Labels** are for identification and selection. They show up in `kubectl get` output, and selectors (in Services, Deployments, Network Policies) use them to target resources.

**Annotations** are for attaching arbitrary metadata. They are not used for selection but are often consumed by controllers, operators, and tooling (like the nginx Ingress controller reading annotation-based configuration).

## Adding Labels to Resources

```yaml
# playbook: add-labels.yml
# Adds a standard set of labels to a Deployment
---
- name: Add labels to Kubernetes resources
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Label a deployment with organizational metadata
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: web-api
            namespace: production
            labels:
              app: web-api
              version: "v2.5.0"
              team: backend
              environment: production
              managed-by: ansible
              part-of: e-commerce-platform
```

Kubernetes recommends using the `app.kubernetes.io/` prefix for standard labels. Here is a more complete labeling scheme:

```yaml
# task: apply recommended Kubernetes labels
- name: Apply standard Kubernetes labels
  kubernetes.core.k8s:
    state: present
    definition:
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: web-api
        namespace: production
        labels:
          app.kubernetes.io/name: web-api
          app.kubernetes.io/version: "2.5.0"
          app.kubernetes.io/component: api
          app.kubernetes.io/part-of: ecommerce
          app.kubernetes.io/managed-by: ansible
          app.kubernetes.io/instance: web-api-production
```

## Adding Annotations to Resources

Annotations carry metadata that tools and controllers read.

```yaml
# playbook: add-annotations.yml
# Adds operational annotations to a Deployment
---
- name: Add annotations to Kubernetes resources
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    deploy_timestamp: "{{ lookup('pipe', 'date -u +%Y-%m-%dT%H:%M:%SZ') }}"
    git_commit: "{{ lookup('pipe', 'git rev-parse HEAD') | default('unknown') }}"

  tasks:
    - name: Annotate deployment with build and operational metadata
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: web-api
            namespace: production
            annotations:
              deployment.company.com/deployed-at: "{{ deploy_timestamp }}"
              deployment.company.com/deployed-by: "ansible-pipeline"
              deployment.company.com/git-commit: "{{ git_commit }}"
              deployment.company.com/team-owner: "backend-team"
              deployment.company.com/slack-channel: "#backend-alerts"
              deployment.company.com/runbook: "https://wiki.company.com/runbooks/web-api"
              prometheus.io/scrape: "true"
              prometheus.io/port: "9090"
```

Using a company-specific prefix (like `deployment.company.com/`) for your custom annotations prevents collisions with annotations used by Kubernetes itself or third-party controllers.

## Bulk Labeling with Loops

Apply a consistent labeling strategy across multiple resources.

```yaml
# playbook: bulk-label.yml
# Applies consistent labels to multiple resources
---
- name: Bulk label resources
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: production
    standard_labels:
      team: backend
      environment: production
      managed-by: ansible
      cost-center: "cc-1234"
    resources_to_label:
      - kind: Deployment
        name: web-api
      - kind: Deployment
        name: worker
      - kind: Service
        name: web-api
      - kind: Service
        name: worker
      - kind: ConfigMap
        name: app-config
      - kind: Secret
        name: app-secrets

  tasks:
    - name: Get current resource definition
      kubernetes.core.k8s_info:
        kind: "{{ item.kind }}"
        name: "{{ item.name }}"
        namespace: "{{ namespace }}"
      register: current_resources
      loop: "{{ resources_to_label }}"
      loop_control:
        label: "{{ item.kind }}/{{ item.name }}"

    - name: Apply standard labels to each resource
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: "{{ item.resources[0].apiVersion }}"
          kind: "{{ item.item.kind }}"
          metadata:
            name: "{{ item.item.name }}"
            namespace: "{{ namespace }}"
            labels: "{{ (item.resources[0].metadata.labels | default({})) | combine(standard_labels) }}"
      loop: "{{ current_resources.results }}"
      loop_control:
        label: "{{ item.item.kind }}/{{ item.item.name }}"
      when: item.resources | length > 0
```

This pattern reads each resource's existing labels, merges in the standard labels with `combine`, and applies the result. Existing labels are preserved, new ones are added.

## Annotation-Based Configuration for Ingress

Annotations drive configuration for many Kubernetes controllers. The nginx Ingress controller is a prime example.

```yaml
# playbook: configure-ingress-annotations.yml
# Uses annotations to configure Ingress behavior
---
- name: Configure Ingress with annotations
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    ingress_configs:
      - name: web-api-ingress
        annotations:
          nginx.ingress.kubernetes.io/ssl-redirect: "true"
          nginx.ingress.kubernetes.io/proxy-body-size: "50m"
          nginx.ingress.kubernetes.io/proxy-read-timeout: "120"
          nginx.ingress.kubernetes.io/proxy-send-timeout: "120"
          nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, OPTIONS"
          nginx.ingress.kubernetes.io/cors-allow-origin: "https://app.company.com"
          nginx.ingress.kubernetes.io/enable-cors: "true"
      - name: websocket-ingress
        annotations:
          nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
          nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
          nginx.ingress.kubernetes.io/websocket-services: "ws-service"

  tasks:
    - name: Apply Ingress annotations
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: networking.k8s.io/v1
          kind: Ingress
          metadata:
            name: "{{ item.name }}"
            namespace: production
            annotations: "{{ item.annotations }}"
          spec:
            rules:
              - host: "{{ item.name | replace('-ingress', '') }}.company.com"
                http:
                  paths:
                    - path: /
                      pathType: Prefix
                      backend:
                        service:
                          name: "{{ item.name | replace('-ingress', '') }}"
                          port:
                            number: 80
      loop: "{{ ingress_configs }}"
      loop_control:
        label: "{{ item.name }}"
```

## Querying Resources by Labels

Labels are most useful when you query by them.

```yaml
# playbook: query-by-labels.yml
# Finds and reports on resources matching label criteria
---
- name: Query resources by labels
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Find all resources owned by the backend team
      kubernetes.core.k8s_info:
        kind: Deployment
        namespace: production
        label_selectors:
          - "team=backend"
      register: backend_deploys

    - name: Find deployments without the managed-by label
      kubernetes.core.k8s_info:
        kind: Deployment
        namespace: production
      register: all_deploys

    - name: Report unlabeled deployments
      ansible.builtin.debug:
        msg: "Missing managed-by label: {{ item.metadata.name }}"
      loop: "{{ all_deploys.resources }}"
      loop_control:
        label: "{{ item.metadata.name }}"
      when: "'managed-by' not in (item.metadata.labels | default({}))"

    - name: Find all production services for cost allocation
      kubernetes.core.k8s_info:
        kind: Service
        namespace: production
        label_selectors:
          - "cost-center"
      register: labeled_services

    - name: Group services by cost center
      ansible.builtin.debug:
        msg: "Cost center {{ item.metadata.labels['cost-center'] }}: {{ item.metadata.name }}"
      loop: "{{ labeled_services.resources }}"
      loop_control:
        label: "{{ item.metadata.name }}"
```

## Removing Labels and Annotations

To remove a label or annotation, you need to patch the resource. The `k8s` module with `strategic-merge` can handle this.

```yaml
# playbook: remove-labels.yml
# Removes specific labels from a resource using JSON patch
---
- name: Remove labels from resources
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Get current deployment
      kubernetes.core.k8s_info:
        kind: Deployment
        name: web-api
        namespace: production
      register: current

    - name: Build new labels without the one to remove
      ansible.builtin.set_fact:
        updated_labels: "{{ current.resources[0].metadata.labels | dict2items | rejectattr('key', 'equalto', 'deprecated-label') | items2dict }}"

    - name: Apply updated labels
      kubernetes.core.k8s:
        state: present
        force: true
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: web-api
            namespace: production
            labels: "{{ updated_labels }}"
```

## Label-Based Deployment Tracking

Use labels to track which version of your application is running.

```yaml
# playbook: track-deployments.yml
# Uses labels to track deployment versions across services
---
- name: Track deployment versions
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    release_version: "v2.5.0"
    release_date: "2026-02-21"

  tasks:
    - name: Update version labels on deployment
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: web-api
            namespace: production
            labels:
              app.kubernetes.io/version: "{{ release_version }}"
            annotations:
              deployment.company.com/release-date: "{{ release_date }}"
              deployment.company.com/release-notes: "https://github.com/company/web-api/releases/{{ release_version }}"
          spec:
            template:
              metadata:
                labels:
                  app.kubernetes.io/version: "{{ release_version }}"

    - name: Verify version labels across all components
      kubernetes.core.k8s_info:
        kind: Deployment
        namespace: production
        label_selectors:
          - "app.kubernetes.io/part-of=ecommerce"
      register: platform_deploys

    - name: Show version distribution
      ansible.builtin.debug:
        msg: "{{ item.metadata.name }}: {{ item.metadata.labels['app.kubernetes.io/version'] | default('unlabeled') }}"
      loop: "{{ platform_deploys.resources }}"
      loop_control:
        label: "{{ item.metadata.name }}"
```

## Summary

Labels and annotations are how you bring order to a Kubernetes cluster. Labels enable selection, grouping, and targeting for Services, Network Policies, and queries. Annotations carry operational metadata that helps humans and tools understand the state and context of resources. Managing them through Ansible ensures consistency across your infrastructure. Adopt a labeling convention early (the `app.kubernetes.io/` prefix is a solid starting point), apply it uniformly through playbooks, and use label queries to audit compliance. The small investment in metadata pays off enormously when you need to answer questions like "which team owns this service" or "what version is running in production" at 2 AM.
