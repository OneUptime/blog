# How to Use Ansible to Delete Kubernetes Resources

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, Resource Management, Cleanup, DevOps

Description: Safely delete Kubernetes resources with Ansible using state absent, label selectors, grace periods, and cascading deletion strategies.

---

Deleting resources in Kubernetes is something you do carefully in production. A wrong delete can take down a service or wipe persistent data. Ansible provides a controlled way to remove Kubernetes resources with confirmation, conditional logic, and the ability to target specific resources by name, label, or entire namespaces. Using playbooks for deletion means the action is documented, repeatable, and reviewable through version control.

This guide covers deleting individual resources, bulk deletion by label, graceful shutdown with grace periods, cascade behavior, and safe patterns for production environments.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A valid kubeconfig
- Python `kubernetes` library

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Deleting a Single Resource

Set `state: absent` to delete a resource. This is the mirror of `state: present`.

```yaml
# playbook: delete-deployment.yml
# Deletes a specific Deployment by name
---
- name: Delete Kubernetes Deployment
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Delete the legacy API deployment
      kubernetes.core.k8s:
        state: absent
        kind: Deployment
        name: legacy-api
        namespace: production
        api_version: apps/v1
```

When you delete a Deployment, Kubernetes also deletes its ReplicaSets and pods. This is the default cascading behavior.

## Deleting with a Full Definition

You can also use the `definition` parameter with `state: absent`. This is useful when you want to delete the same resource you created.

```yaml
# task: delete a service using its full definition
- name: Delete the old service
  kubernetes.core.k8s:
    state: absent
    definition:
      apiVersion: v1
      kind: Service
      metadata:
        name: old-frontend
        namespace: production
```

Only the `apiVersion`, `kind`, `metadata.name`, and `metadata.namespace` fields matter for deletion. The rest of the definition is ignored.

## Deleting Resources from a Manifest File

If you have the manifest file that created the resources, you can use it to delete them too.

```yaml
# task: delete all resources defined in a manifest file
- name: Remove resources defined in the manifest
  kubernetes.core.k8s:
    state: absent
    src: manifests/old-app-stack.yml
```

For multi-document YAML files, this deletes every resource defined in the file.

## Bulk Deletion by Label

Deleting all resources matching a label selector is useful for tearing down an entire application or removing test resources.

```yaml
# playbook: delete-by-label.yml
# Deletes all resources matching a label selector
---
- name: Delete resources by label
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    target_label: "app=test-app"
    namespace: staging

  tasks:
    - name: Delete all Deployments with the target label
      kubernetes.core.k8s:
        state: absent
        kind: Deployment
        namespace: "{{ namespace }}"
        api_version: apps/v1
        label_selectors:
          - "{{ target_label }}"

    - name: Delete all Services with the target label
      kubernetes.core.k8s:
        state: absent
        kind: Service
        namespace: "{{ namespace }}"
        api_version: v1
        label_selectors:
          - "{{ target_label }}"

    - name: Delete all ConfigMaps with the target label
      kubernetes.core.k8s:
        state: absent
        kind: ConfigMap
        namespace: "{{ namespace }}"
        api_version: v1
        label_selectors:
          - "{{ target_label }}"

    - name: Delete all Secrets with the target label
      kubernetes.core.k8s:
        state: absent
        kind: Secret
        namespace: "{{ namespace }}"
        api_version: v1
        label_selectors:
          - "{{ target_label }}"
```

## Deleting an Entire Namespace

Deleting a namespace removes everything inside it. This is the nuclear option and should be used carefully.

```yaml
# playbook: delete-namespace.yml
# Deletes a namespace and all its contents
---
- name: Delete a Kubernetes namespace
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace_to_delete: test-environment
    # Safety check: never delete these namespaces
    protected_namespaces:
      - default
      - kube-system
      - kube-public
      - production

  tasks:
    - name: Verify namespace is not protected
      ansible.builtin.assert:
        that:
          - namespace_to_delete not in protected_namespaces
        fail_msg: "Cannot delete protected namespace: {{ namespace_to_delete }}"
        success_msg: "Namespace {{ namespace_to_delete }} is safe to delete"

    - name: List resources in the namespace before deletion
      kubernetes.core.k8s_info:
        kind: Pod
        namespace: "{{ namespace_to_delete }}"
      register: ns_pods

    - name: Show what will be deleted
      ansible.builtin.debug:
        msg: "Will delete namespace {{ namespace_to_delete }} containing {{ ns_pods.resources | length }} pods"

    - name: Delete the namespace
      kubernetes.core.k8s:
        state: absent
        kind: Namespace
        name: "{{ namespace_to_delete }}"
        api_version: v1
```

The `protected_namespaces` list is a safety guard. It prevents accidental deletion of critical namespaces.

## Graceful Deletion with Grace Period

By default, Kubernetes gives pods 30 seconds to shut down gracefully. You can override this.

```yaml
# task: delete pods with a custom grace period
- name: Delete pod with extended grace period
  kubernetes.core.k8s:
    state: absent
    kind: Pod
    name: data-processor
    namespace: production
    api_version: v1
    delete_options:
      gracePeriodSeconds: 120
```

A 120-second grace period gives the pod 2 minutes to finish processing before Kubernetes sends SIGKILL. For pods doing batch work or long-running transactions, this prevents data loss.

