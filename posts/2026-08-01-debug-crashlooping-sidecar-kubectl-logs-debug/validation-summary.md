# Validation Summary: Debug a CrashLooping Sidecar with `kubectl logs` and `kubectl debug`

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Kubernetes Pods and container lifecycle
- Native and legacy sidecar containers
- `kubectl logs` and `--previous`
- `kubectl describe`, Events, JSONPath, and `kubectl exec`
- `kubectl debug`, ephemeral containers, debug profiles, and copied Pods

## Sources Consulted

- [Kubernetes: Pod Lifecycle](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- [Kubernetes: Sidecar Containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes: Debug Init Containers](https://kubernetes.io/docs/tasks/debug/debug-application/debug-init-containers/)
- [Kubernetes: Logging Architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/)
- [Kubernetes: `kubectl logs`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/)
- [Kubernetes: Debug Running Pods](https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/)
- [Kubernetes: `kubectl debug`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/)
- [Kubernetes: Ephemeral Containers](https://kubernetes.io/docs/concepts/workloads/pods/ephemeral-containers/)
- [Kubernetes: Liveness, Readiness, and Startup Probes](https://kubernetes.io/docs/concepts/workloads/pods/probes/)
- [Kubernetes `kubectl debug` source, v1.36.0](https://github.com/kubernetes/kubernetes/blob/v1.36.0/staging/src/k8s.io/kubectl/pkg/cmd/debug/debug.go)
- [POSIX.1-2024: Shell Command Language](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/V3_chap02.html)

## Issues Found

- The introduction said that a missing mount or Secret could make the sidecar exit. A missing required Secret or volume reference can prevent container startup instead. The wording now refers specifically to an expected mounted file or Secret key being absent, which can cause the process to exit.
- Probe failures were described generically as a crash-loop cause. Readiness probe failures do not restart a container, so the relevant statements now identify liveness and startup probes specifically.
- Exit 137 was presented alongside `OOMKilled` without distinguishing the two. The table now says that OOM kills often report exit 137 but requires readers to confirm the termination reason and signal rather than diagnosing OOM from that exit code alone.
- Exit codes 126 and 127 were presented as universal container exit-code meanings. They are shell-defined statuses, so the row now scopes them to shell execution and distinguishes “found but not executable” from “command not found.”
- The ephemeral debug command relied on the client's default debug profile, which has changed across `kubectl` versions. It now selects the current `general` profile explicitly.
- The copied-Pod example said it could swap in a diagnostic image but only changed the selected container's command. It now supplies the diagnostic image explicitly while changing the command to `sh`.
- The final logging command used `<new-pod>`, which a shell parses as input redirection. It now assigns an example Pod name to `NEW_POD` and quotes the variable in the command.

## Review Notes

- Native sidecars are restartable init containers with container-level `restartPolicy: Always`; they are reported in `status.initContainerStatuses`. The feature is stable as of Kubernetes v1.33.
- `kubectl logs --previous` exposes only the immediately previous container instance when it exists, and kubelet-managed logs are not durable history.
- `--target` process-namespace behavior depends on container-runtime support, and an ephemeral debug container does not automatically inherit the target container's volume mounts.
- The example registry, image digest, Pod names, namespace, labels, and controller name are illustrative and must be replaced with values from the target cluster.
