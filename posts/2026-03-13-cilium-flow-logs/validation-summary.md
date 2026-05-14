# Validation Summary: Cilium Flow Logs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- Fluent Bit
- Elasticsearch
- Grafana Loki / LogQL

## Sources Consulted
- Cilium documentation: Configuring Hubble exporter - https://docs.cilium.io/en/stable/observability/hubble/configuration/export/
- Cilium documentation: Helm values for Hubble export - https://docs.cilium.io/en/stable/helm-values/
- Cilium documentation: Inspecting Network Flows with the Hubble CLI - https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium API documentation: Hubble observer export event structure - https://docs.cilium.io/en/stable/_api/v1/observer/README/
- Fluent Bit documentation: Elasticsearch output plugin - https://docs.fluentbit.io/manual/pipeline/outputs/elasticsearch
- Grafana Loki documentation: LogQL log queries and JSON parser - https://grafana.com/docs/loki/latest/logql/log_queries/
- Elasticsearch documentation: Term query - https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-term-query.html
- Elasticsearch documentation: Sort search results - https://www.elastic.co/guide/en/elasticsearch/reference/current/sort-search-results.html

## Issues Found
- The post claimed Hubble export can write directly to S3/object storage. Hubble Exporter writes flows to files; forwarding to S3 or a SIEM requires a logging pipeline. Updated the wording to describe file export followed by log shipping.
- The post stated verdicts create an audit trail of every allowed or denied connection with the specific policy rule. Hubble records verdicts and drop reasons, but not a simple "specific policy rule" field in the exported record. Updated the wording to forwarded/dropped connections and drop reason details.
- The prerequisite said Hubble Relay was required for flow export. Hubble Exporter is a Cilium agent feature and requires Hubble to be enabled; Relay is only needed for Hubble API/CLI workflows. Updated the prerequisite.
- The static exporter Helm command set `fieldMask` to an empty string. The documented Helm value is a list, and the default empty list already exports the full record. Removed the invalid empty string setting.
- The verification command used a placeholder pod name. Replaced it with the documented `kubectl -n kube-system exec ds/cilium -- tail -f ...` form.
- The filtering example used raw ConfigMap keys and an imprecise denylist regex. Replaced it with documented Helm `hubble.export.static.allowList` and `denyList` settings using JSON FlowFilters.
- The Fluent Bit Elasticsearch output used `Type _doc`, which should be suppressed for Elasticsearch 8 and later. Replaced it with `Suppress_Type_Name On`.
- The Elasticsearch query used top-level `verdict` and `@timestamp`, but Hubble exporter records wrap flow fields under `flow` and include top-level `time`. Updated the query to `flow.verdict.keyword` and `time`.
- The Loki query used top-level parsed fields. Loki flattens nested JSON fields with `_`, so the query now uses `flow_verdict` and `flow_source_namespace`.
- The dynamic export example incorrectly used a `CiliumNetworkPolicy` resource. Replaced it with documented Hubble dynamic exporter Helm values and clarified the Hubble CLI command as an ad hoc filtered capture.

## Review Notes
The Fluent Bit snippet shows only the parser and output configuration. In a real deployment, the Fluent Bit DaemonSet must also mount the Cilium host path where the Hubble export file is available.
