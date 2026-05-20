# Validation Summary: How to Use HookSucceeded Delete Policy in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource hooks
- Argo CD hook delete policies
- Kubernetes Jobs
- Kubernetes Pods
- kubectl
- YAML configuration

## Sources Consulted
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Kubernetes Jobs documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Pod Lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post described `HookSucceeded` as the most common/default choice. Argo CD's official default when no delete policy is specified is `BeforeHookCreation`, so this was changed to describe `HookSucceeded` as a commonly used/good choice.
- The post said Argo CD deletes successful hook resources "immediately" and gave a specific 5 to 15 second deletion window. The official documentation only guarantees deletion after hook success, so the wording was changed to avoid unsupported timing guarantees.
- The failed-hook accumulation section claimed repeated failed sync attempts with a named hook create multiple failed Jobs. Argo CD documents that named hooks are only created once unless `BeforeHookCreation` or `generateName` is used, so the section was corrected to explain that a failed named hook remains and can block later sync attempts until cleaned up.
- The health-check example used `curl` against PostgreSQL and Redis ports, which are not HTTP endpoints. The example was changed to check dependent HTTP health endpoints instead.

## Review Notes
The Kubernetes Job and Pod examples use current `batch/v1` Job syntax and valid Pod restart policy values. The `kubectl logs job/<name>` command is supported by the official kubectl reference. Named hooks with only `HookSucceeded` are valid, but authors should be aware that failed named hooks must be manually deleted or paired with `BeforeHookCreation` for later sync attempts.
