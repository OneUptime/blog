# Validation Summary: How to Send Logs to Loki from Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Rancher Logging / Logging Operator
- Grafana Loki
- Grafana
- Helm
- LogQL

## Sources Consulted
- Grafana Loki Helm installation docs: https://grafana.com/docs/loki/latest/setup/install/helm/
- Grafana Loki monolithic Helm install docs: https://grafana.com/docs/loki/latest/setup/install/helm/install-monolithic/
- Grafana Loki Helm chart concepts and gateway behavior: https://grafana.com/docs/loki/latest/setup/install/helm/concepts/
- Grafana Loki HTTP API docs: https://grafana.com/docs/loki/latest/api/
- Grafana Loki retention docs: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki label cardinality docs: https://grafana.com/docs/loki/latest/get-started/labels/cardinality/
- Grafana Loki data source configuration docs: https://grafana.com/docs/grafana/latest/datasources/loki/configure-loki-data-source/
- Grafana alerting notification docs: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/
- Logging Operator Loki output docs: https://kube-logging.dev/docs/configuration/plugins/outputs/loki/
- Logging Operator Loki example: https://kube-logging.dev/4.4/docs/examples/loki-nginx/
- Logging Operator secret definition docs: https://kube-logging.dev/4.7/docs/configuration/plugins/outputs/secret/
- Rancher monitoring chart values (for `grafana.additionalDataSources`): https://github.com/rancher/charts/blob/main/charts/rancher-monitoring/values.yaml
- Grafana community Loki chart values: https://github.com/grafana-community/helm-charts/blob/main/charts/loki/values.yaml

## Issues Found
- The Loki Helm installation examples were outdated. I replaced the old `grafana` chart repository and incomplete `--set` examples with current `grafana-community/loki` installs that include valid Helm values for development and production.
- The original Helm examples omitted the schema/storage configuration required by current Loki chart installs and used outdated S3 value keys such as `bucketnames`, `access_key_id`, and `secret_access_key`. I replaced them with current `schemaConfig`, `bucketNames`, `accessKeyId`, and `secretAccessKey` fields.
- The original `ClusterOutput` disabled Prometheus-style Kubernetes labels while later LogQL examples queried `namespace` and `pod`. I changed the Loki output examples to use `configure_kubernetes_labels: true` so the later queries are consistent with the configuration.
- The post used direct Loki service URLs for shippers and Grafana even though the current Helm chart installs the gateway and recommends clients use it. I updated the output and data source URLs to `loki-gateway`.
- The label guidance recommended pod names as a generally good label, which conflicts with Loki cardinality guidance. I revised the label advice to favor low-cardinality labels and treat pod labels as troubleshooting aids rather than defaults.
- The Grafana Cloud example hardcoded a region-specific endpoint. I replaced it with a stack-specific placeholder so readers use the endpoint from their Grafana Cloud stack details.
- The Grafana UI instructions used older navigation and alerting terminology. I updated the data source flow to current Grafana navigation and changed “notification channels” to “contact points or notification policies.”
- The `topk` LogQL example was syntactically wrong. I corrected it to aggregate with `sum by (pod)` before applying `topk`.
- The alert example counted per-stream matches instead of producing a single namespace-wide threshold. I changed it to `sum(count_over_time(...)) > 50`.
- The retention example was incomplete for current Loki retention behavior. I added the required compactor working directory, `delete_request_store`, and a note that Compactor retention requires a 24-hour index period.
- The direct API verification example used `/loki/api/v1/query` with a log query, which returns `400 Bad Request` for log streams, and embedded raw braces in the URL. I changed it to a `query_range` request with `--data-urlencode`.
- The verification section treated `kubectl port-forward` as if it returned immediately. I split those commands into separate-terminal steps so the follow-up `curl` commands are runnable as written.

## Review Notes
- The post is technically sound after the corrections above.
- The current Loki Helm chart terminology is in transition: older examples often say `SingleBinary`, while current chart values refer to `Monolithic`. The updated post uses the current chart terminology.
- Service names and Grafana UI labels can vary slightly if a cluster uses customized chart values, but the corrected examples match the default current upstream behavior.
