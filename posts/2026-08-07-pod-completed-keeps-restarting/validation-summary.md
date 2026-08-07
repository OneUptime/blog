# Validation Summary: Why Does a Long-Running Pod Exit as `Completed` and Keep Restarting?

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes Pods and container lifecycle states
- Pod-level and container-level restart policies
- Deployments, StatefulSets, DaemonSets, Jobs, and CronJobs
- Native sidecar containers
- Kubernetes liveness probes and restart backoff
- `kubectl`, JSONPath, custom columns, and container logs
- Container entrypoints, arguments, POSIX shell wrappers, and process signaling
- Kubernetes YAML manifests
- `jq`

## Sources Consulted
- [Kubernetes Pod lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes Pod API reference](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/)
- [Kubernetes Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/job/)
- [Kubernetes Job API reference](https://kubernetes.io/docs/reference/kubernetes-api/batch/job-v1/)
- [Kubernetes Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Define a Command and Arguments for a Container](https://kubernetes.io/docs/tasks/inject-data-application/define-command-argument-container/)
- [Configure Liveness, Readiness and Startup Probes](https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- [Kubernetes Deployments](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
- [Kubernetes DaemonSet](https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/)
- [Kubernetes StatefulSet API reference](https://kubernetes.io/docs/reference/kubernetes-api/apps/stateful-set-v1/)
- [Automatic Cleanup for Finished Jobs](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/)
- [`kubectl` JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [`kubectl get`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/), [`kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/), [`kubectl describe`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/), and [`kubectl rollout status`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_status/)
- [Kubernetes Object Names and IDs](https://kubernetes.io/docs/concepts/overview/working-with-objects/names/) and [Owners and Dependents](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/)

## Issues Found
- The restart-policy explanation treated the Pod-level policy as the only policy for regular containers. Kubernetes v1.35 promoted the `ContainerRestartRules` feature to beta and enabled it by default; it lets application and regular init containers override the Pod-level policy. The introductory claim, policy table context, and conclusion were qualified, and the feature-gated exception was added.
- The opening described `Completed` as an unconditional mapping to exit code `0`. It was changed to say that `Completed` normally reports a successful container exit, consistent with the later distinction between container status and the human-oriented `kubectl` `STATUS` column.
- The troubleshooting section claimed that the previous termination record proves whether a restart was probe-triggered. A terminated state reports the process outcome but does not by itself identify the external trigger. The text now requires events and timestamps to attribute the termination to a probe or another external action.
- The wrapper example claimed that `exec` always makes the server process 1. That is not universal when a Pod shares its process namespace. The text now accurately says that `exec` replaces the shell with the server as the container's main process.
- The Job discussion described replacement Pods as being created "up to `backoffLimit`," which could be read as a Pod-count guarantee. It now states the documented behavior: replacement Pods are created while the failure count remains below `backoffLimit`.

## Review Notes
- The current official documentation is for Kubernetes v1.36. `ContainerRestartRules` remains beta and feature-gated, so clusters that disable it retain the traditional Pod-level behavior described by the table.
- The Deployment and Job manifests use current stable API versions and valid field placement; both full manifests also passed a `kubectl` v1.34.1 client-side dry run. The example images, binaries, and application flags are intentionally illustrative and cannot be runtime-tested as published artifacts.
- The `kubectl` commands, JSONPath templates, `jq` filter, log flags, watch flag, rollout timeout, and custom-column output are syntactically current. No deprecated APIs or CLI options were found.
- All external documentation and author links in the post resolved to their intended destinations.
