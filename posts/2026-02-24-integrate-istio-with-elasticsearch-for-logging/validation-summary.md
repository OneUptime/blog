# Validation Summary: How to Integrate Istio with Elasticsearch for Logging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio
- Envoy access logging
- Istio Telemetry API
- Elasticsearch
- Elastic Cloud on Kubernetes
- Filebeat
- Kibana
- Kubernetes

## Sources Consulted
- Istio Envoy access logs documentation: https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio Telemetry API access logging task: https://istio.io/latest/docs/tasks/observability/logs/telemetry-api/
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Elastic Cloud on Kubernetes install documentation: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/install
- Elastic Cloud on Kubernetes download page: https://www.elastic.co/downloads/elastic-cloud-kubernetes
- ECK Elasticsearch deployment quickstart: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/elasticsearch-deployment-quickstart
- ECK Kibana connection documentation: https://www.elastic.co/guide/en/cloud-on-k8s/master/k8s-kibana-es.html
- Filebeat Kubernetes documentation: https://www.elastic.co/docs/reference/beats/filebeat/running-on-kubernetes
- Filebeat filestream migration documentation: https://www.elastic.co/guide/en/beats/filebeat/current/_step_3_use_new_option_names.html
- Filebeat ILM documentation: https://www.elastic.co/docs/reference/beats/filebeat/ilm
- Kibana data views documentation: https://www.elastic.co/docs/explore-analyze/find-and-organize/data-views
- Elasticsearch ILM phase documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/ilm-index-lifecycle.html

## Issues Found
- The ECK and Elastic Stack examples used older 2.11.0 and 8.12.0 versions. Updated the ECK install URLs to 3.4.0 and the Elasticsearch, Kibana, and Filebeat examples to 9.4.0 to match current Elastic documentation.
- The access log format labeled `X-FORWARDED-FOR` as `source_app`, but that header carries client/proxy IP information, not an Istio application identity. Renamed the field to `source_ip`.
- The Telemetry API example referenced a provider directly and used `response.code` without guarding for connection failures. Removed the provider override so Istio uses the default logging provider and changed the CEL expression to use `!has(response.code)` for failed connections.
- The Filebeat DaemonSet referenced `serviceAccountName: filebeat` and `${NODE_NAME}` without defining the RBAC resources or environment variable. Added the ServiceAccount, ClusterRole, ClusterRoleBinding, and `NODE_NAME` downward API environment variable.
- The Filebeat config used the deprecated `container` input. Replaced it with the current `filestream` input, a unique input ID, symlink scanning, and `container` plus `ndjson` parsers.
- The Filebeat path was missing the hyphen used in Kubernetes container log symlink names. Changed it to `/var/log/containers/*-${data.kubernetes.container.id}.log`.
- The custom Filebeat index name was combined with template settings while leaving default Filebeat ILM behavior implicit. Added `setup.ilm.enabled: false` so the custom daily index and template settings are honored.
- The Kibana instructions used the older "index pattern" terminology. Updated them to use Kibana data views.
- Dashboard field references used un-namespaced fields even though Filebeat decodes the access log JSON under `istio`. Updated examples to use `istio.response_code` and `istio.duration`.
- The ILM policy used rollover without showing the required rollover alias/bootstrap setup, included a shrink action that could fail for one-shard daily indices, and misstated the retention timing. Removed rollover and shrink from the policy, attached the policy through the Filebeat template settings, and clarified that indices move to warm after 7 days and delete after 30 days.

## Review Notes
- The examples are syntactically valid YAML and JSON after the fixes.
- ECK 3.4.0 is current as of May 21, 2026, but Elastic notes that its manifest install requires Kubernetes 1.31 or newer.
