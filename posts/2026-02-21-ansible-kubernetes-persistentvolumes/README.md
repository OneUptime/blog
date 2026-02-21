# How to Use Ansible to Create Kubernetes PersistentVolumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ansible, Kubernetes, PersistentVolumes, Storage, DevOps

Description: Learn how to create and manage Kubernetes PersistentVolumes with Ansible for NFS, local storage, cloud disks, and other storage backends.

---

PersistentVolumes (PVs) represent a piece of storage in your Kubernetes cluster that has been provisioned by an administrator or dynamically by a StorageClass. They exist independently of any pod, which means the data survives pod restarts, rescheduling, and even pod deletion. If you are managing storage infrastructure with Ansible, creating PersistentVolumes through playbooks gives you a repeatable, version-controlled approach to storage provisioning.

This guide covers creating PersistentVolumes for different storage backends using Ansible, including NFS, local storage, AWS EBS, GCE Persistent Disks, and how to set up reclaim policies and access modes correctly.

## Prerequisites

- Ansible 2.12+ with `kubernetes.core` collection
- A Kubernetes cluster
- Storage backend configured (NFS server, cloud provider, local disks, etc.)

```bash
ansible-galaxy collection install kubernetes.core
pip install kubernetes
```

## PersistentVolume Basics

Every PV has three important properties:

- **Capacity**: How much storage it provides
- **Access Modes**: Who can mount it and how (ReadWriteOnce, ReadOnlyMany, ReadWriteMany)
- **Reclaim Policy**: What happens when the PV is released (Retain, Delete, Recycle)

## Creating an NFS PersistentVolume

NFS is one of the most common storage backends for on-premises Kubernetes clusters because it supports ReadWriteMany access.

```yaml
# playbook: create-nfs-pv.yml
# Creates a PersistentVolume backed by an NFS share
---
- name: Create NFS PersistentVolume
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    nfs_server: "nfs.internal.company.com"
    nfs_shares:
      - name: pv-app-data
        path: /exports/app-data
        capacity: 50Gi
      - name: pv-shared-files
        path: /exports/shared-files
        capacity: 100Gi
      - name: pv-logs
        path: /exports/logs
        capacity: 200Gi

  tasks:
    - name: Create NFS PersistentVolumes
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: PersistentVolume
          metadata:
            name: "{{ item.name }}"
            labels:
              storage-type: nfs
              managed-by: ansible
          spec:
            capacity:
              storage: "{{ item.capacity }}"
            accessModes:
              - ReadWriteMany
            persistentVolumeReclaimPolicy: Retain
            storageClassName: nfs
            mountOptions:
              - hard
              - nfsvers=4.1
              - rsize=1048576
              - wsize=1048576
            nfs:
              server: "{{ nfs_server }}"
              path: "{{ item.path }}"
      loop: "{{ nfs_shares }}"
      loop_control:
        label: "{{ item.name }} ({{ item.capacity }})"
```

The `Retain` reclaim policy means when a PersistentVolumeClaim is deleted, the PV and its data are preserved. An administrator must manually clean up and make the PV available again. This is the safest option for important data.

## Creating Local PersistentVolumes

Local PVs use storage directly attached to a node. They provide better performance than network storage but tie your pod to a specific node.

```yaml
# playbook: create-local-pv.yml
# Creates PersistentVolumes backed by local SSD storage on specific nodes
---
- name: Create Local PersistentVolumes
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    local_volumes:
      - name: local-ssd-node1
        node: worker-node-1
        path: /mnt/ssd/data
        capacity: 500Gi
      - name: local-ssd-node2
        node: worker-node-2
        path: /mnt/ssd/data
        capacity: 500Gi
      - name: local-ssd-node3
        node: worker-node-3
        path: /mnt/ssd/data
        capacity: 500Gi

  tasks:
    - name: Create local PersistentVolumes
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: PersistentVolume
          metadata:
            name: "{{ item.name }}"
            labels:
              storage-type: local-ssd
          spec:
            capacity:
              storage: "{{ item.capacity }}"
            accessModes:
              - ReadWriteOnce
            persistentVolumeReclaimPolicy: Retain
            storageClassName: local-ssd
            local:
              path: "{{ item.path }}"
            nodeAffinity:
              required:
                nodeSelectorTerms:
                  - matchExpressions:
                      - key: kubernetes.io/hostname
                        operator: In
                        values:
                          - "{{ item.node }}"
      loop: "{{ local_volumes }}"
      loop_control:
        label: "{{ item.name }} on {{ item.node }}"
```

The `nodeAffinity` section is mandatory for local volumes. It tells Kubernetes which node the storage is on, so pods using this PV are scheduled on the correct node.

## Creating AWS EBS PersistentVolumes

For AWS clusters not using dynamic provisioning, you can create PVs backed by existing EBS volumes.

