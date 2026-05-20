# Validation Summary: How to Order ConfigMaps and Secrets Before Deployments in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync waves and hooks
- Kubernetes ConfigMaps
- Kubernetes Secrets
- Kubernetes Deployments
- Kubernetes Services and ServiceAccounts
- External Secrets Operator
- Kustomize configMapGenerator

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Kubernetes Configure a Pod to Use a ConfigMap: https://kubernetes.io/docs/tasks/configure-pod-container/configure-pod-configmap/
- Kubernetes Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Updating Configuration via a ConfigMap: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- Kubernetes Declarative Management of Kubernetes Objects Using Kustomize: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization
- External Secrets Operator ExternalSecret API: https://external-secrets.io/latest/api/externalsecret/
- OneUptime linked ArgoCD sync waves post: https://oneuptime.com/blog/post/2026-02-09-argocd-sync-waves-ordered-deployments/view
- OneUptime linked namespace ordering post: https://oneuptime.com/blog/post/2026-02-26-argocd-order-namespace-creation-sync-waves/view

## Issues Found
- The post described missing non-optional ConfigMaps or Secrets as causing container crashes and CrashLoopBackOff. Kubernetes documentation says missing non-optional ConfigMaps or Secrets prevent the pod from starting until the referenced object or key is available. Updated the introduction, problem explanation, and sequence diagram to describe pod startup blocking / CreateContainerConfigError-style behavior instead of CrashLoopBackOff.
- The post said same-wave resources may be created in any order. Argo CD documents sync ordering by phase, wave, kind, and name. Updated the explanation to state the documented ordering and frame explicit waves as clearer dependency ordering, especially for resources produced by controllers or custom resources.
- The post said ConfigMaps in the same wave deploy "in parallel." Argo CD documents ordered application by sync wave and resource ordering, so this was changed to "as part of wave -1."
- The ExternalSecret section implied that using wave -2 instead of wave -1 gives the External Secrets Operator enough time to create the target Secret. Argo CD's default inter-wave delay is short and does not by itself guarantee external controller reconciliation. Updated the text to say this ordering gives the operator a chance to reconcile and recommended an Argo CD health check or PreSync wait when a strict guarantee is required.
- The final ordering section used "guarantees" and said networking is set up after workloads are running. Sync waves make ordering explicit, but a Service can be applied after workload creation without guaranteeing pods are already running. Updated the wording accordingly.

## Review Notes
The Kubernetes and External Secrets Operator YAML examples use current API versions and valid field names. The internal OneUptime links returned HTTP 200 during validation. The ConfigMap update section is technically correct: mounted ConfigMap data is eventually updated, but environment-variable consumption needs a pod replacement or rollout; Kustomize's generator hash suffix behavior is also documented.
