# Validation Summary: How to Monitor Flagger Canary Events and Conditions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Flagger
- Kubernetes Canary custom resources
- Kubernetes Events
- kubectl
- Flagger AlertProvider resources
- Prometheus and PrometheusRule alerting
- Bash

## Sources Consulted
- Flagger documentation: How it works, Canary status: https://docs.flagger.app/usage/how-it-works
- Flagger documentation: Monitoring, event webhooks, and metrics: https://docs.flagger.app/usage/monitoring
- Flagger documentation: Alerting and AlertProvider configuration: https://fluxcd.io/flagger/usage/alerting/
- Kubernetes official kubectl events reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Flagger source: event recording uses Kubernetes event reason `Synced`: https://github.com/fluxcd/flagger/blob/main/pkg/controller/events.go
- Flagger source: Canary condition phases and messages: https://github.com/fluxcd/flagger/blob/main/pkg/canary/status.go
- Flagger source: Prometheus metric labels and status values: https://github.com/fluxcd/flagger/blob/main/pkg/metrics/recorder.go
- Flagger source: supported notifier providers: https://github.com/fluxcd/flagger/blob/main/pkg/notifier/factory.go

## Issues Found
- The event table listed rollout actions such as `ScalingUp`, `AdvanceCanary`, `Promotion`, and `RollbackCanary` as Kubernetes event reasons. Flagger records canary events with reason `Synced`; the rollout action is in the event message. Updated the table to show `Synced` with representative Normal and Warning messages.
- The Canary condition examples used messages that did not match Flagger's current condition messages. Updated the examples to match Flagger's phase-based messages.
- The alerting section referenced PagerDuty, which is not a supported Flagger AlertProvider type in the current source. Replaced the PagerDuty example with a second Slack alert entry using a valid provider reference.
- The Prometheus examples used a non-existent `status` label on `flagger_canary_status`, used `name` instead of `workload` for `flagger_canary_weight`, and queried a non-existent bare `flagger_canary_duration_seconds` series. Updated the examples to use Flagger's documented status gauge values, weight labels, and histogram series.
- The PrometheusRule used the invalid `flagger_canary_status{status="failed"}` selector. Updated it to alert when `flagger_canary_status == 2`, matching Flagger's documented failed status value.
- The event collector script used unquoted shell variables. Quoted `"$NAMESPACE"` and `"$LOG_FILE"` to avoid shell splitting issues.

## Review Notes
The `kubectl get events` examples use the classic Event fields such as `involvedObject` and `lastTimestamp`, which remain common in `kubectl get events` output. For newer event-focused workflows, `kubectl events --for TYPE/NAME --watch` is the more direct interface documented by Kubernetes.
