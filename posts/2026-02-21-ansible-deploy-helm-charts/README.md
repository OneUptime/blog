# How to Use Ansible to Deploy Helm Charts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Helm, DevOps, Deployment

Description: Deploy and manage Helm charts using Ansible's helm module for installing, upgrading, and configuring applications on Kubernetes clusters.

---

Helm is the de facto package manager for Kubernetes. It bundles Kubernetes manifests into charts that can be versioned, shared, and deployed with configurable values. When you combine Helm with Ansible, you get the best of both worlds: Helm's packaging and templating for Kubernetes applications, and Ansible's orchestration and inventory management for deployment workflows.

This guide covers using Ansible's `kubernetes.core.helm` module to install charts, customize values, manage repositories, and handle upgrades and rollbacks.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- Helm 3 installed on the Ansible control node
- A valid kubeconfig
- Python `kubernetes` library

```bash
# Install the Ansible collection
ansible-galaxy collection install kubernetes.core

# Install Helm 3 (if not already installed)
curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Install Python dependencies
pip install kubernetes
```

## Adding Helm Repositories

Before installing charts, you need to add the repository that hosts them.

```yaml
# playbook: setup-helm-repos.yml
# Adds commonly used Helm chart repositories
---
- name: Configure Helm Repositories
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Add Helm repositories
      kubernetes.core.helm_repository:
        name: "{{ item.name }}"
        repo_url: "{{ item.url }}"
      loop:
        - name: bitnami
          url: https://charts.bitnami.com/bitnami
        - name: ingress-nginx
          url: https://kubernetes.github.io/ingress-nginx
        - name: jetstack
          url: https://charts.jetstack.io
        - name: prometheus-community
          url: https://prometheus-community.github.io/helm-charts
        - name: grafana
          url: https://grafana.github.io/helm-charts
      loop_control:
        label: "{{ item.name }}"
```

## Installing a Helm Chart

The `kubernetes.core.helm` module installs, upgrades, and uninstalls Helm releases.

```yaml
# playbook: install-nginx-ingress.yml
# Installs the nginx Ingress controller using Helm
---
- name: Install Nginx Ingress Controller
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Add ingress-nginx repository
      kubernetes.core.helm_repository:
        name: ingress-nginx
        repo_url: https://kubernetes.github.io/ingress-nginx

    - name: Install nginx ingress controller
      kubernetes.core.helm:
        name: ingress-nginx
        chart_ref: ingress-nginx/ingress-nginx
        release_namespace: ingress-nginx
        create_namespace: true
        chart_version: "4.9.0"
        values:
          controller:
            replicaCount: 2
            resources:
              requests:
                cpu: 100m
                memory: 128Mi
              limits:
                cpu: 500m
                memory: 256Mi
            service:
              type: LoadBalancer
              annotations:
                service.beta.kubernetes.io/aws-load-balancer-type: nlb
            metrics:
              enabled: true
              serviceMonitor:
                enabled: true
        wait: true
        timeout: "10m0s"
```

The `values` parameter accepts the same structure as a `values.yaml` file. The `wait: true` option tells Helm to wait for all resources to be ready before reporting success, and `timeout` sets how long to wait.

## Installing the Prometheus Monitoring Stack

A more complex example with many custom values.

```yaml
# playbook: install-prometheus-stack.yml
# Deploys the kube-prometheus-stack with custom alerting and retention
---
- name: Install Prometheus Monitoring Stack
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    monitoring_namespace: monitoring
    retention_days: 30
    storage_size: 50Gi

  tasks:
    - name: Add prometheus-community repository
      kubernetes.core.helm_repository:
        name: prometheus-community
        repo_url: https://prometheus-community.github.io/helm-charts

    - name: Install kube-prometheus-stack
      kubernetes.core.helm:
        name: prometheus
        chart_ref: prometheus-community/kube-prometheus-stack
        release_namespace: "{{ monitoring_namespace }}"
        create_namespace: true
        chart_version: "55.5.0"
        values:
          prometheus:
            prometheusSpec:
              retention: "{{ retention_days }}d"
              storageSpec:
                volumeClaimTemplate:
                  spec:
                    storageClassName: standard
                    accessModes:
                      - ReadWriteOnce
                    resources:
                      requests:
                        storage: "{{ storage_size }}"
              resources:
                requests:
                  cpu: 500m
                  memory: 2Gi
                limits:
                  cpu: 2
                  memory: 4Gi
          grafana:
            enabled: true
            adminPassword: "{{ lookup('env', 'GRAFANA_ADMIN_PASSWORD') | default('changeme', true) }}"
            persistence:
              enabled: true
              size: 10Gi
          alertmanager:
            alertmanagerSpec:
              storage:
                volumeClaimTemplate:
                  spec:
                    storageClassName: standard
                    accessModes:
                      - ReadWriteOnce
                    resources:
                      requests:
                        storage: 5Gi
        wait: true
        timeout: "15m0s"
```

## Using a Values File from Disk

For charts with complex configurations, keeping values in a separate file is cleaner than embedding them in the playbook.

