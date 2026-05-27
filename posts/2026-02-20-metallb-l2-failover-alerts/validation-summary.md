# Validation Summary: How to Alert on MetalLB L2 Leader Node Failover Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- MetalLB
- Prometheus
- Prometheus Operator
- Alertmanager
- Grafana

## Sources Consulted
- MetalLB Layer 2 concepts: https://metallb.io/concepts/layer2/
- MetalLB Prometheus metrics documentation: https://metallb.io/prometheus-metrics/
- MetalLB troubleshooting and advertisement status documentation: https://metallb.io/troubleshooting/
- MetalLB FAQ for ServiceL2Status and ServiceBGPStatus: https://metallb.io/faq/
- MetalLB upstream speaker metric source: https://github.com/metallb/metallb/blob/main/speaker/main.go
- MetalLB upstream ServiceL2Status API source: https://github.com/metallb/metallb/blob/main/api/v1beta1/servicel2status_types.go
- MetalLB upstream Prometheus manifest examples: https://github.com/metallb/metallb/blob/main/config/manifests/metallb-native-prometheus.yaml
- Prometheus Operator API reference for ServiceMonitor and PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- Kubernetes Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/

## Issues Found
- The post listed `metallb_layer2_announcements`, which is not listed in current MetalLB metrics documentation and was not needed for the alert. Removed it and kept the actual speaker announcement metric.
- The post described `metallb_speaker_announced{value="true"}`, but the upstream metric has labels `service`, `protocol`, `node`, and `ip`; it does not have a `value` label. Updated all PromQL examples to use `protocol="layer2"`.
- The failover PromQL used `changes()` on a label change. PromQL does not treat a changed label value as a value change in the same series. Replaced it with an `unless ... offset 5m` comparison that detects a current announcer that was not the announcer at the offset time.
- The ServiceMonitor example used older/plain HTTP assumptions and selected `app: metallb, component: speaker`. Current MetalLB Prometheus manifests expose speaker metrics through a `speaker-monitor-service` on `metricshttps` port 9120. Updated the ServiceMonitor accordingly.
- The post claimed the metric included a separate `namespace` label. The current metric uses the `service` label for the service identity. Updated explanatory text and alert annotations.
- The `MetalLBNoSpeakerAnnouncing` alert attempted `count by (...) == 0`, which does not produce per-service series for missing metrics. Replaced it with `absent(metallb_speaker_announced{protocol="layer2"})` and adjusted the description to describe the cluster-wide condition it actually detects.
- The frequent failover alert used `changes()` on the same incorrect selector. Reworked it to detect service IPs announced from more than three distinct node-labeled series in a 30-minute window.
- The Alertmanager route examples used deprecated `match` syntax. Updated them to current `matchers` syntax.
- The testing section used events to find the leader. MetalLB documents `ServiceL2Status` as a direct way to inspect the L2 announcing node. Updated the command to `kubectl get servicel2statuses -n metallb-system`.
- The L2 leader election description overstated memberlist's role. Updated it to describe MetalLB's stateless per-speaker computation of the announcing node.

## Review Notes
- The failover alert can also fire when a new LoadBalancer service first appears, because the current announcer was not present at the offset time. In production, teams may want to suppress initial service creation events with additional service inventory or deployment context.
