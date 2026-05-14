# Validation Summary: How to Test Multi-Tenancy Isolation in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Kubernetes ResourceQuota
- Kubernetes CronJob
- kubectl
- Bash

## Sources Consulted
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/cron-job-v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux multi-tenancy configuration documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/

## Issues Found
- The ResourceQuota cleanup command used `kubectl delete pods -l run=pod-test`, but pods created with `kubectl run pod-test-$i` are labeled with their full generated run label, such as `run=pod-test-1`, not `run=pod-test`. I changed the cleanup to list pod resource names matching `pod/pod-test-` and delete those names through `xargs -r`.

## Review Notes
- The examples assume the cluster has Flux CRDs installed, a NetworkPolicy-capable CNI, tenant namespaces and service accounts named consistently, and RBAC permissions allowing the reviewer to use `--as` impersonation for `kubectl auth can-i`.
- The Flux Kustomization isolation explanation matches Flux behavior when the Kustomization runs under a namespace-scoped tenant service account; Flux requires `spec.serviceAccountName` to refer to a ServiceAccount in the Kustomization's namespace.
- `kubectl` was not installed in the local workspace, so command validation was performed against the official generated Kubernetes CLI documentation rather than local `--help` output.
