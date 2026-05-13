# Validation Summary: How to Use Variable Substitution for Cluster Region in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Kustomization
- Flux post-build variable substitution
- Flux HelmRelease
- Flux CLI
- Kubernetes ConfigMap
- Kubernetes StatefulSet
- Kubernetes Deployment
- Kubernetes Ingress
- Kubernetes CronJob
- Kubernetes NetworkPolicy
- kubectl

## Sources Consulted
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux `flux get kustomizations` command reference: https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux `flux events` command reference: https://fluxcd.io/flux/cmd/flux_events/
- Flux `flux bootstrap github` command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- Kubernetes `kubectl config use-context` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_use-context/

## Issues Found
- The NetworkPolicy section said the example allowed traffic only to regional service endpoints, but the sample also permits egress to any destination on TCP 443 and UDP 53. Updated the wording to accurately describe private regional service ranges plus shared HTTPS/DNS endpoints.
- The verification command used `flux get kustomization apps`, but the documented Flux CLI command is `flux get kustomizations`. Updated the command to the supported plural form.

## Review Notes
Flux post-build substitution loads ConfigMap and Secret data keys as variables and performs substitution after the Kustomize build. The referenced ConfigMap is in the same namespace as the Flux Kustomization, which matches the documented `substituteFrom` usage. The Kubernetes resource snippets use current stable API versions, but they are examples and assume the referenced namespaces, Services, HelmRepositories, ingress controller, cert-manager issuer, and external-dns integration already exist.
