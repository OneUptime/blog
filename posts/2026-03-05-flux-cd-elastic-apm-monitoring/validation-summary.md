# Validation Summary: How to Configure Flux CD with Elastic APM for Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Metricbeat
- Filebeat
- Elasticsearch
- Kibana
- Elastic Stack
- kube-state-metrics
- Helm

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux logs documentation: https://fluxcd.io/flux/monitoring/logs/
- Flux notification Provider and Alert API documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Elastic Metricbeat Prometheus module documentation: https://www.elastic.co/docs/reference/beats/metricbeat/metricbeat-module-prometheus
- Elastic Metricbeat Prometheus collector metricset documentation: https://www.elastic.co/docs/reference/beats/metricbeat/metricbeat-metricset-prometheus-collector
- Elastic Filebeat container input documentation: https://www.elastic.co/guide/en/beats/filebeat/8.19/filebeat-input-container.html
- Elastic Filebeat add_kubernetes_metadata processor documentation: https://www.elastic.co/docs/reference/beats/filebeat/add-kubernetes-metadata
- Elastic Filebeat decode_json_fields processor documentation: https://www.elastic.co/docs/reference/beats/filebeat/decode-json-fields
- Elastic Beats add_fields processor documentation: https://www.elastic.co/docs/reference/beats/filebeat/add-fields
- Elastic Elasticsearch API authentication documentation: https://www.elastic.co/docs/api/doc/elasticsearch/authentication
- Elastic Kibana saved objects export API documentation: https://www.elastic.co/docs/api/doc/kibana/operation/operation-post-saved-objects-export
- Elastic Helm charts repository archival notice: https://github.com/elastic/helm-charts

## Issues Found
- The Filebeat `add_kubernetes_metadata` example used `host: ${NODE_NAME}`. Updated it to `node: ${NODE_NAME}`, which is the current documented option for scoping Kubernetes metadata lookup to a node.
- The Metricbeat example scraped `gotk_resource_info` from kube-state-metrics without noting the prerequisite. Added a short comment that kube-state-metrics must be configured for Flux custom resource metrics because Flux documents `gotk_resource_info` as coming from custom kube-state-metrics configuration, not from the Flux controllers themselves.
- The Flux generic Provider example used Elasticsearch username/password fields. Updated it to pass an Elasticsearch API key through the Provider Secret `headers` key, matching Flux's documented custom-header mechanism and Elasticsearch's documented API key authentication header.

## Review Notes
- The standalone Elastic Helm chart command pins version `8.5.1`, which aligns with Elastic's notice that the standalone Helm charts were handed over to the community after the 8.5.1 release. The post correctly warns that newer Kubernetes deployments should prefer Elastic Agent or ECK.
- The Flux Provider and Alert resources remain on `notification.toolkit.fluxcd.io/v1beta3`, which is still the documented API for Provider and Alert in the current Flux notification API reference.
- The post title supplied for validation mentions Elastic APM, but the article itself covers Elastic Stack monitoring with Metricbeat, Filebeat, Elasticsearch, and Kibana rather than Elastic APM traces. This is a naming mismatch, not a blocking technical error in the tutorial content.
