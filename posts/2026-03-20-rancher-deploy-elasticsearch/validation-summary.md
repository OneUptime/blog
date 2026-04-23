# Validation Summary: How to Deploy Elasticsearch on Rancher - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- Elastic Cloud on Kubernetes (ECK)
- Elasticsearch
- Kibana
- Filebeat
- Index Lifecycle Management (ILM)

## Sources Consulted
- Elastic Cloud on Kubernetes install docs: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/install
- ECK Helm installation docs: https://www.elastic.co/guide/en/cloud-on-k8s/current/k8s-install-helm.html
- Elasticsearch deployment quickstart on ECK: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/elasticsearch-deployment-quickstart
- Kibana deployment quickstart on ECK: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/kibana-instance-quickstart
- ECK managed credentials docs: https://www.elastic.co/docs/deploy-manage/users-roles/cluster-or-deployment-auth/managed-credentials-eck
- ECK Beats quickstart: https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/quickstart-beats
- Filebeat container input reference: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-container
- Filebeat filestream input reference: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-filestream
- Filebeat on Kubernetes reference: https://www.elastic.co/docs/reference/beats/filebeat/running-on-kubernetes
- Beats breaking changes: https://www.elastic.co/docs/release-notes/beats/breaking-changes
- ECK stack monitoring docs: https://www.elastic.co/docs/deploy-manage/monitor/stack-monitoring/eck-stack-monitoring
- Elasticsearch downloads page: https://www.elastic.co/downloads/elasticsearch
- Kibana downloads page: https://www.elastic.co/downloads/kibana
- Elasticsearch node roles reference: https://www.elastic.co/guide/en/elasticsearch/reference/current/node-roles-overview.html
- Elasticsearch ILM rollover reference: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Elasticsearch ILM shrink reference: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-shrink
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The description said the guide deployed Elasticsearch with the ECK operator or a Helm chart, but the article only covered ECK-based deployment. I corrected the description to match the actual implementation shown.
- The prerequisites were incomplete and underspecified for the example topology. The post used Helm without listing it as a requirement, and the original `4GB+ RAM per node` guidance was too low for the six Elasticsearch pods shown. I added `Helm 3.2+` and updated the memory guidance to `8GB+ RAM per node` for the sample topology.
- The ECK operator install command used `--set=installCRDs=true`, but current Elastic docs show cluster-wide Helm installation already installs the operator and CRDs by default. I simplified the command to the documented cluster-wide install form.
- The Elasticsearch, Kibana, and Filebeat manifests were pinned to `8.12.0`, which was outdated for a March/April 2026 guide. Elastic’s current download pages list `9.3.3` as the latest release published on April 8, 2026, so I updated the stack versions to `9.3.3`.
- The Elasticsearch deployment section never created the `databases` namespace or applied the Elasticsearch manifest. As written, the later health-check commands could not work on a fresh cluster. I added the namespace creation and `kubectl apply -f elasticsearch-cluster.yaml` commands.
- The Filebeat section showed a manifest but never applied it. I added `kubectl apply -f filebeat.yaml`.
- The Filebeat configuration used the deprecated `container` input. Elastic’s Filebeat docs and 9.0 breaking changes state that deprecated `log` and `container` inputs are disabled by default in 9.x unless `allow_deprecated_use: true` is set. I replaced the input with the supported `filestream` input using the `container` parser, added a required unique input ID, and enabled symlink scanning for Kubernetes container logs.
- The Filebeat DaemonSet omitted the root user setting used in Elastic’s Kubernetes examples for reading host log paths. I added `securityContext.runAsUser: 0` to align the example with the documented hostPath log collection pattern.
- The monitoring section used a Prometheus `ServiceMonitor` scraping `/_prometheus/metrics` on Elasticsearch. That is not the supported current monitoring model in Elastic’s official ECK docs, and current Elasticsearch docs document `/_prometheus/api/v1/write` as a Prometheus remote-write ingestion endpoint rather than a scrape endpoint for Elasticsearch node metrics. I replaced this with an ECK stack-monitoring example that enables monitoring through the Elasticsearch resource and verifies the monitoring sidecars.
- The section title `Ingest Data with Logstash or Filebeat` did not match the content, which only covered Filebeat. I updated it to `Ingest Data with Filebeat`.

## Review Notes
- The post is now technically correct after the fixes above.
- The monitoring step now uses ECK self-monitoring for simplicity. Elastic’s documentation advises using a separate monitoring cluster for production deployments.
- The example still uses `node.store.allow_mmap: false`, which remains valid for Kubernetes quickstarts but has performance implications. Elastic recommends revisiting this together with `vm.max_map_count` tuning for production clusters.
- The Beat CRD API version remains `beat.k8s.elastic.co/v1beta1` in current ECK documentation, so no change was needed there.
