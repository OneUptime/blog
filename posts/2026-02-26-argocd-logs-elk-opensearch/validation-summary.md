# Validation Summary: How to Ship ArgoCD Logs to ELK/OpenSearch

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Kubernetes logging
- Fluent Bit
- Fluentd
- Elasticsearch
- OpenSearch
- Kibana / OpenSearch Dashboards

## Sources Consulted
- Argo CD command parameters ConfigMap documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Kubernetes logging architecture documentation: https://kubernetes.io/docs/concepts/cluster-administration/logging/
- Kubernetes kubectl rollout documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Fluent Bit Kubernetes installation and CRI parser documentation: https://docs.fluentbit.io/manual/2.2/installation/kubernetes
- Fluent Bit Kubernetes filter documentation: https://docs.fluentbit.io/manual/3.0/pipeline/filters/kubernetes
- Fluent Bit modify filter documentation: https://docs.fluentbit.io/manual/data-pipeline/filters/modify
- Fluent Bit record accessor syntax documentation: https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/classic-mode/record-accessor
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/elasticsearch
- Fluentd tail input documentation: https://docs.fluentd.org/input/tail
- Fluentd parser filter documentation: https://docs.fluentd.org/filter/parser
- Fluentd parse section documentation: https://docs.fluentd.org/configuration/parse-section
- Fluentd record_transformer documentation: https://docs.fluentd.org/0.12/filter/record_transformer
- Fluentd Kubernetes metadata filter documentation: https://github.com/fluent-plugins-nursery/fluent-plugin-kubernetes_metadata_filter
- Elasticsearch ILM rollover documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Kibana saved objects API documentation: https://www.elastic.co/docs/api/doc/kibana/v8/operation/operation-createsavedobject
- OpenSearch index template documentation: https://docs.opensearch.org/latest/im-plugin/index-templates/
- OpenSearch ISM API documentation: https://docs.opensearch.org/latest/im-plugin/ism/api/

## Issues Found
- The Fluent Bit example used the Docker JSON parser for `/var/log/containers` logs. Modern Kubernetes CRI logs are not Docker JSON; changed the input to use a CRI regex parser.
- The Fluent Bit Kubernetes filter used `Merge_Log_Key log_processed`, but later mappings and queries expect Argo CD fields such as `level` and `msg` at the top level. Removed `Merge_Log_Key` so merged JSON fields are available to the index template and queries.
- The Fluent Bit modify filter attempted to rename nested Kubernetes metadata using dotted field names. Updated the rules to use Fluent Bit record accessor syntax.
- The Fluentd example parsed container log files as JSON directly. Updated it to parse CRI container log lines first, then parse the nested Argo CD JSON log message.
- The Fluentd example referenced Kubernetes metadata without adding a metadata filter and used Ruby expressions in `record_transformer` without enabling Ruby evaluation. Added `kubernetes_metadata` and `enable_ruby true`.
- The Elasticsearch ILM example used rollover with daily Logstash-style indices, but Elasticsearch rollover aliases require a write alias and index names ending in a numeric suffix. Removed the rollover action and clarified how to attach the ILM policy to Elasticsearch index templates.
- The lifecycle section treated OpenSearch as if it used Elasticsearch ILM. Added an OpenSearch ISM policy example and clarified that OpenSearch should use ISM instead.

## Review Notes
The Kibana saved object API example is syntactically valid, but saved objects are version-sensitive and require a matching data view in real deployments. The Fluentd Kubernetes metadata filter is a plugin dependency, so Fluentd images must include it for that alternative configuration to work.
