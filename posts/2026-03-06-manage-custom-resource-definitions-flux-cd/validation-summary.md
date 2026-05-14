# Validation Summary: How to Manage CustomResourceDefinitions with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Kustomization resources
- Flux CD HelmRelease and HelmRepository resources
- Flux CD notification Alert resources
- Kubernetes CustomResourceDefinitions
- cert-manager Helm chart CRD installation
- GitOps repository organization

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Kubernetes CustomResourceDefinition versioning documentation: https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/
- cert-manager Helm installation documentation: https://cert-manager.io/docs/installation/helm/
- cert-manager continuous deployment / GitOps documentation: https://cert-manager.io/docs/installation/continuous-deployment-and-gitops/
- cert-manager Helm chart values: https://raw.githubusercontent.com/cert-manager/cert-manager/master/deploy/charts/cert-manager/values.yaml

## Issues Found
- The cert-manager HelmRelease example claimed to install only CRDs while disabling the controller, but the shown values did not disable all chart resources and used the older `installCRDs` value. Updated the example to install cert-manager with CRD management enabled using the current `crds.enabled` value, OCI HelmRepository URL, current 1.20 patch range, target namespace, and Flux CRD policies.
- The health check example set both `wait: true` and `healthChecks`. Flux ignores `.spec.healthChecks` when `.spec.wait` is `true`, so the example did not demonstrate explicit health checks as described. Removed `wait: true` from that snippet.
- The prune protection annotation used `disabled`; Flux documents the prune policy value as `Disabled`. Updated the annotation value and clarified the comment to say it prevents pruning.
- The Alert example used `notification.toolkit.fluxcd.io/v1`, but Alert is documented under `notification.toolkit.fluxcd.io/v1beta3`, while v1 currently documents Receiver. Updated the apiVersion.
- The Alert example used `.spec.summary`, which Flux marks as deprecated. Replaced it with `.spec.eventMetadata.summary`.

## Review Notes
The CRD examples use `apiextensions.k8s.io/v1`, per-version schemas, version storage flags, additional printer columns, and conversion webhook structure consistent with Kubernetes documentation. The post's `dependsOn`, `prune`, and Helm CRD policy guidance is valid after the corrections above.
