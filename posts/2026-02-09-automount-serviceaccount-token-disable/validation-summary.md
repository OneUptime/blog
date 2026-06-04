# Validation Summary: How to Use automountServiceAccountToken to Disable Unnecessary Token Mounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes ServiceAccounts
- Kubernetes RBAC
- kubectl
- jq
- Python Kubernetes client

## Sources Consulted
- Kubernetes documentation: Configure Service Accounts for Pods - https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- Kubernetes documentation: Service Accounts - https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes documentation: Managing Service Accounts - https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes documentation: Using RBAC Authorization - https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Local syntax checks for the revised jq query and Python audit snippet.

## Issues Found
- The backup controller RBAC example included `persistentvolumes` in a namespaced `Role`. Kubernetes RBAC documentation states that `Role` grants permissions within a namespace, while `ClusterRole` is used for cluster-scoped resources. I removed `persistentvolumes` from the namespaced `Role` because the surrounding text only says the controller needs to list PVCs and pods.
- The pod audit command selected pods whose `.spec.automountServiceAccountToken` was not explicitly `false`, which can report pods whose ServiceAccount disables automounting and therefore do not actually have a token mounted. I changed it to inspect pod volumes for projected service account token sources.
- The Python audit script had the same false-positive issue because it skipped only pods with pod-level `automount_service_account_token == False`. I changed it to check whether the pod actually has a projected service account token volume before applying the web-app heuristic.

## Review Notes
The main automount behavior, pod-level precedence over ServiceAccount-level settings, default ServiceAccount assignment, Linux token mount path, and current Kubernetes v1.22+ projected-token behavior are consistent with official Kubernetes documentation. The examples use current stable API versions (`v1`, `apps/v1`, and `rbac.authorization.k8s.io/v1`).
