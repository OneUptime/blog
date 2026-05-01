# Validation Summary: How to Deploy the ELK Stack with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- Helm
- Kubernetes
- Elasticsearch
- Kibana
- Logstash
- Filebeat
- Amazon EBS (`gp3`, `gp2`)

## Sources Consulted
- Elastic Helm Charts README: https://github.com/elastic/helm-charts
- Elasticsearch chart `values.yaml` v8.5.1: https://raw.githubusercontent.com/elastic/helm-charts/v8.5.1/elasticsearch/values.yaml
- Elasticsearch chart `statefulset.yaml` v8.5.1: https://raw.githubusercontent.com/elastic/helm-charts/v8.5.1/elasticsearch/templates/statefulset.yaml
- Elasticsearch chart `secret.yaml` v8.5.1: https://raw.githubusercontent.com/elastic/helm-charts/v8.5.1/elasticsearch/templates/secret.yaml
- Elasticsearch chart `secret-cert.yaml` v8.5.1: https://raw.githubusercontent.com/elastic/helm-charts/v8.5.1/elasticsearch/templates/secret-cert.yaml
- Kibana chart `values.yaml` v8.5.1: https://raw.githubusercontent.com/elastic/helm-charts/v8.5.1/kibana/values.yaml
- Kibana chart `ingress.yaml` v8.5.1: https://raw.githubusercontent.com/elastic/helm-charts/v8.5.1/kibana/templates/ingress.yaml
- Logstash chart `values.yaml` v8.5.1: https://raw.githubusercontent.com/elastic/helm-charts/v8.5.1/logstash/values.yaml
- Logstash chart `statefulset.yaml` v8.5.1: https://raw.githubusercontent.com/elastic/helm-charts/v8.5.1/logstash/templates/statefulset.yaml
- Logstash chart `service.yaml` v8.5.1: https://raw.githubusercontent.com/elastic/helm-charts/v8.5.1/logstash/templates/service.yaml
- Filebeat chart `values.yaml` v8.5.1: https://raw.githubusercontent.com/elastic/helm-charts/v8.5.1/filebeat/values.yaml
- Filebeat chart `daemonset.yaml` v8.5.1: https://raw.githubusercontent.com/elastic/helm-charts/v8.5.1/filebeat/templates/daemonset.yaml
- Filebeat chart `configmap.yaml` v8.5.1: https://raw.githubusercontent.com/elastic/helm-charts/v8.5.1/filebeat/templates/configmap.yaml
- Elasticsearch JVM settings: https://www.elastic.co/docs/reference/elasticsearch/jvm-settings
- Logstash secure connection docs: https://www.elastic.co/docs/reference/logstash/secure-connection
- Logstash environment variables: https://www.elastic.co/docs/reference/logstash/environment-variables
- Logstash Elasticsearch output plugin v11.15.5: https://www.elastic.co/docs/reference/logstash/versioned-plugins/v11-15-5-plugins-outputs-elasticsearch
- Filebeat container input docs: https://www.elastic.co/docs/reference/beats/filebeat/filebeat-input-container
- Filebeat `add_kubernetes_metadata` docs: https://www.elastic.co/guide/en/beats/filebeat/8.19/add-kubernetes-metadata.html
- Filebeat environment variable docs: https://www.elastic.co/guide/en/beats/filebeat/8.18/using-environ-vars.html
- Amazon EBS General Purpose SSD volumes: https://docs.aws.amazon.com/ebs/latest/userguide/general-purpose.html

## Issues Found
- The post implied the Elastic Helm charts were a current deployment path without noting that `8.5.1` is the final published chart release. I added a short clarification in the introduction so the version pin is explicit.
- The Elasticsearch example hard-coded `storageClassName = "gp3"` even though the post is about Kubernetes in general, not specifically AWS. I changed this to `var.storage_class_name` and narrowed the `gp3` guidance to AWS-specific best practices.
- The Elasticsearch heap guidance said the JVM heap "must" be half the pod memory limit. Elastic’s docs describe 50% as an upper bound, not a hard requirement. I corrected the inline comment and best-practices wording to "no more than 50%".
- The Kibana ingress example used the deprecated `kubernetes.io/ingress.class` annotation instead of the chart’s `ingress.className` value. I switched the snippet to `className` and made `pathtype` explicit for the chart’s Kubernetes `networking.k8s.io/v1` ingress template.
- The Logstash pipeline used `${ELASTICSEARCH_USERNAME}` and `${ELASTICSEARCH_PASSWORD}` inside Terraform heredocs without escaping them, which would make Terraform try to interpolate them. I changed those references to `$${...}` so Logstash receives the intended runtime environment variables.
- The Logstash Elasticsearch output used deprecated plugin options (`ssl` and `cacert`). I updated the snippet to `ssl_enabled` and `ssl_certificate_authorities`, which are the supported replacements documented by Elastic.
- The Logstash release did not define the `extraEnvs`, certificate mount, or service port needed for a secured Elasticsearch connection and for Filebeat to send Beats traffic on `5044`. I added `extraEnvs`, `secretMounts`, `extraPorts`, `service`, and an explicit `depends_on`.
- The Filebeat example used the deprecated `container` input. I migrated it to the supported `filestream` input with the `container` parser, added the required input `id` and symlink scanning setting, and escaped `NODE_NAME` so Terraform emits the literal environment variable reference.
- The original release ordering only made Kibana depend on Elasticsearch. I added `depends_on` for Logstash and Filebeat so the examples reflect the runtime dependencies introduced by Elasticsearch-generated credentials and the Logstash service endpoint.
- The `gp3` recommendation claimed it was faster than `gp2` "at the same price". AWS documents `gp3` as offering more predictable performance with prices up to 20% lower per GiB than `gp2`, so I corrected that statement.

## Review Notes
- Elastic archived the `elastic/helm-charts` repository on May 16, 2023 and recommends ECK as the preferred way to run Elastic on Kubernetes. This post is now technically accurate as a version-pinned Helm tutorial, but readers should treat it as an archived-chart approach rather than Elastic’s current preferred deployment model.
- The Logstash snippet uses the Elasticsearch chart’s generated `elastic` credentials for simplicity. In production, Elastic recommends creating a dedicated `logstash_writer` role and user instead of using the superuser account.
- The snippets were validated against official documentation and the official `v8.5.1` chart sources. A live Kubernetes deployment was not run in this environment.