```yaml
# playbook: install-chart-with-values-file.yml
# Installs a Helm chart using a values file from disk
---
- name: Install chart with external values
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Install Redis with values from file
      kubernetes.core.helm:
        name: redis
        chart_ref: bitnami/redis
        release_namespace: databases
        create_namespace: true
        chart_version: "18.6.1"
        # Load values from a local YAML file
        values_files:
          - values/redis-production.yml
        wait: true
        timeout: "10m0s"
```

The values file might look like this:

```yaml
# values/redis-production.yml
# Production Redis configuration with persistence and high availability
architecture: replication
auth:
  enabled: true
  existingSecret: redis-credentials
  existingSecretPasswordKey: password
master:
  persistence:
    enabled: true
    size: 10Gi
  resources:
    requests:
      cpu: 250m
      memory: 256Mi
    limits:
      cpu: 1
      memory: 1Gi
replica:
  replicaCount: 3
  persistence:
    enabled: true
    size: 10Gi
  resources:
    requests:
      cpu: 100m
      memory: 128Mi
    limits:
      cpu: 500m
      memory: 512Mi
```

## Upgrading a Helm Release

To upgrade an existing release with new values or a new chart version, use the same `helm` module with updated parameters.

```yaml
# playbook: upgrade-release.yml
# Upgrades an existing Helm release to a new version
---
- name: Upgrade Helm Release
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    new_version: "4.10.0"

  tasks:
    - name: Get current release info
      kubernetes.core.helm_info:
        name: ingress-nginx
        release_namespace: ingress-nginx
      register: release_info

    - name: Show current version
      ansible.builtin.debug:
        msg: "Current chart version: {{ release_info.status.chart }}"
      when: release_info.status is defined

    - name: Upgrade ingress-nginx
      kubernetes.core.helm:
        name: ingress-nginx
        chart_ref: ingress-nginx/ingress-nginx
        release_namespace: ingress-nginx
        chart_version: "{{ new_version }}"
        values:
          controller:
            replicaCount: 3
            resources:
              requests:
                cpu: 200m
                memory: 256Mi
        wait: true
        timeout: "10m0s"
        atomic: true
      register: upgrade_result

    - name: Show upgrade status
      ansible.builtin.debug:
        msg: "Upgrade {{ 'completed successfully' if upgrade_result.changed else 'not needed (already at target version)' }}"
```

The `atomic: true` flag is crucial for production upgrades. It tells Helm to automatically roll back if the upgrade fails or times out. Without it, a failed upgrade leaves you in a partially updated state.

## Deploying Multiple Charts

A typical cluster needs several charts installed. Deploy them all from a single playbook.

```yaml
# playbook: install-cluster-services.yml
# Installs all infrastructure charts for a new cluster
---
- name: Install cluster infrastructure services
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    helm_releases:
      - name: cert-manager
        repo_name: jetstack
        repo_url: https://charts.jetstack.io
        chart: jetstack/cert-manager
        namespace: cert-manager
        version: "v1.13.3"
        values:
          installCRDs: true
      - name: ingress-nginx
        repo_name: ingress-nginx
        repo_url: https://kubernetes.github.io/ingress-nginx
        chart: ingress-nginx/ingress-nginx
        namespace: ingress-nginx
        version: "4.9.0"
        values:
          controller:
            replicaCount: 2
      - name: external-dns
        repo_name: bitnami
        repo_url: https://charts.bitnami.com/bitnami
        chart: bitnami/external-dns
        namespace: external-dns
        version: "6.31.0"
        values:
          provider: aws
          policy: sync

  tasks:
    - name: Add all Helm repositories
      kubernetes.core.helm_repository:
        name: "{{ item.repo_name }}"
        repo_url: "{{ item.repo_url }}"
      loop: "{{ helm_releases }}"
      loop_control:
        label: "{{ item.repo_name }}"

    - name: Install each Helm chart
      kubernetes.core.helm:
        name: "{{ item.name }}"
        chart_ref: "{{ item.chart }}"
        release_namespace: "{{ item.namespace }}"
        create_namespace: true
        chart_version: "{{ item.version }}"
        values: "{{ item.values }}"
        wait: true
        timeout: "10m0s"
      loop: "{{ helm_releases }}"
      loop_control:
        label: "{{ item.name }}"
```

## Uninstalling a Helm Release

When you need to remove a chart and all its resources:

```yaml
# task: uninstall a Helm release
- name: Uninstall the Redis release
  kubernetes.core.helm:
    name: redis
    release_namespace: databases
    state: absent
    wait: true
```

Setting `state: absent` triggers an uninstall. The `wait: true` ensures all resources are deleted before the task completes.

## Summary

Combining Ansible and Helm gives you a powerful deployment workflow. Helm handles the complexity of packaging and templating Kubernetes applications, while Ansible provides the orchestration layer for deploying them across environments. The `kubernetes.core.helm` module supports everything from simple installs to complex multi-chart deployments with custom values. Use `atomic: true` for production upgrades, keep your values files alongside your playbooks for version control, and let Ansible's inventory and variable system drive environment-specific configurations.
