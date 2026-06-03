# Validation Summary: How to Configure Persistent Volume Reclaim Policies for Data Retention

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes PersistentVolumes and PersistentVolumeClaims
- Kubernetes StorageClasses
- Kubernetes admission webhooks
- kubectl
- jq
- kube-state-metrics
- PrometheusRule
- AWS EBS CSI storage

## Sources Consulted
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes StorageClasses documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Kubernetes PersistentVolume API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/persistent-volume-v1/
- Kubernetes StorageClass API reference: https://kubernetes.io/docs/reference/kubernetes-api/storage/storage-class-v1/
- Kubernetes change PersistentVolume reclaim policy task: https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy/
- Kubernetes admission webhook documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- kube-state-metrics PersistentVolume metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/persistentvolume-metrics.md
- kube-state-metrics PersistentVolumeClaim metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/storage/persistentvolumeclaim-metrics.md

## Issues Found
- The StorageClass examples used the deprecated and removed in-tree AWS EBS provisioner `kubernetes.io/aws-ebs`. Changed both examples to the current AWS EBS CSI provisioner `ebs.csi.aws.com`, matching current Kubernetes storage documentation.
- The shell controller used `jq -r` to emit JSON objects into a `while read` loop, which would split each object across multiple lines. Changed it to `jq -c` so each PVC object is processed as one compact JSON line.
- The controller script referenced unquoted shell variables in kubectl commands. Quoted the variables to avoid failures with unexpected values.
- The test command labeled `postgres-data` after the walkthrough had deleted that PVC. Changed it to label `postgres-data-recovered`, which exists in the recovery workflow.
- The backup-before-delete section said the deletion check used finalizers, but the YAML defines a validating admission webhook. Updated the wording to accurately describe admission validation.
- The Prometheus alert used a non-current metric, `kube_persistentvolume_reclaim_policy`, and attempted to read PVC labels from `kube_persistentvolume_claim_ref`. Replaced the expression with current kube-state-metrics metrics: `kube_persistentvolumeclaim_labels`, `kube_persistentvolumeclaim_info`, and `kube_persistentvolume_info{reclaim_policy="Delete"}`.
- Added a note that the Prometheus alert assumes kube-state-metrics is configured to expose PVC labels.

## Review Notes
The post is technically relevant and the core reclaim policy explanation is accurate. The Recycle policy remains deprecated, and current production guidance should continue to favor Delete or Retain with CSI-based storage drivers.
