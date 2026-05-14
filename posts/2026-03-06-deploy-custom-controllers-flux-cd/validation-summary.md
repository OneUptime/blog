# Validation Summary: How to Deploy Custom Controllers with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD v2 Kustomization and HelmRelease resources
- Kubernetes CustomResourceDefinitions
- Kubernetes RBAC
- Kubernetes Deployments, Services, probes, affinity, and security contexts
- Helm chart deployment through Flux Helm Controller
- cert-manager Helm chart
- Prometheus Operator ServiceMonitor
- kubectl and Flux CLI verification commands

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager continuous deployment and GitOps documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/
- Kubernetes CustomResourceDefinition documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The cert-manager HelmRelease was placed in the `cert-manager` namespace while relying on `install.createNamespace: true`. A namespaced HelmRelease manifest still needs its own namespace to exist before Flux can apply it, while Flux/Helm creates the Helm release target namespace. I moved the HelmRelease to `flux-system` and added `targetNamespace: cert-manager`.
- The cert-manager example used the older `1.14.x` chart line and `installCRDs: true` value. Current cert-manager documentation uses the `crds.enabled: true` value for Helm-managed CRDs, so I updated the example to `1.20.x` and `crds.enabled: true`.
- The Flux Kustomization example combined `wait: true` with explicit `healthChecks`. Flux documentation states that `healthChecks` are ignored when `wait` is true, so I removed the redundant healthChecks block.
- The ServiceMonitor example selected `app: my-controller`, but the post did not define a Kubernetes Service with that label and a named `metrics` port. ServiceMonitor discovers Service targets, so I added a `Service` manifest and included `service.yaml` in the example base kustomization.

## Review Notes
- The CRD, RBAC, Deployment, Kustomize patch, custom resource, kubectl, and Flux CLI examples are technically consistent with the referenced documentation.
- The cert-manager documentation currently recommends OCI Helm charts for the latest releases, while the example still uses a generic `HelmRepository` named `jetstack`. This remains valid if that source is configured appropriately, but a future enhancement could include the HelmRepository manifest explicitly.
