# Validation Summary: How to Use Ansible to Create Kubernetes PersistentVolumes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- kubernetes.core Ansible collection
- Kubernetes PersistentVolumes
- Kubernetes StorageClasses
- NFS storage
- Local PersistentVolumes
- AWS EBS CSI driver

## Sources Consulted
- Kubernetes PersistentVolumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes PersistentVolume v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Ansible kubernetes.core.k8s module documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/k8s_module.html
- Ansible kubernetes.core collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/kubernetes/core/
- Amazon EKS StorageClass documentation: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- AWS EBS CSI driver documentation: https://github.com/kubernetes-sigs/aws-ebs-csi-driver

## Issues Found
- The guide claimed to cover GCE Persistent Disks, but no GCE example or configuration was present. Removed the GCE mention from the introductory scope.
- The prerequisites listed Ansible 2.12+, but the current kubernetes.core collection documentation lists ansible-core 2.16.0 or newer. Updated the prerequisite to ansible-core 2.16+.
- The access mode list omitted `ReadWriteOncePod`, which is a current Kubernetes PersistentVolume access mode. Added it to the basics section.
- The reclaim policy list presented `Recycle` without a support caveat. Added a note that `Recycle` is only supported by a few volume types such as NFS and hostPath.
- The local and EBS PV examples did not include the `managed-by: ansible` label, while the status-check task filters on that label. Added the label so the verification task matches the examples.
- The static AWS EBS PV example used `persistentVolumeReclaimPolicy: Delete` for existing EBS volumes. Changed it to `Retain` to avoid implying that a manually created existing backing volume should be deleted during reclamation.

## Review Notes
- The YAML snippets were parsed successfully after the edits.
- `ansible-galaxy` is not installed in this workspace, so the install command was verified against Ansible documentation rather than local `--help` output.
- The AWS EBS CSI `StorageClass` parameters shown in the post match the documented parameter names for EBS CSI dynamic provisioning.
