# Validation Summary: Deploy Jaeger with Elasticsearch Backend Using Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- Jaeger Operator
- Jaeger Elasticsearch storage
- Elasticsearch Helm chart
- Elasticsearch TLS, credentials, index cleanup, rollover, and ILM

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Jaeger Operator for Kubernetes documentation: https://www.jaegertracing.io/docs/1.76/deployment/operator/
- Elastic Helm chart README and values: https://raw.githubusercontent.com/elastic/helm-charts/main/elasticsearch/README.md and https://raw.githubusercontent.com/elastic/helm-charts/main/elasticsearch/values.yaml
- Elastic Helm chart StatefulSet template for generated credential and certificate secret names: https://raw.githubusercontent.com/elastic/helm-charts/main/elasticsearch/templates/statefulset.yaml
- Elastic disk watermark troubleshooting documentation: https://www.elastic.co/docs/troubleshoot/elasticsearch/fix-watermark-errors

## Issues Found
- The introduction incorrectly said Jaeger uses daily index rollover and directly supports ILM for automatic retention enforcement. Updated it to say Jaeger uses daily indices by default, supports rollover with `es.use-aliases`, and can be used with ILM through aliases and custom index templates.
- The Elasticsearch HelmRelease used a broad `>=8.5.0 <9.0.0` chart range even though Elastic's official Helm chart line ended at 8.5.1. Pinned the chart to `8.5.1`.
- The Elasticsearch security configuration was incomplete and redundant for the 8.5.1 chart. Updated the values to rely on `createCert: true`, `protocol: https`, and a configured chart credential secret password.
- The Jaeger credentials secret used a `jaeger` Elasticsearch username without creating that user. Updated it to use the chart's built-in `elastic` user with the configured password.
- The Jaeger TLS CA path was configured but the CA certificate secret was not mounted. Added `volumeMounts` and `volumes` for the Elastic chart's generated `elasticsearch-master-certs` secret.
- The Jaeger storage block became technically incorrect if `dependencies` and `esIndexCleaner` were separated from `storage`. Kept both under `spec.storage`, matching the Jaeger Operator documentation.
- The Flux Kustomization example implied one Kustomization could use `dependsOn` to order resources in the same path. Updated Step 5 to use separate `elasticsearch` and `jaeger` Flux Kustomizations, with the Jaeger Kustomization depending on Elasticsearch and cert-manager.
- The disk watermark best practice said Elasticsearch stops accepting new shards at 85% disk usage. Updated it to the default low/high/flood-stage behavior: 85%, 90%, and 95%, with affected indices potentially becoming read-only at flood stage.

## Review Notes
- The Elastic Helm chart used in the post is archived and no longer the preferred Elastic deployment path on Kubernetes; Elastic recommends ECK for current Kubernetes operations. The post remains technically usable when pinned to chart version 8.5.1.
- The examples assume the `observability` namespace, the Jaeger Operator, and a Flux Kustomization named `cert-manager` already exist.
