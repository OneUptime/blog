# Validation Summary: Preserve Logs, Traces, and State Before Automatic Rollback Erases Evidence

## Status
validated

## Post Type
Technical guide with Kubernetes configuration and Bash collection examples.

## Technologies Covered
- Kubernetes Pods, ReplicaSets, container logs, owner references, Events, and RBAC
- Argo Rollouts canary and blue-green strategies, analysis, and notifications
- OpenTelemetry Collector persistent queues, service resource attributes, and trace sampling
- Bash, jq, kubectl, and GNU Coreutils timeout
- Incident evidence collection, telemetry retention, and artifact integrity

## Sources Consulted
- [Kubernetes logging architecture](https://kubernetes.io/docs/concepts/cluster-administration/logging/) — container log retention, rotation, and previous-instance access.
- [kubectl logs reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/) — container selection, timestamps, previous logs, time filtering, byte limits, and inherited request timeout.
- [Kubernetes Pod API](https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/#read-log) — Pod status and log request parameters, including approximate byte limits.
- [Kubernetes owners and dependents](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/) — owner references and UID-based identity.
- [Kubernetes images](https://kubernetes.io/docs/concepts/containers/images/) — immutable image digests.
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/#referring-to-resources) — namespaced permissions and the pods/log subresource.
- [Argo aborted ReplicaSet scale-down behavior](https://argoproj.github.io/argo-rollouts/features/scaledown-aborted-rs/) — v1.1 behavior, strategy applicability, and zero-value semantics.
- [Argo Rollout specification](https://argoproj.github.io/argo-rollouts/features/specification/) — placement and meaning of abortScaleDownDelaySeconds.
- [Argo analysis](https://argoproj.github.io/argo-rollouts/features/analysis/) — failed analysis and abort behavior.
- [Argo notifications](https://argoproj.github.io/argo-rollouts/features/notifications/) — on-rollout-aborted trigger and configured subscriptions.
- [OpenTelemetry Collector resiliency](https://opentelemetry.io/docs/collector/resiliency/) — file_storage-backed sending queues and remaining loss scenarios.
- [OpenTelemetry service conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/) — service.name and service.version.
- [OpenTelemetry sampling](https://opentelemetry.io/docs/concepts/sampling/) — head and tail sampling, error policies, and release attributes.
- [jq manual](https://jqlang.org/manual/) — object projection, optional iteration, del, any, and exit-status handling.
- GNU Bash built-in documentation, inspected with `bash -c 'help set'` — errexit, nounset, and pipefail. The [online set manual](https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html) timed out during retrieval.
- GNU Coreutils documentation, inspected with `timeout --help` — TERM, kill-after, duration units, and exit statuses. The post's [online timeout manual](https://www.gnu.org/software/coreutils/manual/html_node/timeout-invocation.html) timed out during retrieval; its documented URL is appropriate.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The post contains substantive implementation details and qualifies for technical validation.
- The YAML fragment uses the documented canary field. The distinction between traffic-routed and basic canaries, the corresponding blue-green field, zero disabling scale-down, and the v1.1 version caveat are accurate. Actual retention still depends on the installed controller, routing behavior, capacity, and Pod survival.
- Collector persistence requires durable storage and exporter support; it does not establish backend retention. Build identity and deployment-attempt identity are correctly separated. Tail sampling cannot restore spans already dropped upstream.
- Both Bash blocks passed `bash -n`. The capture script was exercised with a mock kubectl and real Bash/jq for successful collection, unavailable previous logs, incorrect Pod UID, incorrect ReplicaSet owner UID, Pod replacement between snapshots, and a failed Pod read. These checks covered completion-marker behavior, per-log exit codes, identity rejection, and removal of the selected status message fields.
- The script correctly relies on a previously verified request for the complete Pod-to-ReplicaSet-to-Rollout owner chain. It checks Pod and ReplicaSet identity itself, while selected-container status and restart comparisons remain explicit follow-up checks described in the prose.
- A successful worker exit or finished.txt does not establish successful log retrieval or upload. The post accurately documents partial results, non-atomic reads, current/previous attribution uncertainty, approximate byte limits, and the absence of an upper time-bound flag.
- Validation used official documentation and local shell checks, not a running Kubernetes cluster or Argo/OpenTelemetry deployment. No live rollback, notification delivery, backend export, or upload durability test was performed. GNU timeout behavior was checked against installed command help; the full 25-second wrapper was not exercised against a cluster.
- Linked technical resources resolve to the intended official documentation, apart from the GNU retrieval timeouts noted above. No deprecated APIs or flags were identified in the examples.
