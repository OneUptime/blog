# Validation Summary: How to Filter and Forward Kubernetes Audit Logs to SIEM Systems

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kubernetes audit logging
- Fluent Bit
- Fluentd
- Filebeat and Elasticsearch
- Splunk HTTP Event Collector
- Datadog Agent log collection
- Prometheus Operator ServiceMonitor and PrometheusRule
- SIEM detection queries

## Sources Consulted
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes audit API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/
- Fluent Bit Splunk output documentation: https://docs.fluentbit.io/manual/pipeline/outputs/splunk
- Fluent Bit grep filter documentation: https://docs.fluentbit.io/manual/pipeline/filters/grep
- Fluent Bit Lua filter documentation: https://docs.fluentbit.io/manual/2.1/pipeline/filters/lua
- Fluent Bit monitoring documentation: https://docs.fluentbit.io/manual/administration/monitoring
- Fluentd grep filter documentation: https://docs.fluentd.org/filter/grep
- Fluentd record_transformer documentation: https://docs.fluentd.org/filter/record_transformer
- Fluentd copy output documentation: https://docs.fluentd.org/output/copy
- Elastic Filebeat filestream migration documentation: https://www.elastic.co/docs/reference/beats/filebeat/migrate-to-filestream
- Elastic Filebeat index name documentation: https://www.elastic.co/docs/reference/beats/filebeat/change-index-name
- Elastic Filebeat ILM documentation: https://www.elastic.co/docs/reference/beats/filebeat/ilm
- Datadog Agent custom log collection documentation: https://docs.datadoghq.com/agent/logs/

## Issues Found
- The Fluent Bit metrics ServiceMonitor example selected a Service that had no matching labels and the Fluent Bit service did not enable the HTTP metrics endpoint. Added `HTTP_Server`, `HTTP_Listen`, and `HTTP_Port` to Fluent Bit, and added the `app: fluent-bit` label to the Service.
- The Splunk setup text created the `logging` namespace after presenting namespace-scoped manifests. Updated the instruction to create the namespace and HEC token secret before deploying Fluent Bit.
- The DaemonSets referenced ServiceAccounts that the post did not create. Removed the unused `serviceAccountName` fields from the shown file-tailing examples.
- The Filebeat section claimed Kubernetes autodiscovery but used a static file input. Updated the text to describe a file input.
- The Filebeat example used the deprecated `log` input and legacy JSON options. Replaced it with `filestream` and an `ndjson` parser.
- The Filebeat example configured a custom Elasticsearch index while enabling ILM, but Filebeat ignores custom `index` settings when ILM is enabled. Disabled ILM for the daily custom index example and added matching `setup.template.name` and `setup.template.pattern`.
- The Fluentd parser used a non-existent Kubernetes audit `timestamp` field. Changed it to `requestReceivedTimestamp`, which is part of the Kubernetes audit Event schema.
- The Fluentd grep filter for read-only configmap operations used two top-level excludes, which would exclude all read-only operations and all configmap operations. Wrapped the excludes in an `<and>` block so only read-only configmap operations are dropped.
- The Fluentd sensitive-event flag used `record_modifier` with invalid Ruby-style conditional syntax. Replaced it with `record_transformer`, `enable_ruby true`, `auto_typecast true`, and nil-safe `record.dig` access.
- The Fluentd `copy` output attempted to place a `<filter>` inside a `<store>`, which is not supported. Routed the second copy to a label and filtered sensitive events inside that label before sending them to S3.
- The Splunk failed authentication query checked for `responseStatus.code != 201`, which does not reliably indicate a failed TokenReview. Updated it to check `responseObject.status.authenticated=false`.
- The Elasticsearch query filtered on `@timestamp`, but the audit event timestamp field in the examples is `requestReceivedTimestamp`. Updated the range filter accordingly.

## Review Notes
All YAML and JSON code fences in the updated post were parsed successfully. I could not run Kubernetes, Fluent Bit, Fluentd, Filebeat, Splunk, Datadog, or Elasticsearch integration tests in this workspace, so the review is based on official documentation and static validation.