For immediate deletion (not recommended in production):

```yaml
# task: force-delete a stuck pod
- name: Force delete a stuck pod
  kubernetes.core.k8s:
    state: absent
    kind: Pod
    name: stuck-pod
    namespace: production
    api_version: v1
    delete_options:
      gracePeriodSeconds: 0
```

## Safe Deletion Pattern with Confirmation

For production deletions, build in a verification step.

```yaml
# playbook: safe-delete.yml
# Verifies the resource exists and shows details before deleting
---
- name: Safe resource deletion
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    resource_kind: Deployment
    resource_name: old-service
    resource_namespace: production
    confirm_delete: false

  tasks:
    - name: Check if resource exists
      kubernetes.core.k8s_info:
        kind: "{{ resource_kind }}"
        name: "{{ resource_name }}"
        namespace: "{{ resource_namespace }}"
      register: resource_check

    - name: Show resource details
      ansible.builtin.debug:
        msg:
          - "Resource: {{ resource_kind }}/{{ resource_name }}"
          - "Namespace: {{ resource_namespace }}"
          - "Exists: {{ resource_check.resources | length > 0 }}"
          - "Created: {{ resource_check.resources[0].metadata.creationTimestamp | default('N/A') }}"
      when: resource_check.resources | length > 0

    - name: Skip if resource does not exist
      ansible.builtin.debug:
        msg: "Resource {{ resource_kind }}/{{ resource_name }} does not exist in {{ resource_namespace }}"
      when: resource_check.resources | length == 0

    - name: Delete the resource
      kubernetes.core.k8s:
        state: absent
        kind: "{{ resource_kind }}"
        name: "{{ resource_name }}"
        namespace: "{{ resource_namespace }}"
      when:
        - resource_check.resources | length > 0
        - confirm_delete | bool
```

Run with confirmation:

```bash
# Dry run (just shows details)
ansible-playbook safe-delete.yml

# Actually delete
ansible-playbook safe-delete.yml -e confirm_delete=true
```

## Cleaning Up Completed Jobs

Old completed Jobs clutter the namespace. Clean them up periodically.

```yaml
# playbook: cleanup-completed-jobs.yml
# Removes completed Jobs older than a specified age
---
- name: Clean up completed Jobs
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    namespace: production

  tasks:
    - name: Get all completed jobs
      kubernetes.core.k8s_info:
        kind: Job
        namespace: "{{ namespace }}"
      register: all_jobs

    - name: Delete completed jobs
      kubernetes.core.k8s:
        state: absent
        kind: Job
        name: "{{ item.metadata.name }}"
        namespace: "{{ namespace }}"
        api_version: batch/v1
        delete_options:
          # Also delete the pods created by the job
          propagationPolicy: Background
      loop: "{{ all_jobs.resources | selectattr('status.succeeded', 'defined') | selectattr('status.succeeded', 'gt', 0) | list }}"
      loop_control:
        label: "{{ item.metadata.name }}"
```

The `propagationPolicy: Background` option controls cascade behavior. `Background` deletes the parent Job immediately and garbage-collects child pods asynchronously. `Foreground` waits for children to be deleted first. `Orphan` deletes only the parent and leaves children running.

## Deleting Multiple Resource Types in Order

When tearing down an application, order matters. Delete Ingresses before Services, Services before Deployments.

```yaml
# playbook: teardown-application.yml
# Removes an application in the correct order
---
- name: Teardown application stack
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    app_name: myapp
    namespace: staging

  tasks:
    - name: Remove HPA
      kubernetes.core.k8s:
        state: absent
        kind: HorizontalPodAutoscaler
        name: "{{ app_name }}-hpa"
        namespace: "{{ namespace }}"
        api_version: autoscaling/v2
      ignore_errors: true

    - name: Remove Ingress
      kubernetes.core.k8s:
        state: absent
        kind: Ingress
        name: "{{ app_name }}-ingress"
        namespace: "{{ namespace }}"
        api_version: networking.k8s.io/v1
      ignore_errors: true

    - name: Remove Service
      kubernetes.core.k8s:
        state: absent
        kind: Service
        name: "{{ app_name }}"
        namespace: "{{ namespace }}"
        api_version: v1
      ignore_errors: true

    - name: Remove Deployment
      kubernetes.core.k8s:
        state: absent
        kind: Deployment
        name: "{{ app_name }}"
        namespace: "{{ namespace }}"
        api_version: apps/v1
      ignore_errors: true

    - name: Remove ConfigMap
      kubernetes.core.k8s:
        state: absent
        kind: ConfigMap
        name: "{{ app_name }}-config"
        namespace: "{{ namespace }}"
        api_version: v1
      ignore_errors: true
```

The `ignore_errors: true` ensures the playbook continues even if a resource was already deleted or never existed. This makes the teardown idempotent.

## Summary

Deleting Kubernetes resources through Ansible gives you safety, auditability, and repeatability. Always include verification steps before deletion in production, use protected namespace lists to prevent accidents, and consider the cascade behavior of delete operations. For routine cleanup (completed Jobs, old resources), schedule the deletion playbook through a CronJob or CI/CD pipeline. The key principle: make deletions intentional and traceable, never ad hoc kubectl commands run from someone's laptop.
