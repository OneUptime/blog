# Validation Summary: How to Troubleshoot VolumeMount Permission Denied Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes Volumes and PersistentVolumeClaims
- Kubernetes securityContext, PodSecurityContext, and fsGroup
- fsGroupChangePolicy
- Init containers
- ConfigMap and Secret volume mounts
- emptyDir volumes
- kubectl
- Dockerfile USER configuration

## Sources Consulted
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes API reference: Pod v1, PodSecurityContext and SecurityContext fields - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Volumes, including emptyDir and memory-backed emptyDir - https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes documentation: ConfigMaps - https://kubernetes.io/docs/concepts/configuration/configmap/
- Kubernetes documentation: Secrets - https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes kubectl reference: kubectl exec - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: Init Containers - https://kubernetes.io/docs/concepts/workloads/pods/init-containers/

## Issues Found
- The post stated broadly that Kubernetes changes group ownership of mounted volumes when `fsGroup` is set. Updated the wording to clarify that this applies to volume types that support ownership management, matching the Kubernetes security context documentation.
- The `fsGroupChangePolicy` description only mentioned root directory permissions. Updated it to include ownership and permissions, matching the Kubernetes API reference.
- The post did not mention that `fsGroupChangePolicy` has no effect on ephemeral volume types such as Secrets, ConfigMaps, and emptyDir. Added this caveat because it is explicitly documented in the PodSecurityContext API reference.
- The Secret example used `defaultMode: 0400` and described it as read-only for owner, which is true but incomplete for non-root containers because Secret files may be owned by root unless ownership is adjusted. Updated the comment to mention using `fsGroup` or a matching user for non-root containers.
- The emptyDir memory section said memory-backed emptyDir volumes may have different default permissions. Reworded it to the documented behavior: `medium: Memory` makes the volume tmpfs-backed, and emptyDir still supports ownership management.

## Review Notes
The examples use current Kubernetes v1 Pod APIs and non-deprecated security context fields. The `defaultMode` examples use YAML octal notation, which is valid in Kubernetes YAML manifests; JSON manifests require decimal mode values.