```yaml
# playbook: create-ebs-pv.yml
# Creates PersistentVolumes from existing AWS EBS volumes
---
- name: Create AWS EBS PersistentVolumes
  hosts: localhost
  connection: local
  gather_facts: false

  vars:
    ebs_volumes:
      - name: pv-database
        volume_id: vol-0abc123def456789a
        capacity: 100Gi
        az: us-east-1a
      - name: pv-cache
        volume_id: vol-0def456789abc123b
        capacity: 50Gi
        az: us-east-1b

  tasks:
    - name: Create EBS-backed PersistentVolumes
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: v1
          kind: PersistentVolume
          metadata:
            name: "{{ item.name }}"
            labels:
              storage-type: ebs
              topology.kubernetes.io/zone: "{{ item.az }}"
          spec:
            capacity:
              storage: "{{ item.capacity }}"
            accessModes:
              - ReadWriteOnce
            persistentVolumeReclaimPolicy: Delete
            storageClassName: gp3
            csi:
              driver: ebs.csi.aws.com
              volumeHandle: "{{ item.volume_id }}"
              fsType: ext4
            nodeAffinity:
              required:
                nodeSelectorTerms:
                  - matchExpressions:
                      - key: topology.kubernetes.io/zone
                        operator: In
                        values:
                          - "{{ item.az }}"
      loop: "{{ ebs_volumes }}"
      loop_control:
        label: "{{ item.name }} ({{ item.volume_id }})"
```

EBS volumes can only be mounted by instances in the same availability zone, so the `nodeAffinity` constraint ensures pods land on nodes in the right AZ.

## Creating a StorageClass for Dynamic Provisioning

Instead of manually creating PVs, you can set up a StorageClass that dynamically provisions them when a PVC is created.

```yaml
# playbook: create-storageclasses.yml
# Creates StorageClasses for different performance tiers
---
- name: Create StorageClasses
  hosts: localhost
  connection: local
  gather_facts: false

  tasks:
    - name: Create standard StorageClass
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: storage.k8s.io/v1
          kind: StorageClass
          metadata:
            name: standard
            annotations:
              storageclass.kubernetes.io/is-default-class: "true"
          provisioner: ebs.csi.aws.com
          parameters:
            type: gp3
            encrypted: "true"
          reclaimPolicy: Delete
          allowVolumeExpansion: true
          volumeBindingMode: WaitForFirstConsumer

    - name: Create high-performance StorageClass
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: storage.k8s.io/v1
          kind: StorageClass
          metadata:
            name: fast-ssd
          provisioner: ebs.csi.aws.com
          parameters:
            type: io2
            iopsPerGB: "50"
            encrypted: "true"
          reclaimPolicy: Retain
          allowVolumeExpansion: true
          volumeBindingMode: WaitForFirstConsumer
```

`WaitForFirstConsumer` delays volume creation until a pod using the PVC is scheduled. This ensures the volume is created in the same AZ as the pod. The `allowVolumeExpansion: true` setting lets users resize their PVCs later without recreating them.

## Checking PersistentVolume Status

After creation, verify your PVs are in the expected state.

```yaml
# task: check status of all PersistentVolumes
- name: Get all PersistentVolumes
  kubernetes.core.k8s_info:
    kind: PersistentVolume
    label_selectors:
      - managed-by=ansible
  register: pv_list

- name: Display PV status
  ansible.builtin.debug:
    msg: "{{ item.metadata.name }}: {{ item.status.phase }} | {{ item.spec.capacity.storage }} | {{ item.spec.accessModes | join(', ') }}"
  loop: "{{ pv_list.resources }}"
  loop_control:
    label: "{{ item.metadata.name }}"
```

A PV's `phase` tells you its current state: `Available` (ready to be bound), `Bound` (claimed by a PVC), `Released` (PVC deleted, data retained), or `Failed`.

## Cleaning Up Released PersistentVolumes

PVs with a `Retain` reclaim policy stay in `Released` state after their PVC is deleted. You need to clean them up manually to make them available again.

```yaml
# task: find and optionally reclaim released PVs
- name: Find Released PersistentVolumes
  kubernetes.core.k8s_info:
    kind: PersistentVolume
  register: all_pvs

- name: List released PVs
  ansible.builtin.debug:
    msg: "Released PV: {{ item.metadata.name }} was bound to {{ item.spec.claimRef.namespace }}/{{ item.spec.claimRef.name }}"
  loop: "{{ all_pvs.resources | selectattr('status.phase', 'equalto', 'Released') | list }}"
  loop_control:
    label: "{{ item.metadata.name }}"
```

## Summary

PersistentVolumes are the foundation of stateful storage in Kubernetes. Whether you are provisioning NFS shares, local SSDs, or cloud disks, Ansible gives you a consistent way to define and manage them. For most production environments, dynamic provisioning through StorageClasses is the way to go. But when you need fine-grained control over specific volumes, manually created PVs through Ansible playbooks give you that precision while keeping everything in code.
