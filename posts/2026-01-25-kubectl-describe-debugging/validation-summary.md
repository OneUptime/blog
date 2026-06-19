# Validation Summary: How to Use kubectl describe for Debugging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes Pods, Deployments, Services, Nodes, PersistentVolumeClaims, Events, and EndpointSlices

## Sources Consulted
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Debug Services task: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes Node Status reference: https://kubernetes.io/docs/reference/node/node-status/
- Kubernetes Debug Running Pods task: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/

## Issues Found
- The Deployment troubleshooting section described `Progressing: False` generally as "rollout not making progress." Updated it to specify `ProgressDeadlineExceeded`, which is the documented condition reason after the deployment progress deadline is exceeded, and added `kubectl rollout status` as the documented way to confirm rollout progress.
- The Service troubleshooting section used `kubectl get endpoints`. The legacy Endpoints API is deprecated as of Kubernetes v1.33, and official service debugging documentation now checks EndpointSlices. Updated the command to `kubectl get endpointslices -l kubernetes.io/service-name=api-server -n production` and adjusted the surrounding wording.

## Review Notes
Most examples are intentionally illustrative and use plausible `kubectl describe` output rather than exact output from a live cluster. The commands and troubleshooting concepts are current after the EndpointSlices update. `kubectl` was not installed in the local workspace, so CLI validation was performed against the current official Kubernetes command reference instead of local `--help` output.
