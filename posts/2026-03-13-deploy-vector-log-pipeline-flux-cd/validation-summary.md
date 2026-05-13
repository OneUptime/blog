# Validation Summary: How to Deploy Vector as a Log Pipeline with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Vector
- Vector Helm chart
- Vector Remap Language (VRL)
- Flux CD HelmRelease and Kustomization APIs
- Kubernetes
- Elasticsearch
- Prometheus metrics scraping

## Sources Consulted
- Vector Helm installation documentation: https://vector.dev/docs/setup/installation/package-managers/helm/
- Vector Helm chart source for chart version 0.36.1: https://github.com/vectordotdev/helm-charts/tree/vector-0.36.1/charts/vector
- Vector Kubernetes logs source documentation: https://vector.dev/docs/reference/configuration/sources/kubernetes_logs/
- Vector route transform documentation: https://vector.dev/docs/reference/configuration/transforms/route/
- Vector Elasticsearch sink documentation: https://vector.dev/docs/reference/configuration/sinks/elasticsearch/
- Vector source and sink documentation: https://vector.dev/docs/reference/configuration/sources/vector/ and https://vector.dev/docs/reference/configuration/sinks/vector/
- Vector CLI documentation: https://vector.dev/docs/reference/cli/
- Flux HelmRelease API v2 documentation: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization API v1 documentation: https://fluxcd.io/flux/components/kustomize/api/v1/

## Issues Found
- The HelmRepository example was shown under `infrastructure/sources`, but the Flux Kustomization reconciles only `./infrastructure/logging`. Changed the file path comment to `infrastructure/logging/vector-helm.yaml` so the repository source is included in the reconciled path.
- The VRL JSON parsing transform merged parsed JSON without checking that the parsed value was an object. Added `is_object(parsed)` before calling `merge`, matching VRL's object-only `merge` function contract.
- The Elasticsearch disk buffer used `268435456` bytes, which is slightly below Vector's documented minimum for disk buffers. Changed it to `268435488`.
- The optional aggregator description implied agents were already forwarding to it. Updated the text to state that agents must be configured to forward to the aggregator.
- The Vector aggregator source omitted the optional `version: "2"` marker shown in Vector's advanced source example and Helm chart sample configuration. Added it to make the protocol configuration explicit.
- The Elasticsearch verification command assumed a specific Elasticsearch pod label and exec target. Replaced it with a temporary `curlimages/curl` pod that queries the configured Elasticsearch service.
- The best-practice command `vector validate --config vector.yaml` used an option not documented for the `validate` subcommand. Changed it to `vector validate vector.yaml`.

## Review Notes
- The pinned Vector Helm chart `0.36.1` is valid and maps to Vector app version `0.41.1-distroless-libc`, but newer chart releases exist. Future updates should consider refreshing the chart version after checking release notes.
- The optional aggregator example shows the receiving side. A production deployment should also replace or supplement the agent Elasticsearch sinks with a `vector` sink that points at the aggregator service.
