# Validation Summary: How to Create Deep Links to External Monitoring Tools from ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD deep links
- Kubernetes ConfigMaps
- kubectl JSONPath output
- Grafana dashboards and Explore URLs
- Prometheus expression browser
- Datadog infrastructure, APM, and logs links
- OneUptime monitors, logs, and status pages
- New Relic entity filtering
- AWS CloudWatch Logs

## Sources Consulted
- Argo CD Deep Links documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/deep_links/
- Grafana dashboard URL variables and time range documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dashboard-url-variables/
- Grafana Explore URL structure documentation: https://grafana.com/docs/grafana/latest/visualizations/explore/get-started-with-explore/
- Prometheus expression browser documentation: https://prometheus.io/docs/visualization/browser/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Kubernetes ConfigMap documentation: https://kubernetes.io/docs/concepts/configuration/configmap/
- kubectl get command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Datadog search syntax documentation: https://docs.datadoghq.com/getting_started/search/
- New Relic entity filter documentation: https://docs.newrelic.com/docs/new-relic-solutions/new-relic-one/core-concepts/search-filter-entities/
- OneUptime getting started documentation: https://oneuptime.com/docs
- OneUptime logs monitor documentation: https://oneuptime.com/docs/monitor/logs-monitor
- Amazon CloudWatch Logs documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/Working-with-log-groups-and-streams.html

## Issues Found
- Argo CD resource deep-link templates incorrectly referenced Kubernetes resource fields as `{{.metadata...}}` and used conditions like `if: kind == "Pod"`. Argo CD exposes resource data under `.resource` for `resource.links`, and its official examples use conditions like `resource.kind == "Pod"`. Updated all resource links to use `{{.resource.metadata...}}` and `resource.kind`.
- Argo CD application deep-link templates incorrectly referenced application fields as `{{.metadata...}}` and `{{.spec...}}`. Argo CD exposes application data under `.app` / `.application` for `application.links`. Updated all application links to use `{{.app.metadata...}}` and `{{.app.spec...}}`.
- The Grafana Explore / Loki example used the older `left=` URL state. Current Grafana documentation specifies `panes=<url-encoded-json>&schemaVersion=1&orgId=<id>` for generated Explore URLs. Updated the example to use the documented `panes` structure.

## Review Notes
- The monitoring dashboard URLs are examples and still require teams to adjust dashboard UIDs, datasource UIDs, regions, account-specific paths, and label names to match their environment.
- `kubectl` was not installed in the local environment, so the command was reviewed against the official Kubernetes command and JSONPath references rather than executed locally.
