# How to Use Ansible to Wait for Kubernetes Deployment Readiness

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Deployments, Readiness, CI/CD

Description: Implement deployment readiness checks with Ansible to ensure Kubernetes workloads are fully available before proceeding with pipeline steps.

---

Deploying to Kubernetes is asynchronous. When you create or update a Deployment, Kubernetes acknowledges the change immediately, but the actual rollout takes time. New pods need to be scheduled, containers pulled, health checks passed. If your pipeline moves to the next step (running tests, switching traffic, notifying Slack) before the rollout is complete, you risk testing against the old version or routing traffic to pods that are not ready.

Ansible's `kubernetes.core.k8s_info` module with `until` loops lets you wait for Kubernetes resources to reach the desired state before continuing. This guide covers patterns for waiting on Deployments, StatefulSets, DaemonSets, and custom readiness conditions.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A valid kubeconfig

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Why Waiting Matters

Consider this sequence in a CI/CD pipeline:

1. Update the Deployment with a new image tag
2. Run integration tests against the service
3. Update the Ingress to point to the new version

Without a wait step between 1 and 2, your tests might hit pods still running the old image. The result: false positives or confusing test failures that waste debugging time.

## Basic Deployment Readiness Wait

The simplest pattern: poll the Deployment status until all replicas are updated and ready.

```yaml
# playbook: deploy-and-wait.yml
# Deploys a new version and waits for rollout completion
---
- name: Deploy and wait for readiness
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    app_name: web-api
    namespace: production
    new_image: "registry.company.com/web-api:v2.5.0"

  tasks:
    - name: Update the deployment image
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ namespace }}"
          spec:
            template:
              spec:
                containers:
                  - name: "{{ app_name }}"
                    image: "{{ new_image }}"

    - name: Wait for deployment rollout to complete
      kubernetes.core.k8s_info:
        kind: Deployment
        name: "{{ app_name }}"
        namespace: "{{ namespace }}"
      register: deploy_status
      until:
        - deploy_status.resources | length > 0
        - deploy_status.resources[0].status.updatedReplicas is defined
        - deploy_status.resources[0].status.updatedReplicas == deploy_status.resources[0].spec.replicas
        - deploy_status.resources[0].status.readyReplicas is defined
        - deploy_status.resources[0].status.readyReplicas == deploy_status.resources[0].spec.replicas
        - deploy_status.resources[0].status.unavailableReplicas is not defined or deploy_status.resources[0].status.unavailableReplicas == 0
      retries: 60
      delay: 10
```

Let's break down the conditions:

- `updatedReplicas == spec.replicas`: All pods have the new template
- `readyReplicas == spec.replicas`: All pods are passing readiness probes
- `unavailableReplicas` is not defined or zero: No pods are in a failed state

The `retries: 60` with `delay: 10` gives a 10-minute window. Adjust based on your application's startup time.

## Waiting with a Timeout and Failure Handling

For CI/CD pipelines, you need to handle the case where the rollout fails or takes too long.

```yaml
# playbook: deploy-with-rollback.yml
# Deploys, waits for readiness, and rolls back on failure
---
- name: Deploy with rollback safety
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    app_name: web-api
    namespace: production
    new_image: "registry.company.com/web-api:v2.5.0"

  tasks:
    - name: Get current deployment state before update
      kubernetes.core.k8s_info:
        kind: Deployment
        name: "{{ app_name }}"
        namespace: "{{ namespace }}"
      register: pre_deploy

    - name: Record the current image for potential rollback
      ansible.builtin.set_fact:
        previous_image: "{{ pre_deploy.resources[0].spec.template.spec.containers[0].image }}"

    - name: Update the deployment
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ namespace }}"
          spec:
            template:
              spec:
                containers:
                  - name: "{{ app_name }}"
                    image: "{{ new_image }}"

    - name: Wait for rollout to complete
      kubernetes.core.k8s_info:
        kind: Deployment
        name: "{{ app_name }}"
        namespace: "{{ namespace }}"
      register: deploy_status
      until:
        - deploy_status.resources[0].status.updatedReplicas is defined
        - deploy_status.resources[0].status.updatedReplicas == deploy_status.resources[0].spec.replicas
        - deploy_status.resources[0].status.readyReplicas is defined
        - deploy_status.resources[0].status.readyReplicas == deploy_status.resources[0].spec.replicas
      retries: 30
      delay: 10
      register: wait_result
      ignore_errors: true

    - name: Rollback if deployment failed
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ namespace }}"
          spec:
            template:
              spec:
                containers:
                  - name: "{{ app_name }}"
                    image: "{{ previous_image }}"
      when: wait_result is failed

    - name: Fail the pipeline if rollback was needed
      ansible.builtin.fail:
        msg: "Deployment of {{ new_image }} failed. Rolled back to {{ previous_image }}"
      when: wait_result is failed
```

## Waiting for StatefulSet Readiness

StatefulSets have slightly different status fields. They roll out one pod at a time by default, so the wait can be longer.

```yaml
# task: wait for StatefulSet rollout
- name: Wait for StatefulSet to be ready
  kubernetes.core.k8s_info:
    kind: StatefulSet
    name: postgres
    namespace: databases
  register: sts_status
  until:
    - sts_status.resources[0].status.readyReplicas is defined
    - sts_status.resources[0].status.readyReplicas == sts_status.resources[0].spec.replicas
    - sts_status.resources[0].status.currentRevision == sts_status.resources[0].status.updateRevision
  retries: 120
  delay: 10
```

