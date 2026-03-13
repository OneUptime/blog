# How to Use Ansible to Create Kubernetes PersistentVolumeClaims

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, PersistentVolumeClaims, Storage

Description: Create and manage Kubernetes PersistentVolumeClaims with Ansible for dynamic storage provisioning, volume expansion, and storage lifecycle management.

---

PersistentVolumeClaims (PVCs) are how pods request storage in Kubernetes. While PersistentVolumes represent the actual storage, PVCs are the abstraction that lets your applications ask for what they need without caring about the underlying storage backend. A PVC says "I need 10Gi of ReadWriteOnce storage" and Kubernetes either finds a matching PV or dynamically creates one through a StorageClass.

Managing PVCs through Ansible gives you control over storage provisioning as part of your deployment pipeline. This guide covers creating PVCs for different scenarios, binding them to specific PVs, resizing volumes, and handling the storage lifecycle.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A Kubernetes cluster with at least one StorageClass configured
- A valid kubeconfig

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## Creating a Basic PVC

The simplest PVC uses the default StorageClass and lets Kubernetes handle volume provisioning.

```yaml
# playbook: create-basic-pvc.yml
# Creates a PVC using the default StorageClass for application data
---
- name: Create PersistentVolumeClaim
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create PVC for application data
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: app-data
            namespace: production
            labels:
              app: myapp
              managed-by: ansible
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 10Gi
```

When you omit `storageClassName`, Kubernetes uses the default StorageClass. The PVC will stay in `Pending` state until a matching PV becomes available or the StorageClass provisions one. With `WaitForFirstConsumer` binding mode, provisioning happens only when a pod referencing the PVC is scheduled.

## Creating a PVC with a Specific StorageClass

For different performance requirements, specify the StorageClass explicitly.

```yaml
# playbook: create-pvc-storageclass.yml
# Creates PVCs with different StorageClasses for different performance needs
---
- name: Create PVCs with specific StorageClasses
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create high-performance PVC for database
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: postgres-data
            namespace: databases
          spec:
            storageClassName: fast-ssd
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 100Gi

    - name: Create standard PVC for logs
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: app-logs
            namespace: production
          spec:
            storageClassName: standard
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 50Gi

    - name: Create shared PVC with ReadWriteMany
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: shared-uploads
            namespace: production
          spec:
            storageClassName: efs
            accessModes:
              - ReadWriteMany
            resources:
              requests:
                storage: 200Gi
```

The `ReadWriteMany` access mode lets multiple pods mount the same volume simultaneously. This requires a storage backend that supports it, like NFS or AWS EFS. Standard block storage (EBS, GCE PD) only supports `ReadWriteOnce`.

## Binding a PVC to a Specific PV

When you need a PVC to bind to a particular pre-existing PV, use the `volumeName` field along with label selectors.

```yaml
# playbook: create-pvc-specific-pv.yml
# Binds a PVC to a specific pre-existing PersistentVolume
---
- name: Create PVC bound to specific PV
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create PVC that targets a specific PV
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: legacy-data
            namespace: production
          spec:
            # Bind to this specific PV by name
            volumeName: pv-legacy-data
            storageClassName: ""
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 50Gi

    - name: Create PVC using label selector to match a PV
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: team-storage
            namespace: development
          spec:
            storageClassName: ""
            accessModes:
              - ReadWriteMany
            resources:
              requests:
                storage: 100Gi
            selector:
              matchLabels:
                team: backend
                storage-type: nfs
```

Setting `storageClassName: ""` disables dynamic provisioning and forces the PVC to bind to an existing PV. The `selector.matchLabels` narrows the search to PVs with those specific labels.

## Creating PVCs as Part of an Application Deployment

In practice, PVCs are created alongside the Deployments and Services that use them.

```yaml
# playbook: deploy-app-with-storage.yml
# Deploys an application with its PVC and mounts it in the pod
---
- name: Deploy application with persistent storage
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    app_name: file-processor
    namespace: production
    storage_size: 20Gi

  tasks:
    - name: Create PVC for the application
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: "{{ app_name }}-data"
            namespace: "{{ namespace }}"
            labels:
              app: "{{ app_name }}"
          spec:
            storageClassName: standard
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: "{{ storage_size }}"

    - name: Deploy application with PVC mounted
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ namespace }}"
          spec:
            replicas: 1
            selector:
              matchLabels:
                app: "{{ app_name }}"
            template:
              metadata:
                labels:
                  app: "{{ app_name }}"
              spec:
                containers:
                  - name: "{{ app_name }}"
                    image: "mycompany/{{ app_name }}:latest"
                    volumeMounts:
                      - name: data
                        mountPath: /data
                    resources:
                      requests:
                        cpu: 250m
                        memory: 512Mi
                volumes:
                  - name: data
                    persistentVolumeClaim:
                      claimName: "{{ app_name }}-data"
```

