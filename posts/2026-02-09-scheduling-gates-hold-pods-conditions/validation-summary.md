# Validation Summary: How to Configure Scheduling Gates to Hold Pods Until External Conditions Are Met

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Pods
- Kubernetes scheduling gates / Pod Scheduling Readiness
- Kubernetes Deployments and Jobs
- kubectl JSON patches
- Go client-go controllers
- jq filters

## Sources Consulted
- Kubernetes Pod Scheduling Readiness documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-scheduling-readiness/
- Kubernetes Pod v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post said scheduling gates were introduced in Kubernetes 1.26 without noting feature maturity. Updated the wording to say they were introduced as alpha in Kubernetes 1.26 and became stable in Kubernetes 1.30, matching the official Pod Scheduling Readiness documentation.
- The Go controller removed items from `pod.Spec.SchedulingGates` while ranging over the same slice and attempted an API update for each removal. This could skip gates, panic on stale indexes, or hit resource-version conflicts when more than one gate was removed from the same Pod. Updated the example to filter remaining gates and update the Pod once.
- The database migration Deployment used `spec.selector.matchLabels.app: api-server` but omitted matching `spec.template.metadata.labels`, which would be rejected by the Kubernetes API. Added the matching template label.
- The monitoring `jq` examples selected Pods where `.spec.schedulingGates != null`, which could include Pods with an empty gates array. Updated the filters to require a non-empty gates list.

## Review Notes
The remaining `kubectl patch --type=json` examples use valid JSON Patch syntax for removing the `spec.schedulingGates` field. Scheduling gates can be set only at Pod creation time and removed afterward; the post now reflects the stable feature state while preserving the author's original structure.
