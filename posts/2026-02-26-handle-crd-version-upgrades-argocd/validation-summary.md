# Validation Summary: How to Handle CRD Version Upgrades with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes CustomResourceDefinitions
- Kubernetes CRD versioning and conversion webhooks
- Kubernetes storage version migration
- kubectl
- Argo CD sync waves, hooks, diff customization, and sync options
- GitOps

## Sources Consulted
- Kubernetes documentation: Versions in CustomResourceDefinitions - https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- Kubernetes documentation: Migrate Kubernetes Objects Using Storage Version Migration - https://kubernetes.io/docs/tasks/manage-kubernetes-objects/storage-version-migration/
- Kubernetes documentation: JSONPath Support - https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Argo CD documentation: Sync Phases and Waves - https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD documentation: Diffing Customization - https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD documentation: Sync Options - https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/

## Issues Found
- The upgrade flow showed deploying a conversion webhook after adding the new CRD version. Kubernetes documentation recommends deploying the conversion webhook before applying a CRD change that references it. Updated the flow and Step 1 note to make that ordering explicit.
- The storage migration example rewrote objects but did not remove the old version from the CRD `status.storedVersions` field. Kubernetes documentation requires removing the old stored version after objects are rewritten. Added the `kubectl patch crd ... --subresource=status` command.
- The PostSync migration job depended on `jq` while using a kubectl-focused image. Replaced the `jq` pipeline with kubectl JSONPath output and a shell loop, then used `kubectl replace` to rewrite each live object in the current storage version.
- The upgrade flow used "migrate existing resources to v2" before switching the storage version, which could be read as storage migration occurring too early. Adjusted the wording to distinguish client/manifest migration from stored object rewriting.

## Review Notes
The article is technically relevant and the CRD, Argo CD hook, sync wave, ignoreDifferences, and server-side apply examples use current APIs. In production, the migration job also needs RBAC allowing it to list, get, apply/update the custom resources and patch the CRD status subresource; that operational detail is outside the current example.