The PVC name in the Deployment's `volumes` section must match the PVC metadata name exactly. The `mountPath` determines where the volume appears inside the container's filesystem.

## Expanding a PVC

When your application outgrows its storage, you can expand the PVC if the StorageClass has `allowVolumeExpansion: true`.

```yaml
# playbook: expand-pvc.yml
# Increases the storage capacity of an existing PVC
---
- name: Expand PersistentVolumeClaim
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    pvc_name: postgres-data
    namespace: databases
    new_size: 200Gi

  tasks:
    - name: Get current PVC size
      kubernetes.core.k8s_info:
        kind: PersistentVolumeClaim
        name: "{{ pvc_name }}"
        namespace: "{{ namespace }}"
      register: current_pvc

    - name: Show current size
      ansible.builtin.debug:
        msg: "Current size: {{ current_pvc.resources[0].spec.resources.requests.storage }} -> New size: {{ new_size }}"

    - name: Expand the PVC
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: "{{ pvc_name }}"
            namespace: "{{ namespace }}"
          spec:
            resources:
              requests:
                storage: "{{ new_size }}"

    - name: Wait for expansion to complete
      kubernetes.core.k8s_info:
        kind: PersistentVolumeClaim
        name: "{{ pvc_name }}"
        namespace: "{{ namespace }}"
      register: expanded_pvc
      until: >
        expanded_pvc.resources[0].status.capacity.storage == new_size
      retries: 30
      delay: 10
      ignore_errors: true
```

Important: you can only increase PVC size, never decrease it. Some storage backends (like AWS EBS) require the pod using the PVC to be restarted for the filesystem to resize. Others (like EFS) handle it transparently.

## Batch PVC Creation for Microservices

When deploying multiple microservices that each need storage, a loop keeps things clean.

```yaml
# playbook: create-pvcs-batch.yml
# Creates PVCs for multiple microservices in one playbook run
---
- name: Create PVCs for microservices
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    services:
      - name: user-service
        size: 5Gi
        class: standard
      - name: media-service
        size: 100Gi
        class: standard
      - name: analytics-service
        size: 50Gi
        class: fast-ssd
      - name: search-service
        size: 30Gi
        class: fast-ssd

  tasks:
    - name: Create PVC for each service
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: PersistentVolumeClaim
          metadata:
            name: "{{ item.name }}-data"
            namespace: production
            labels:
              app: "{{ item.name }}"
              managed-by: ansible
          spec:
            storageClassName: "{{ item.class }}"
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: "{{ item.size }}"
      loop: "{{ services }}"
      loop_control:
        label: "{{ item.name }} ({{ item.size }})"
```

## Checking PVC Status

Verify PVCs are bound and have the expected capacity.

```yaml
# task: verify all PVCs are bound
- name: Get all PVCs in production
  kubernetes.core.k8s_info:
    kind: PersistentVolumeClaim
    namespace: production
    label_selectors:
      - managed-by=ansible
  register: pvc_list

- name: Check for unbound PVCs
  ansible.builtin.debug:
    msg: "WARNING: PVC {{ item.metadata.name }} is {{ item.status.phase }}"
  loop: "{{ pvc_list.resources | rejectattr('status.phase', 'equalto', 'Bound') | list }}"
  loop_control:
    label: "{{ item.metadata.name }}"

- name: Show bound PVCs
  ansible.builtin.debug:
    msg: "{{ item.metadata.name }}: {{ item.status.phase }} | {{ item.status.capacity.storage }} | Volume: {{ item.spec.volumeName }}"
  loop: "{{ pvc_list.resources | selectattr('status.phase', 'equalto', 'Bound') | list }}"
  loop_control:
    label: "{{ item.metadata.name }}"
```

## Summary

PersistentVolumeClaims are the standard way for pods to request storage in Kubernetes. Managing them through Ansible ensures consistent provisioning across environments and makes storage part of your deployment pipeline rather than a manual side task. Use StorageClasses for dynamic provisioning in most cases, fall back to specific PV binding when you need fine-grained control, and always plan for volume expansion because storage needs only ever grow.
