# Validation Summary: How to Create Deep Links to Logging Systems from ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD deep links and `argocd-cm`
- Kubernetes Pods, Deployments, labels, and selectors
- Grafana Explore and Loki LogQL
- Kibana Discover and KQL
- AWS CloudWatch Logs Insights
- Splunk SPL search URLs
- Google Cloud Logging query language
- Azure Monitor Log Analytics and `ContainerLogV2`

## Sources Consulted
- Argo CD deep links documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/deep_links/
- Grafana Explore documentation: https://grafana.com/docs/grafana/latest/visualizations/explore/get-started-with-explore/
- Grafana Loki LogQL log query documentation: https://grafana.com/docs/loki/latest/query/log_queries/
- Elastic Kibana Query Language documentation: https://www.elastic.co/docs/explore-analyze/query-filter/languages/kql
- AWS CloudWatch Logs Insights query syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- Google Cloud Logging query language: https://cloud.google.com/logging/docs/view/logging-query-language
- Azure Monitor `ContainerLogV2` table reference: https://learn.microsoft.com/en-us/azure/azure-monitor/reference/tables/containerlogv2
- Splunk time modifier documentation: https://help.splunk.com/en/splunk-cloud-platform/search/search-manual/10.3.2512/specify-time-ranges/specify-time-modifiers-in-your-search

## Issues Found
- Updated Argo CD resource deep-link templates from unscoped fields such as `{{.metadata.name}}` to current scoped fields such as `{{.resource.metadata.name}}`. Current Argo CD deep-link templates expose resource data under `.resource`, application data under `.app` or `.application`, and resource conditions should use expressions like `resource.kind == "Pod"`.
- Updated application-level templates from `{{.spec.destination.namespace}}` to `{{.app.spec.destination.namespace}}` for the current `application.links` context.
- Corrected the Loki error-log query from `{...} |= "error" or "ERROR"` to `{...} |~ "(?i)error"`. Loki line filters support regex matching with `|~`, and `(?i)` provides case-insensitive matching.
- Changed Deployment examples that intend to show logs for all pods in the Deployment to use `.resource.spec.selector.matchLabels.app` instead of `.resource.metadata.labels.app`, because the Deployment selector is the field that identifies its pods.
- Quoted the Google Cloud Logging label field component for `k8s-pod/app` as `labels."k8s-pod/app"` in URL-encoded form, because Google Cloud Logging field path components containing special characters such as `/` must be double-quoted.
- Updated the multi-container pod tip to use `index` for the first container name through the scoped `.resource` object.

## Review Notes
The URL examples remain environment-specific and depend on each logging pipeline's indexed field names, label names, Grafana data source configuration, Kibana data view fields, cloud project or cluster IDs, and Splunk app/dashboard paths. The post already advises testing links against real data, which is important for these integrations.
