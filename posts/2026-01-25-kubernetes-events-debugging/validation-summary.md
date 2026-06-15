# Validation Summary: How to Use Kubernetes Events for Debugging

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes Events
- kubectl
- Kubernetes API objects and field selectors
- kube-apiserver event retention
- kube-state-metrics
- Prometheus alerting rules
- kubernetes-event-exporter
- Bash, jq, and YAML

## Sources Consulted
- Kubernetes API reference: Event, https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- Kubernetes kubectl reference: kubectl get, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl reference: kubectl events, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes field selectors documentation, https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes kube-apiserver reference for `--event-ttl`, https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes resource management documentation for OOMKilled status, https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes images documentation for ImagePullBackOff behavior, https://kubernetes.io/docs/concepts/containers/images/
- kube-state-metrics pod metrics documentation, https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kubernetes-event-exporter README and configuration examples, https://github.com/jkroepke/resmoio-kubernetes-event-exporter

## Issues Found
- The "Most recent events first" command sorted by `.metadata.creationTimestamp`, which can differ from the most recent event occurrence. Changed it to sort by `.lastTimestamp` and reverse the rows with `tac`.
- The "Failed scheduling in the last hour" example did not filter by time. Changed the comment to "Recent failed scheduling events" so the description matches the command.
- The 5-minute time-window example compared an ISO cutoff against the first tabular output column, which is the namespace when using `-A`. Replaced it with a JSON and `jq` query that selects events by timestamp.
- The resource issue example used `OOMKilled` as an event reason. Changed it to `OOMKilling`; `OOMKilled` is commonly surfaced as a container termination reason/status.
- The kube-state-metrics Prometheus expression used `kube_pod_status_scheduled_time{condition="false"}`, but that metric is a timestamp gauge and does not have a `condition` label. Replaced it with `max_over_time(kube_pod_status_unschedulable[5m]) > 0`.

## Review Notes
The post uses core `v1` Event fields such as `firstTimestamp`, `lastTimestamp`, and `count`, which are still represented in the core Event API but have newer counterparts in `events.k8s.io/v1`. Future revisions could mention `kubectl events` as a higher-level alternative to `kubectl get events` for common event viewing workflows.
