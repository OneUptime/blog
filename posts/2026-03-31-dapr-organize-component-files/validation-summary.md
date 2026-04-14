# Validation Summary: How to Organize Dapr Component Files in a Project

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (component YAML format, state stores, pub/sub, bindings, secrets, resiliency, configuration)
- Kustomize (base/overlay pattern, strategic merge patches)
- kubectl (kustomize preview and apply commands)
- Kubernetes (namespaces, CRDs)
- Redis (as example state store backend)
- GitOps (deployment promotion pattern)

## Sources Consulted
- Dapr Component Spec: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Redis State Store Setup: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr Component Secrets Reference: https://docs.dapr.io/operations/components/component-secrets/
- Dapr Resiliency Spec: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Configuration Spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Kubernetes Kustomize Documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- kubectl kustomize Command Reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_kustomize/

## Issues Found
No technical issues found.

## Review Notes
- The post uses the modern `patches` syntax with `path` in kustomization.yaml, correctly avoiding the deprecated `patchesStrategicMerge` field (deprecated since Kustomize v5.0.0).
- The `spec.metadata` field in Dapr Components is a list, and Kustomize strategic merge patches replace entire lists for CRDs (which lack strategic merge patch annotations). The blog states "Kustomize patches override only what changes per environment," which is a slight simplification. However, the patch example correctly includes all needed metadata fields (redisHost, redisPassword, enableTLS), so the replacement produces the correct result in practice.
- The base `kustomization.yaml` file is shown in the directory structure but its contents are not displayed. This is acceptable since the focus is on the overlay pattern, but readers may need to know it must list the component YAML files under `resources`.
- The `secretKeyRef` usage is correct and follows Dapr's standard pattern for referencing secrets from a configured secret store (defaulting to Kubernetes secrets).
- All Dapr resource types mentioned (Component, Resiliency, Configuration) are valid CRDs with `apiVersion: dapr.io/v1alpha1`.
