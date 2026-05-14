# Validation Summary: How to Monitor Flux CD with Kubernetes Dashboard

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Dashboard
- Kubernetes RBAC
- Kubernetes custom resources and CRDs
- Flux CD
- Flux source-controller resources
- Flux kustomize-controller resources
- Flux helm-controller resources
- Kubernetes events

## Sources Consulted
- Kubernetes Dashboard official documentation: https://kubernetes.io/docs/tasks/access-application-cluster/web-ui-dashboard/
- Kubernetes custom resources official documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/api-extension/custom-resources/
- Kubernetes kube-apiserver reference for event retention: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The Kubernetes Dashboard installation command used the old v2.7.0 manifest URL. The official Kubernetes documentation now states Dashboard supports Helm-based installation, so the post was updated to use the official Helm repository and `helm upgrade --install` command.
- The Dashboard access instructions used `kubectl proxy` and the old API proxy URL. The official documentation now uses `kubectl port-forward svc/kubernetes-dashboard-kong-proxy 8443:443` and `https://localhost:8443`, so the post was updated.
- The post did not mention that Kubernetes Dashboard is now deprecated and unmaintained. A short caveat was added near the introduction so readers understand this is best suited to existing Dashboard deployments.
- The RBAC example bound Flux read permissions to the Dashboard service account. Current Dashboard authentication uses a bearer token for the account used to log in, so the example now creates and binds a dedicated `flux-dashboard-viewer` ServiceAccount and shows how to create its token.
- The auto-refresh claim referenced Dashboard settings without official support in the current documentation. The text was changed to recommend browser auto-refresh for continuous visual checks.

## Review Notes
The remaining Flux status examples are representative rather than exhaustive. Different Flux resources use different `reason` values for successful `Ready` conditions, but the guidance to inspect `status.conditions`, `status.artifact`, and Kubernetes events is technically correct.
