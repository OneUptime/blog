# Validation Summary: How to Configure Fluent Bit Output to Elasticsearch with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Fluent Bit
- Fluent Bit Helm chart
- Elasticsearch
- OpenSearch-compatible endpoints
- Kubernetes Secrets
- Flux CD HelmRelease
- Flux CD Kustomization
- Sealed Secrets
- Prometheus ServiceMonitor

## Sources Consulted
- Fluent Bit Elasticsearch output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/elasticsearch
- Fluent Bit variables documentation: https://docs.fluentbit.io/manual/administration/configuring-fluent-bit/classic-mode/variables
- Fluent Bit monitoring documentation: https://docs.fluentbit.io/manual/4.1/administration/monitoring
- Fluent Bit scheduling and retries documentation: https://docs.fluentbit.io/manual/1.8/administration/scheduling-and-retries
- Fluent Bit Helm chart values and templates: https://github.com/fluent/helm-charts/tree/main/charts/fluent-bit
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Kubernetes Secret envFrom documentation: https://kubernetes.io/docs/tasks/inject-data-application/distribute-credentials-secure
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- Elasticsearch ILM rollover documentation: https://www.elastic.co/docs/reference/elasticsearch/index-lifecycle-actions/ilm-rollover

## Issues Found
- The Secret examples created keys named `username` and `password`, but the Fluent Bit configuration referenced `${ES_USERNAME}` and `${ES_PASSWORD}`. Updated the manual Secret command and SealedSecret keys so Kubernetes `envFrom.secretRef` creates the environment variables Fluent Bit actually reads.
- The Fluent Bit Helm chart version was pinned to `0.46.7`, while the official chart has moved on. Updated the example to `0.57.5` so the tutorial uses a current chart version.
- The main output example labeled `Suppress_Type_Name On` as a data stream setting. Updated the comment because this option removes Elasticsearch document type usage, especially relevant for Elasticsearch 8.x.
- The data stream example did not explicitly set the write operation. Added `Write_Operation create`, matching Fluent Bit's Elasticsearch data stream compatibility requirements and default behavior in modern Fluent Bit versions.
- The data stream example included `TLS Off`, which could incorrectly override the TLS guidance from the previous step. Replaced it with a note to keep TLS settings when Elasticsearch requires HTTPS.
- The best-practices section said date-based `Logstash_Format` enables ILM rollover. Updated it to state that date-based indices are separate from ILM rollover, which requires a data stream or rollover alias/write index setup.

## Review Notes
- The Flux `HelmRelease` and `Kustomization` API versions and field structure are current.
- The Fluent Bit chart supports the referenced `envFrom`, `config.outputs`, `extraVolumes`, `extraVolumeMounts`, and `serviceMonitor` values.
- The monitoring command uses Fluent Bit's documented JSON metrics endpoint. Prometheus scraping through the chart's ServiceMonitor uses the chart's Prometheus metrics path.
