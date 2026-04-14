# Validation Summary: How to Use Dapr with Kubernetes Init Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar injector, annotations)
- Kubernetes (Deployments, init containers, pods, Secrets, resource limits)
- HashiCorp Vault (Kubernetes auth method, KV secrets engine)
- Redis (as an example backing service)
- BusyBox (for lightweight init container tasks)

## Sources Consulted
- Kubernetes official documentation on init containers: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Deployment spec reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/deployment-v1/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr sidecar injector documentation: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- HashiCorp Vault CLI reference for `vault login` and `vault kv get`: https://developer.hashicorp.com/vault/docs/commands
- kubectl reference for `logs` and `describe`: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
1. **Missing pod template labels in Deployment YAML** (Basic Init Container with Dapr section): The `spec.selector.matchLabels` specified `app: order-service`, but the pod template `metadata` only contained `annotations` with no `labels` block. Kubernetes requires that the pod template labels match the selector; without them, the Deployment would be rejected at apply time with a validation error. **Fix**: Added `labels: { app: order-service }` to `template.metadata` above the `annotations` block.

## Review Notes
- The post correctly notes that Dapr APIs are unavailable inside init containers since the sidecar hasn't started yet. This is an important caveat for readers.
- The Vault example uses `hashicorp/vault:latest` — in production, pinning to a specific version tag would be safer, but this is acceptable for a tutorial.
- The `busybox:1.36` image is a reasonable choice for the dependency-check init container example.
- All kubectl commands use correct syntax and flags.
- All Dapr annotations (`dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`) are valid and current.
