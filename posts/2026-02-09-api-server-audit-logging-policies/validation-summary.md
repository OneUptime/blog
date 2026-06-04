# Validation Summary: How to Configure Kubernetes API Server Audit Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes API server
- Kubernetes audit logging
- Kubernetes audit policy API (`audit.k8s.io/v1`)
- Kubernetes audit log and webhook backends
- `jq`

## Sources Consulted
- Kubernetes Auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes kube-apiserver command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kube-apiserver Audit Configuration (`audit.k8s.io/v1`) reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Kubernetes TokenReview API reference: https://kubernetes.io/docs/reference/kubernetes-api/authentication-resources/token-review-v1/
- Kubernetes Authentication documentation for service account usernames and groups: https://kubernetes.io/docs/reference/access-authn-authz/authentication/

## Issues Found
- Corrected TokenReview audit policy examples to use the `authentication.k8s.io` API group instead of the core API group.
- Reworded comments that claimed policies could log only authentication failures or admission webhook failures, because audit policy rules match request metadata and do not filter on response success or failure.
- Replaced wildcard namespace and service account user examples (`prod-*`, `dev-*`, `system:serviceaccount:kube-system:*`) with exact namespace names or the documented `system:serviceaccounts:kube-system` service account group.
- Corrected the multiple-backend section to state that the same audit policy applies to all enabled audit backends, rather than implying policy rules can route different events to different backends.
- Updated the failed authentication `jq` query to check TokenReview response bodies for `status.authenticated == false`, which requires `RequestResponse` audit logging.
- Replaced the external `logrotate` example that signaled `kube-apiserver` with built-in kube-apiserver audit log rotation flags.
- Clarified that `Request` and `RequestResponse` audit levels do not apply request or response bodies to non-resource requests.
- Reworded comments around `RequestReceived`, pod modification logging, and authorization review logging to match Kubernetes audit semantics.

## Review Notes
The post is now technically valid against current Kubernetes documentation. The examples are general-purpose and do not target a specific Kubernetes version; the reviewed API group and kube-apiserver flags are current as of Kubernetes documentation available on 2026-06-04.
