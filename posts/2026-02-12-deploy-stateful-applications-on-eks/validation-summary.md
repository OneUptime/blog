# Validation Summary: How to Deploy Stateful Applications on EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Amazon EBS CSI driver
- AWS CLI
- eksctl
- Kubernetes StatefulSets
- Kubernetes StorageClasses, PersistentVolumes, and PersistentVolumeClaims
- Kubernetes Services and PodDisruptionBudgets
- PostgreSQL
- Redis

## Sources Consulted
- Amazon EKS User Guide: Use Kubernetes volume storage with Amazon EBS - https://docs.aws.amazon.com/eks/latest/userguide/ebs-csi.html
- Amazon EKS User Guide: Create a storage class - https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- AWS CLI Command Reference: `aws eks create-addon` - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/eks/create-addon.html
- AWS CLI Command Reference: `aws ec2 create-snapshot` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-snapshot.html
- Kubernetes Documentation: StatefulSets - https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes API Reference: StatefulSet v1 - https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/
- Kubernetes Documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes API Reference: Pod v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Documentation: Persistent Volumes - https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Docker Official Image documentation for Redis - https://hub.docker.com/_/redis
- Redis Documentation: Persistence - https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/

## Issues Found
- The EBS CSI driver IAM setup used the older `AmazonEBSCSIDriverPolicy` and created a Kubernetes service account before installing the managed add-on. Updated the example to follow the current Amazon EKS add-on pattern with `--role-only` and `AmazonEBSCSIDriverPolicyV2`.
- The gp3 StorageClass used `fsType: ext4` under `parameters`. Updated it to `csi.storage.k8s.io/fstype: ext4`, which is the documented CSI StorageClass parameter.
- The Redis section claimed to deploy a Redis cluster with Sentinel, but the manifest only runs Redis instances with persistence and does not configure Sentinel or Redis Cluster. Updated the heading and lead-in to describe the manifest accurately.
- The Redis `--save` command passed `60 1000` as one argument. Split it into separate `60` and `1000` arguments to match Redis command-line usage.
- The topology section said topology spread constraints keep pods in the same AZ as their volumes. Updated the explanation to clarify that `WaitForFirstConsumer` and PersistentVolume node affinity handle volume AZ placement, while topology spread constraints can help distribute new replicas across AZs.
- The PostgreSQL manifest was described as production-ready even though it is a single-replica example. Changed the wording to "basic PostgreSQL deployment" to avoid overclaiming.

## Review Notes
- The PostgreSQL example is structurally valid for a simple single-replica StatefulSet, but a production PostgreSQL deployment would also need backup restore testing, TLS, anti-affinity or scheduling policy, operational runbooks, and likely an operator or managed service depending on requirements.
- The PDB example with `minAvailable: 1` and one PostgreSQL replica is technically valid, but it blocks voluntary evictions unless another matching pod is available.
