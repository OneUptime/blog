# Validation Summary: How to Debug OOMKilled Pods in Portainer

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Kubernetes (kubectl, pod resources, events)
- Portainer (manifest editor for Kubernetes deployments)
- Linux OOM killer / cgroups (exit code 137)
- Metrics Server / Prometheus (memory metrics)
- Application memory profiling (Java -Xmx, Python memory profiler, Node.js heap snapshots)

## Sources Consulted
- Kubernetes documentation: Resource Management for Pods and Containers (https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- kubectl reference: `kubectl get`, `kubectl top`, `kubectl logs` (https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands)
- Kubernetes Pod lifecycle / container statuses (https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/)
- Linux signals reference (SIGKILL = 9; exit code = 128 + signal => 137)
- Portainer Kubernetes documentation (https://docs.portainer.io/user/kubernetes)
- Node.js heap snapshot / Chrome DevTools profiling docs

## Issues Found
No technical issues found.

- Exit code 137 derivation (128 + SIGKILL(9)) is correct.
- The jsonpath `{.status.containerStatuses[0].lastState.terminated.reason}` is valid and returns `OOMKilled` for OOM-terminated containers.
- The jsonpath `{.spec.containers[0].resources}` correctly returns the configured resource requests/limits.
- `kubectl top pod` and `kubectl top pods --sort-by=memory` are valid commands (Metrics Server required).
- `kubectl logs <pod> --previous -n production` is the correct invocation to retrieve logs from the previously terminated container instance.
- The YAML `resources.requests.memory` / `resources.limits.memory` structure is correct for Pod/Deployment specs.
- Profiling guidance (Java -Xmx for max heap, Python memory profiler, Node.js heap snapshots in Chrome DevTools) is accurate.

## Review Notes
- The illustrative event line `Warning  OOMKilling  Container api exceeded memory limit` is a simplified representation. In modern Kubernetes you typically see the OOM signal surfaced via the container's `lastState.terminated.reason: OOMKilled` plus a `Warning  BackOff` event when the container is restarted. cAdvisor/kubelet have historically emitted `OOMKilling`/`SystemOOM` events depending on version and OOM source; the example reads as plausible illustrative output rather than an exact reproduction, so it was left in place.
- Portainer is primarily a UI on top of kubectl/Kubernetes APIs, so most of the troubleshooting is done with kubectl commands as shown; the manifest editor reference in Step 5 is correct for Portainer CE/Business with a Kubernetes environment.
- The 20-50% headroom over peak is a reasonable rule of thumb but not a hard standard; consider workload burstiness when applying it.
