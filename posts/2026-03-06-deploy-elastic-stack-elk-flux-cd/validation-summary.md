# Validation Summary: How to Deploy Elastic Stack (ELK) with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm and HelmRelease resources
- Elastic Stack 8.5.1
- Elasticsearch
- Logstash
- Kibana
- Elasticsearch Index Lifecycle Management

## Sources Consulted
- Elastic Helm charts repository: https://github.com/elastic/helm-charts
- Elastic Helm chart values and templates for Elasticsearch 8.5.1: https://github.com/elastic/helm-charts/tree/v8.5.1/elasticsearch
- Elastic Helm chart values and templates for Logstash 8.5.1: https://github.com/elastic/helm-charts/tree/v8.5.1/logstash
- Elastic Helm chart values and templates for Kibana 8.5.1: https://github.com/elastic/helm-charts/tree/v8.5.1/kibana
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Logstash secure connection to Elasticsearch documentation: https://www.elastic.co/docs/reference/logstash/secure-connection
- Logstash Elasticsearch output plugin documentation: https://www.elastic.co/docs/reference/logstash/plugins/plugins-outputs-elasticsearch
- Elasticsearch ILM rollover documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover
- Kubernetes API reference for Namespace and Job resources: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.26/

## Issues Found
- The post described the Elastic Helm charts as current official charts. Elastic's Helm chart repository is archived for the standalone Stack charts, and Elastic recommends ECK for new Kubernetes deployments. Updated the introduction to state this and pinned examples to chart version `8.5.1`.
- Elasticsearch was configured with transport TLS settings that referenced a non-existent `elastic-certificates.p12` file. The 8.5.1 chart creates PEM TLS secrets and injects the correct security settings by default. Removed the invalid TLS configuration and explicitly kept the chart's HTTPS protocol.
- Logstash was configured to connect to Elasticsearch over HTTP while the Elasticsearch chart enables HTTPS by default. Updated Logstash to read the generated Elasticsearch password, mount the generated CA certificate, connect over HTTPS, and configure `ssl_enabled` plus `ssl_certificate_authorities`.
- The Logstash service exposed ingestion ports but the chart also needs `extraPorts` for additional container ports. Added `extraPorts` for Beats and HTTP ingestion.
- Kibana was configured with inline HTTP Elasticsearch settings and a password placeholder that would conflict with the chart's token-based setup. Replaced this with the chart's `elasticsearchHosts`, certificate secret, CA file, and credential secret values.
- Kibana's health check used `/api/status`; the Elastic chart default is `/app/kibana`. Updated the value to match the chart's expected readiness path.
- The ILM policy file was shown but not included in the Kustomize resources. Added `ilm-policy.yaml` to the repository structure and `kustomization.yaml`.
- The ILM job used unauthenticated HTTP against a secured Elasticsearch cluster and included a Helm hook weight annotation that has no effect on a plain Kustomize-managed Job. Updated the job to use HTTPS, basic auth, the mounted CA certificate, and removed the ineffective annotation.
- The ILM policy used rollover with daily `logs-%{+YYYY.MM.dd}` indices but did not configure a rollover alias or data stream. Removed the rollover action and added an index template that attaches the policy to future `logs-*` indices.
- The verification commands queried Elasticsearch over unauthenticated HTTP. Updated them to use HTTPS and the generated `ELASTIC_PASSWORD` inside the Elasticsearch pod.
- The Flux Kustomization used `wait: true` with explicit `healthChecks`; Flux ignores `healthChecks` when `wait` is true. Removed `wait: true` so the listed health checks are effective.

## Review Notes
The guide is now technically consistent with the archived Elastic 8.5.1 Helm charts. For future improvement, a production version should create a least-privilege Logstash writer user instead of using the `elastic` superuser and should consider ECK, which Elastic recommends for Kubernetes deployments.
