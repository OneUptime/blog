# Validation Summary: How to Monitor Linkerd with Grafana

## Status
validated

## Post Type
Technical tutorial / monitoring guide

## Technologies Covered
- Linkerd
- Linkerd Viz
- Kubernetes
- Prometheus and PromQL
- Grafana dashboards, datasources, and alerting provisioning
- Sloth SLO definitions
- Jaeger
- Loki

## Sources Consulted
- Linkerd Proxy Metrics reference: https://linkerd.io/2-edge/reference/proxy-metrics/
- Linkerd Grafana task guide: https://linkerd.io/2-edge/tasks/grafana/
- Linkerd Bringing Your Own Prometheus guide: https://linkerd.io/2-edge/tasks/external-prometheus/
- Linkerd Viz CLI reference: https://linkerd.io/2-edge/reference/cli/viz/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana alerting file provisioning documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana Linkerd Top Line dashboard page: https://grafana.com/grafana/dashboards/15474-linkerd-top-line/
- Grafana Linkerd organization dashboards page: https://grafana.com/orgs/linkerd
- Sloth FAQ and PrometheusServiceLevel CRD reference: https://sloth.dev/faq/ and https://raw.githubusercontent.com/slok/sloth/main/pkg/kubernetes/gen/crd/sloth.slok.dev_prometheusservicelevels.yaml

## Issues Found
- The post port-forwarded `svc/linkerd-prometheus` in the `linkerd` namespace, but Linkerd Viz's bundled Prometheus service is `svc/prometheus` in the `linkerd-viz` namespace. Updated the command.
- The metric discovery command grepped for `linkerd`, but core proxy metrics such as `request_total` and `response_total` do not have a `linkerd` prefix. Updated the command to look for the actual Linkerd proxy metric names.
- The metric label summary listed `target_addr`, which is not a current common Linkerd proxy metric label. Replaced it with `tls` and clarified that `authority` is omitted from inbound metrics by default.
- The external Prometheus scrape configuration for Linkerd control plane metrics incorrectly kept `linkerd-proxy` containers. Updated it to scrape `admin-http` ports for Linkerd control-plane components and use Linkerd's current proxy relabeling pattern for data plane metrics.
- Grafana alert rules referenced `datasourceUid: prometheus-linkerd`, but the datasource provisioning example did not define that UID. Added `uid: prometheus-linkerd`.
- The dashboard API import example posted an empty dashboard object instead of downloading and importing the grafana.com dashboard JSON. Updated it to download the dashboard JSON from Grafana's dashboard API and import that payload.
- The notification provisioning example used the legacy `notifiers` shape. Replaced it with current Grafana Alerting `contactPoints` provisioning.
- The Sloth latency SLO `errorQuery` counted requests at or below 200ms as errors. Changed it to compute total requests minus the `le="200"` bucket, so only requests over 200ms are counted as bad events.

## Review Notes
The article now matches the current Linkerd and Grafana documentation for the covered examples. The custom dashboard and Node Graph snippets remain illustrative; in a production dashboard, teams should export a working dashboard from their Grafana version after configuring transformations and datasource UIDs.
