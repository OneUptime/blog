# Validation Summary: How to Use kubectl describe to Analyze Pod Events and Resource Issues

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes Pods
- Kubernetes Events
- Pod scheduling, probes, volumes, QoS classes, and container status
- Bash shell commands

## Sources Consulted
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes Pod Quality of Service Classes documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes Liveness, Readiness, and Startup Probes documentation: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes Debug Running Pods documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/
- Kubernetes Debug Init Containers documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-init-containers/

## Issues Found
- The post referred to `Scheduled`, `Pulling`, `Failed`, and similar values as event types. Kubernetes Events have a `type` such as `Normal` or `Warning`; those values are event reasons. Changed the wording to "Common event reasons."
- The `BackOff` reason was described only as a CrashLoopBackOff state. `BackOff` is also used for other retry back-offs, such as image pull back-offs. Updated the explanation to cover failed restarts or image pulls.
- A command comment said pod `Conditions` showed resource pressure. Pod conditions show pod readiness and scheduling state; node pressure is represented through node conditions and related events. Changed the comment to "View pod conditions."
- The container status example equated exit code 137 directly with OOMKilled while showing `Last State` reason as `Error`. Kubernetes typically reports an OOM termination as `Reason: OOMKilled`; exit code 137 means SIGKILL and is commonly associated with OOM kills. Updated the example accordingly.
- The `pod-health` helper tried to read readiness using `grep "^Ready:"`, but `kubectl describe pod` readiness appears under the `Conditions` table rather than as a top-level `Ready:` field. Replaced it with an `awk` command that extracts the `Ready` condition from the conditions table.

## Review Notes
The remaining commands and examples are technically plausible for current Kubernetes/kubectl usage. Several examples parse human-readable `kubectl describe` output with `grep` and `awk`; that is acceptable for an article about `describe`, but future production scripts would be more robust with `kubectl get -o jsonpath` or structured API output.
