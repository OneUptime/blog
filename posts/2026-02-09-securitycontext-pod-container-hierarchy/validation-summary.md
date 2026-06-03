# Validation Summary: How to use securityContext at pod and container level hierarchy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Pods
- Kubernetes PodSecurityContext
- Kubernetes container SecurityContext
- Linux security controls: UIDs, GIDs, supplemental groups, capabilities, seccomp, SELinux, sysctls
- kubectl JSON and JSONPath output

## Sources Consulted
- Kubernetes documentation: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes API reference: Pod v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: Seccomp and Kubernetes - https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes documentation: Using sysctls in a Kubernetes Cluster - https://kubernetes.io/docs/tasks/administer-cluster/sysctl-cluster/
- Kubernetes documentation: JSONPath Support - https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The verification commands piped `kubectl -o jsonpath` object output to `jq`. Kubernetes JSONPath output prints result objects as strings, so this is not reliable JSON for `jq`. Changed the commands to use `kubectl get pod ... -o json | jq ...`.
- The verification text said the spec-inspection commands showed the effective security context. The Pod spec shows declared pod defaults and container overrides, while runtime commands such as `id` show the resulting process identity. Updated the wording to distinguish declared configuration from runtime results.
- Several runnable hierarchy examples used images such as `nginx:1.21` with arbitrary non-root UIDs or a read-only root filesystem. Those containers can fail for image-specific filesystem or port-binding reasons unrelated to the hierarchy being demonstrated. Replaced those examples with `busybox:1.36` sleeping containers so the security context behavior can be observed directly.
- The capabilities example used `prometheus:latest`, which is not the canonical Prometheus image reference and was unnecessary for demonstrating container-level capabilities. Replaced it with `busybox:1.36` to keep the example focused on security context behavior.

## Review Notes
The Kubernetes API fields and hierarchy claims are accurate for current Kubernetes documentation: overlapping container `securityContext` settings override pod-level values, `fsGroup`, `supplementalGroups`, and `sysctls` are pod-level fields, and `capabilities` plus `readOnlyRootFilesystem` are container-level fields. Local `kubectl` help could not be checked because `kubectl` is not installed in this environment; command syntax was verified against official Kubernetes documentation instead.
