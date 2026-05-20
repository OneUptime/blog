# Validation Summary: How to Deploy Storage Classes with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes StorageClass
- Argo CD Applications and ApplicationSets
- Kustomize overlays and patches
- AWS EBS CSI Driver
- GKE Persistent Disk CSI Driver
- Azure Disk CSI Driver
- Prometheus / kube-state-metrics

## Sources Consulted
- Kubernetes StorageClass documentation: https://kubernetes.io/docs/concepts/storage/storage-classes/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD ApplicationSet cluster generator documentation: https://argo-cd.readthedocs.io/en/release-2.12/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Amazon EKS StorageClass parameters reference: https://docs.aws.amazon.com/eks/latest/userguide/create-storage-class.html
- Google Kubernetes Engine Persistent Disk CSI Driver documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/gce-pd-csi-driver
- Google Kubernetes Engine regional Persistent Disk documentation: https://cloud.google.com/kubernetes-engine/docs/how-to/persistent-volumes/regional-pd
- Azure Kubernetes Service Azure Disk CSI storage documentation: https://learn.microsoft.com/en-us/azure/aks/create-volume-azure-disk
- Kubernetes kube-state-metrics documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/

## Issues Found
- The GCP KMS key example used a folded YAML scalar, which can add a trailing newline to the parameter value. Changed it to a plain scalar so the StorageClass parameter is the exact resource ID.
- The GCP regional Persistent Disk StorageClass set `replication-type: regional-pd` but did not include topology constraints. Added `allowedTopologies` to match the GKE regional disk example and make the manifest complete for explicit two-zone provisioning.
- The Azure Disk StorageClass examples used `cachingmode`; current Azure Disk CSI documentation uses `cachingMode`. Updated both Azure examples to the documented parameter casing.
- The Kustomize patch claimed to ensure only `gp3` is default but only patched `gp3`. Updated the patch example to mark `gp3` as default and explicitly mark `fast-ssd` and `cold-hdd` as non-default.
- The PreSync validation job used `jq` inside a `bitnami/kubectl` container without ensuring `jq` is installed. Replaced it with `kubectl -o go-template` plus `grep`, avoiding an undeclared dependency.

## Review Notes
- Kubernetes allows multiple default StorageClasses for migration scenarios, but recommends trying to keep only one default. The post's guidance to keep one default is appropriate for normal GitOps management.
- `WaitForFirstConsumer` is correct for topology-constrained, multi-zone storage, provided the CSI driver supports delayed binding.
- Volume expansion only supports growing volumes, not shrinking them; the post's resize wording is correct but could be made more explicit in a future revision.
