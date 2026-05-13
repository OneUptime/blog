# Validation Summary: How to Deploy Fluentd as a Log Aggregator with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository custom resources
- Kustomization custom resources
- Fluentd
- Fluent Bit
- Bitnami Fluentd Helm chart
- Elasticsearch

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Kustomization API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Bitnami Fluentd chart package and values for version 6.5.5: https://charts.bitnami.com/bitnami/fluentd-6.5.5.tgz
- Bitnami Fluentd chart on Artifact Hub: https://artifacthub.io/packages/helm/bitnami/fluentd
- Fluentd forward input documentation: https://docs.fluentd.org/input/forward
- Fluentd filter plugin overview: https://docs.fluentd.org/filter
- Fluentd grep filter documentation: https://docs.fluentd.org/filter/grep
- Fluentd relabel output documentation: https://docs.fluentd.org/output/relabel
- Fluentd buffer section documentation: https://docs.fluentd.org/configuration/buffer-section
- Fluentd Elasticsearch output documentation: https://docs.fluentd.org/output/elasticsearch
- Fluent Bit forward output documentation: https://docs.fluentbit.io/manual/data-pipeline/outputs/forward

## Issues Found
- The post described the Bitnami Fluentd aggregator as a Deployment, but chart version 6.5.5 deploys the aggregator as a StatefulSet. Updated the introduction and Flux health check kind accordingly.
- The custom Fluentd config replaced the chart config without preserving the HTTP source used by the chart's readiness and liveness probes. Added the HTTP source on port 9880 and the `fluentd.healthcheck` match.
- The error-only Elasticsearch store placed a `<filter>` directive inside a `copy` output `<store>`, which is not valid Fluentd routing structure. Reworked it to use the core `relabel` output with a labeled pipeline, then applied the `grep` filter before the error Elasticsearch output.
- The file buffer paths used `/var/log/fluentd-buffers`, but Bitnami chart persistence is mounted at `/opt/bitnami/fluentd/logs/buffers`. Updated both buffer paths to the persistent mount.
- The HelmRelease used top-level `resources`, `extraVolumes`, `extraVolumeMounts`, `persistence`, and `service` values that do not match the Bitnami Fluentd chart's aggregator values. Moved resource, persistence, service, and config references under `aggregator`, and used `aggregator.configMap`.
- The Fluent Bit output pointed at `fluentd.logging.svc.cluster.local`, but the Bitnami chart's aggregator service is named `fluentd-aggregator` for a release named `fluentd`. Updated the host to `fluentd-aggregator.logging.svc.cluster.local`.
- Removed `Shared_Key ""` from the Fluent Bit forward output because `Shared_Key` is for secure forward authentication; the Fluentd source shown does not configure a shared key.

## Review Notes
- The local environment did not have `helm`, `kubectl`, `flux`, or `ruby` installed, so validation used official documentation and the published Bitnami chart archive directly.
- The examples assume the `logging` namespace and the referenced Elasticsearch/Kibana resources already exist.
