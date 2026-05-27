# Validation Summary: How to Use Ansible to Create Kubernetes PersistentVolumeClaims

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Kubernetes PersistentVolumeClaims
- Kubernetes PersistentVolumes
- Kubernetes StorageClasses
- Kubernetes Deployments

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes Storage Classes documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes API reference for PersistentVolumeClaims: https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-claim-v1/
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible kubernetes.core.k8s_info module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_info_module.html
- kubernetes.core collection README: https://github.com/ansible-collections/kubernetes.core
- Kubernetes CSI volume expansion documentation: https://kubernetes-csi.github.io/docs/volume-expansion.html

## Issues Found
- The prerequisites listed Ansible 2.12+, but the current kubernetes.core collection documents testing against Ansible 2.16+. Updated the prerequisite to Ansible 2.16+.
- The ReadWriteMany explanation said multiple pods can mount the same volume and that EBS/GCE PD only support ReadWriteOnce. Kubernetes defines ReadWriteMany as read-write by many nodes, and Google Persistent Disk can support additional non-RWX modes depending on driver/version. Reworded this to focus on the important constraint: standard block storage does not provide ReadWriteMany for a single volume.
- The specific PV binding section said to use volumeName along with label selectors. Kubernetes supports direct binding with volumeName or PV matching with selectors, so the text now distinguishes those two approaches.
- The resize note said AWS EBS requires restarting the pod for filesystem resize. Current Kubernetes behavior supports in-use PVC expansion when the driver and filesystem support it, while filesystem expansion can also occur when a pod starts using the PVC. Updated the note to avoid an inaccurate provider-specific restart requirement.

## Review Notes
All YAML examples parsed successfully. The examples still assume the referenced namespaces and StorageClasses already exist, which is appropriate for the tutorial's stated prerequisites.
