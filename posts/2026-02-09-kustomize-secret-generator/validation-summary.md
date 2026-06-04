# Validation Summary: How to Generate Kubernetes Secrets from Kustomize secretGenerator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Secrets
- Kustomize secretGenerator
- kubectl kustomize
- Kubernetes Deployments
- Kubernetes CronJobs
- Bitnami kubectl container image
- Sealed Secrets
- SOPS

## Sources Consulted
- Kubernetes documentation: Managing Secrets using Kustomize: https://kubernetes.io/docs/tasks/configmap-secret/managing-secret-using-kustomize
- Kubernetes documentation: Declarative Management of Kubernetes Objects Using Kustomize: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- Kubernetes generated kubectl reference for `kubectl kustomize`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/
- Kubernetes documentation: Secrets, including Secret types and immutable Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes API reference for Secret v1: https://kubernetes.io/docs/reference/kubernetes-api/core/secret-v1/
- Kustomize API types reference: https://pkg.go.dev/sigs.k8s.io/kustomize/api/types

## Issues Found
- The multi-environment overlay examples used the deprecated `bases` field. Updated both overlays to use `resources`, which is the current Kustomize field for including another kustomization directory.
- The safe-update command overwrote `database.env` with a bare password value, breaking the required `KEY=value` env-file format. Replaced it with a `sed` command that updates only the `DB_PASSWORD=` line.
- The old Secret lifecycle text implied the old Secret only remains until deployment completion. Clarified that the old Secret remains in the cluster and can be deleted after the rollout completes.
- The CronJob cleanup sorted generated Secret names lexicographically by hash, which does not identify the newest generated Secrets. Changed it to sort by `.metadata.creationTimestamp` and keep the three newest matching Secrets.

## Review Notes
The local environment did not have `kubectl`, `kustomize`, or Go installed, so CLI execution could not be performed locally. Validation was completed against official Kubernetes documentation and the current Kustomize API type reference.
