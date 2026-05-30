# Validation Summary: How to Troubleshoot CrashLoopBackOff Errors on AKS Pods

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Kubernetes Service (AKS)
- Kubernetes Pods and container lifecycle
- Init containers
- Ephemeral containers
- kubectl
- Kubernetes Deployments
- Kubernetes resource requests, limits, and probes

## Sources Consulted
- Kubernetes Pod Lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Init Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/init-containers/
- Kubernetes Ephemeral Containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Resource Management for Pods and Containers documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Liveness, Readiness, and Startup Probes documentation: https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/

## Issues Found
- The CrashLoopBackOff explanation implied Kubernetes restarts every container that exits with a non-zero code. Updated it to clarify that restarts depend on the pod restart policy, while preserving the default exponential backoff timing.
- The exit code table described exit code 2 as "Shell command not found." Updated it to "Shell built-in misuse or command-line usage error"; command not found is correctly covered by exit code 127.
- The temporary Deployment example under entrypoint overriding was missing the required `spec.selector` and matching pod template labels for an `apps/v1` Deployment. Added a selector and labels so the manifest is structurally valid.
- The resource limit prevention note stated too absolutely that missing limits will crash the container and potentially take down the node. Updated it to the more accurate Kubernetes behavior: memory leaks without limits can consume node memory and destabilize other workloads.

## Review Notes
The post is technically sound after the corrections above. `kubectl` was not installed in the local workspace, so command verification was performed against official Kubernetes CLI documentation rather than local `kubectl --help` output. The post is framed for AKS but relies mostly on standard Kubernetes behavior, which is appropriate for the topic.
