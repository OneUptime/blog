# Validation Summary: How to Ship ArgoCD Logs to Loki

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Grafana Loki
- Promtail
- Grafana
- Helm
- LogQL

## Sources Consulted
- Argo CD `argocd-cmd-params-cm` parameters: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Grafana Loki Helm installation documentation: https://grafana.com/docs/loki/latest/setup/install/helm/
- Promtail configuration reference: https://grafana.com/docs/loki/latest/send-data/promtail/configuration/
- Promtail CRI stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/cri/
- Promtail timestamp stage documentation: https://grafana.com/docs/loki/latest/send-data/promtail/stages/timestamp/
- Grafana Promtail Helm chart values: https://raw.githubusercontent.com/grafana/helm-charts/main/charts/promtail/values.yaml
- Grafana Loki LogQL metric queries documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki storage schema documentation: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki BoltDB Shipper documentation: https://grafana.com/docs/loki/latest/operations/storage/boltdb-shipper/
- Related OneUptime guide link check: https://oneuptime.com/blog/post/2026-02-26-argocd-component-log-levels/view
- Related OneUptime guide link check: https://oneuptime.com/blog/post/2026-02-26-argocd-correlate-application-logs/view

## Issues Found
- The post presented Promtail as a current default choice. Grafana documentation states Promtail reached end-of-life on March 2, 2026, so I added a caveat that the Promtail examples are for existing Promtail deployments and that new deployments should use Grafana Alloy or another supported collector.
- The Argo CD JSON logging snippet claimed to cover all components but only set three component parameters. I changed the wording to "main ArgoCD components" and added ApplicationSet and Notifications controller log format keys documented in `argocd-cmd-params-cm`.
- The Loki stack install command installed Promtail, then the post installed Promtail again later. I disabled Promtail in the `loki-stack` command so the later custom Promtail install is the only Promtail deployment.
- The Promtail timestamp stage used a narrow Go layout that only matched timestamps ending in `Z`. I changed it to `RFC3339Nano` with `RFC3339` fallback, matching Promtail's documented timestamp formats and Argo CD's RFC3339-style defaults.
- The comprehensive Promtail config rewrote the stored log line to the `msg` field, but the LogQL examples later parsed JSON from the stored log line. I removed the output rewrite so the JSON log body remains queryable.
- The Promtail Helm install command used `config.lokiAddress`, which is not a current Promtail chart value. I moved the Loki push URL into `config.clients`.
- The Promtail Helm `extraScrapeConfigs` example did not assign `namespace`, `pod`, or `__path__`, so the later `{namespace="argocd"}` queries and file scraping could fail. I added the missing relabeling.
- The LogQL examples filtered repository server logs with `component="argocd-repo-server"`, but the configuration maps the Argo CD app label to `app` and the container name to `component`. I changed those filters to `app="argocd-repo-server"`.
- The Loki retention example used legacy `boltdb-shipper` storage and schema `v12` for a new-style configuration. I changed it to the currently recommended `tsdb` store with schema `v13`.

## Review Notes
Promtail is no longer the recommended collector for new Loki deployments. The post is still technically useful for existing Promtail users after the added caveats, but a future rewrite should show the equivalent Grafana Alloy configuration.