The `currentRevision == updateRevision` check ensures that all pods have been updated to the new revision. Without it, you might see all replicas as ready but some still running the old version.

## Waiting for DaemonSet Rollout

DaemonSets update across all nodes, so the wait depends on cluster size.

```yaml
# task: wait for DaemonSet to complete its rollout
- name: Wait for DaemonSet rollout
  kubernetes.core.k8s_info:
    kind: DaemonSet
    name: fluent-bit
    namespace: logging
  register: ds_status
  until:
    - ds_status.resources[0].status.desiredNumberScheduled is defined
    - ds_status.resources[0].status.numberReady == ds_status.resources[0].status.desiredNumberScheduled
    - ds_status.resources[0].status.updatedNumberScheduled == ds_status.resources[0].status.desiredNumberScheduled
  retries: 120
  delay: 10
```

## Waiting for a Specific Pod Condition

Sometimes you need to wait for a specific pod, not just the overall deployment status.

```yaml
# task: wait for a specific pod to be in Running phase
- name: Wait for migration pod to complete
  kubernetes.core.k8s_info:
    kind: Pod
    namespace: production
    label_selectors:
      - "app=db-migration"
      - "version=v2.5.0"
  register: migration_pods
  until:
    - migration_pods.resources | length > 0
    - migration_pods.resources[0].status.phase in ['Succeeded', 'Failed']
  retries: 60
  delay: 10

- name: Verify migration succeeded
  ansible.builtin.assert:
    that:
      - migration_pods.resources[0].status.phase == 'Succeeded'
    fail_msg: "Database migration failed! Check pod logs."
```

## Waiting for Service Endpoints

Even after a Deployment is ready, the Service might not have updated its endpoints yet. This matters for zero-downtime deployments.

```yaml
# task: wait for service to have healthy endpoints
- name: Wait for service endpoints to be ready
  kubernetes.core.k8s_info:
    kind: Endpoints
    name: web-api
    namespace: production
  register: endpoints
  until:
    - endpoints.resources | length > 0
    - endpoints.resources[0].subsets is defined
    - endpoints.resources[0].subsets | length > 0
    - endpoints.resources[0].subsets[0].addresses is defined
    - endpoints.resources[0].subsets[0].addresses | length >= 3
  retries: 30
  delay: 5
```

## Complete CI/CD Pipeline Example

Here is a full pipeline that combines several wait patterns.

```yaml
# playbook: cicd-pipeline.yml
# Complete CI/CD pipeline with readiness gates at each step
---
- name: CI/CD Deployment Pipeline
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    app_name: web-api
    namespace: production
    new_version: "v2.5.0"
    image: "registry.company.com/web-api:{{ new_version }}"

  tasks:
    - name: Step 1 - Run database migration
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: batch/v1
          kind: Job
          metadata:
            name: "migration-{{ new_version | replace('.', '-') }}"
            namespace: "{{ namespace }}"
          spec:
            backoffLimit: 0
            template:
              spec:
                restartPolicy: Never
                containers:
                  - name: migrate
                    image: "{{ image }}"
                    command: ["python", "manage.py", "migrate"]

    - name: Step 1b - Wait for migration to complete
      kubernetes.core.k8s_info:
        kind: Job
        name: "migration-{{ new_version | replace('.', '-') }}"
        namespace: "{{ namespace }}"
      register: migration_job
      until:
        - migration_job.resources[0].status.succeeded is defined
        - migration_job.resources[0].status.succeeded >= 1
      retries: 60
      delay: 10

    - name: Step 2 - Update the deployment
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ namespace }}"
          spec:
            template:
              metadata:
                labels:
                  app: "{{ app_name }}"
                  version: "{{ new_version }}"
              spec:
                containers:
                  - name: "{{ app_name }}"
                    image: "{{ image }}"

    - name: Step 2b - Wait for deployment readiness
      kubernetes.core.k8s_info:
        kind: Deployment
        name: "{{ app_name }}"
        namespace: "{{ namespace }}"
      register: deploy_status
      until:
        - deploy_status.resources[0].status.readyReplicas is defined
        - deploy_status.resources[0].status.readyReplicas == deploy_status.resources[0].spec.replicas
        - deploy_status.resources[0].status.updatedReplicas == deploy_status.resources[0].spec.replicas
      retries: 60
      delay: 10

    - name: Step 3 - Verify service endpoints
      kubernetes.core.k8s_info:
        kind: Endpoints
        name: "{{ app_name }}"
        namespace: "{{ namespace }}"
      register: endpoints
      until:
        - endpoints.resources[0].subsets is defined
        - endpoints.resources[0].subsets | length > 0
      retries: 12
      delay: 5

    - name: Pipeline complete
      ansible.builtin.debug:
        msg: "Deployment of {{ new_version }} completed successfully with {{ deploy_status.resources[0].status.readyReplicas }} ready replicas"
```

## Summary

Waiting for readiness is not optional in production deployment pipelines. Without it, you are flying blind between pipeline steps. Ansible's `until` loop combined with `kubernetes.core.k8s_info` gives you a flexible polling mechanism that works for any Kubernetes resource type. The key is knowing which status fields to check for each resource kind and setting appropriate retry counts and delays based on your application's startup characteristics. Build these wait steps into every deployment playbook, and your CI/CD pipeline will be reliable instead of racy.
