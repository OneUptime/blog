# Validation Summary: How to Deploy Elasticsearch on Kubernetes

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Elasticsearch
- Elastic Cloud on Kubernetes (ECK)
- Kubernetes
- Helm
- kubectl
- Prometheus Elasticsearch exporter
- Python Kubernetes client
- Amazon S3 snapshot repositories

## Sources Consulted
- Elastic Docs: Install ECK using YAML manifests - https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/install-using-yaml-manifest-quickstart
- Elastic Docs: Install ECK using a Helm chart - https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/install-using-helm-chart
- Elastic Docs: Deploy an Elasticsearch cluster with ECK - https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/elasticsearch-deployment-quickstart
- Elastic Docs: Advanced Elasticsearch node scheduling - https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/advanced-elasticsearch-node-scheduling
- Elastic Docs: Virtual memory for ECK - https://www.elastic.co/docs/deploy-manage/deploy/cloud-on-k8s/virtual-memory
- Elastic Docs: S3 repository - https://www.elastic.co/docs/deploy-manage/tools/snapshot-and-restore/s3-repository
- Elastic Docs: ECK stack monitoring - https://www.elastic.co/docs/deploy-manage/monitor/stack-monitoring/eck-stack-monitoring
- Elastic Cloud on Kubernetes GitHub README - https://github.com/elastic/cloud-on-k8s
- Prometheus community Elasticsearch exporter documentation - https://github.com/prometheus-community/elasticsearch_exporter
- Kubernetes Python client CustomObjectsApi usage - https://github.com/kubernetes-client/python

## Issues Found
- The ECK installation commands used old 2.11.0 manifest URLs. Updated them to the current 3.4.0 manifest URLs from Elastic's current ECK installation documentation.
- The Kubernetes prerequisite listed 1.25+, which does not match the current supported ECK platform range. Updated it to Kubernetes 1.31-1.35.
- The Elasticsearch examples used version 8.12.0 while the guide otherwise presents current deployment guidance. Updated examples and the Python helper default to 9.4.2 to match current Elastic documentation.
- The Helm installation command set `webhook.enabled=true`, which is unnecessary for the current default cluster-wide ECK Helm install. Simplified the command to match Elastic's documented install command.
- The production zone-awareness configuration set `cluster.routing.allocation.awareness.attributes: zone` without defining `node.attr.zone`. Added ECK downward-node-label annotations, `node.attr.zone: ${ZONE}`, and the `ZONE` environment variable wiring. Also preserved ECK's default `k8s_node_name` awareness attribute.
- The production examples used `vm.max_map_count=262144`, but Elastic requires 1048576 for Elasticsearch 8.16 and later. Updated the YAML and Python examples to use `1048576`.
- The LoadBalancer Service selector excluded master nodes but still matched data nodes. Added data and ingest role selectors so the service targets coordinating-only nodes.
- The horizontal scaling `kubectl patch --type=merge` example would replace the `nodeSets` array instead of safely changing one node set. Replaced it with a JSON Patch example targeting the data nodeSet count.
- The Python `scale_data_nodes` method had the same array replacement issue. Updated it to fetch the existing nodeSets, mutate the data nodeSet count, and patch the full preserved list.
- The Prometheus section mixed ECK stack monitoring configuration with a Prometheus exporter example. Removed the ECK `monitoring` block from that snippet, clarified that it uses the Prometheus Elasticsearch exporter, and updated the exporter image to v1.9.0.

## Review Notes
- YAML snippets parse successfully after the corrections.
- The Python example compiles successfully after the corrections.
- The S3 snapshot section uses explicit S3 client credentials through ECK secure settings, which is valid. In production, IAM role-based credentials are often preferable when the Kubernetes environment supports them.
