# Validation Summary: Kubernetes Logs After Container Restart or Pod Deletion

## Status
validated

## Post Type
Technical guide / incident-response reference

## Technologies Covered
- Kubernetes
- kubectl
- Pod and container logging
- Container Runtime Interface (CRI) logging
- Kubelet log rotation and garbage collection
- Deployments and Jobs
- Init containers and native sidecars
- Kubernetes events and audit logs
- Container termination messages
- RBAC

## Sources Consulted
- Kubernetes Logging Architecture: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes Pod Lifecycle: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Kubelet Configuration API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes Container Termination Messages: https://kubernetes.io/docs/tasks/debug/debug-application/determine-reason-pod-failure/
- Kubernetes Pod API: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes Debug Init Containers: https://kubernetes.io/docs/tasks/debug/debug-application/debug-init-containers/
- Kubernetes Sidecar Containers: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Field Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Event API: https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- Kubernetes Garbage Collection: https://kubernetes.io/docs/concepts/architecture/garbage-collection/
- Kubernetes Node-pressure Eviction: https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/
- Kubernetes Auditing: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes RBAC Authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The `--since-time` example described the boundary as “at and after,” while the CLI contract is to return logs after the specified RFC3339 time. Corrected the comment to match the flag definition.
- The `--ignore-errors` example referred to an individual log request. Clarified that the flag makes errors non-fatal while watching or following logs, matching the current CLI reference.
- The file-logging guidance could be read as sending multiple differently formatted files through one sidecar's single stdout stream. Changed it to recommend one streaming sidecar per file, preserving separate streams as the official logging architecture recommends.
- The termination-message explanation said Kubernetes can fall back to the tail of container logs when the termination file is empty, but omitted that `FallbackToLogsOnError` also requires the container to exit with an error. Added that condition to match the Container API and termination-message documentation.

## Review Notes
The commands and flags match the current Kubernetes v1.36 `kubectl logs` reference and were also checked against local `kubectl` v1.34.1 help. The Bash snippets passed syntax checking, and the Pod manifest parsed as valid YAML. Runtime results such as available log history, event retention, node-local evidence, and backend metadata enrichment remain dependent on kubelet configuration, garbage collection, cluster provider behavior, and the selected logging system; the post describes those limits appropriately.
