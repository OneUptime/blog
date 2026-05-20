# Validation Summary: How to Deploy Custom Resource Definitions with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes CustomResourceDefinitions
- Kubernetes custom resources
- Helm charts in Argo CD
- cert-manager
- Prometheus Operator / kube-prometheus-stack
- GitOps sync ordering and diff customization

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/sync-waves/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Helm user guide: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD Diff Customization: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD built-in CRD health check source: https://raw.githubusercontent.com/argoproj/argo-cd/master/resource_customizations/apiextensions.k8s.io/CustomResourceDefinition/health.lua
- Kubernetes CRD documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes CRD versioning and conversion webhooks: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning
- Kubernetes finalizers documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/
- prometheus-community kube-prometheus-stack values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml

## Issues Found
- Separate Argo CD Applications were shown with sync-wave annotations without explaining scope. Sync waves on `Application` objects only order those objects when they are themselves synced by a parent app/app-of-apps pattern, so the text now states that caveat.
- The CRD health-status description was too simplified. It now matches Argo CD's built-in CRD health logic more closely, including missing conditions, terminating CRDs, `NamesAccepted`, `NonStructuralSchema`, and not-established states.
- The CRD deletion-protection example recommended adding the Kubernetes `customresourcecleanup.apiextensions.k8s.io` finalizer. That finalizer is for CRD instance cleanup during deletion, not an Argo CD safety control. The example now uses `Prune=false,Delete=false`.
- The diff customization example ignored `.spec.versions[].schema.openAPIV3Schema`, which would mask real CRD schema drift. The example now ignores only `.status`.

## Review Notes
The remaining examples use current Argo CD and Kubernetes API shapes. The kube-prometheus-stack chart version in the example is old but the `crds.enabled` value remains a valid chart option; future updates may want to refresh the sample `targetRevision`.
