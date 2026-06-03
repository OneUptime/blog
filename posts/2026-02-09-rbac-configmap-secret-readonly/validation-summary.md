# Validation Summary: How to Build RBAC Roles That Allow ConfigMap and Secret Read Access Only

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes ConfigMaps
- Kubernetes Secrets
- Kubernetes audit policy
- kubectl
- jq
- External Secrets Operator

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- Kubernetes audit policy API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- External Secrets Operator Kubernetes provider documentation: https://external-secrets.io/latest/provider/kubernetes/
- jq local CLI validation with jq 1.7

## Issues Found
- The post described `list` on ConfigMaps and Secrets as showing only names and metadata unless combined with `get`. Kubernetes authorization maps collection `GET` to `list`, including full object content, so `list` on Secrets can expose Secret data. Updated the explanation and Secret lister section to warn that `list` is not metadata-only.
- The Secret lister example claimed developers could list Secrets but not read contents. Updated it to show that default table output hides values, while `kubectl get secrets -o yaml` can expose data from the list response.
- The audit log jq query used invalid jq syntax: `.verb in ["get", "list"]`. Replaced it with `(.verb == "get" or .verb == "list")`.
- The External Secrets example used `external-secrets.io/v1beta1` and implied Kubernetes users with Secret read access would still need Vault permissions. Updated the example to `external-secrets.io/v1` and clarified that provider permissions control what the operator fetches, but synced Kubernetes Secrets are readable by Kubernetes users with Secret read access.
- The External Secrets target RBAC example omitted `get` on Secrets while describing operator-managed Secret writes. Added `get` alongside `create`, `update`, and `patch`.
- The break-glass script referenced `--clusterrole=secret-reader`, but the post defined `secret-reader` as a namespaced Role. Changed the command to `--role=secret-reader`.

## Review Notes
- The post is technically valid after the corrections. Future improvements could include adding a note that `resourceNames` cannot be used to authorize unrestricted list/watch requests because list and watch requests do not specify an individual resource name.
