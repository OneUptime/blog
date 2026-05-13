# Validation Summary: Deploy Jaeger with Cassandra Backend Using Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease, HelmRepository, OCIRepository, and Kustomization custom resources
- Jaeger Operator
- Jaeger Cassandra storage
- Bitnami Apache Cassandra Helm chart
- cert-manager

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRelease guide for `chartRef` and OCIRepository usage: https://fluxcd.io/flux/guides/helmreleases/
- Flux Source API v1 reference for HelmRepository and OCIRepository: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization dependency documentation: https://github.com/fluxcd/kustomize-controller/blob/main/docs/spec/v1/kustomizations.md
- Jaeger Operator Kubernetes documentation, Cassandra storage: https://www.jaegertracing.io/docs/1.76/deployment/operator/
- Jaeger Helm charts repository: https://jaegertracing.github.io/helm-charts/
- Jaeger Operator Helm chart 2.57.0 values and chart metadata: https://github.com/jaegertracing/helm-charts/releases/download/jaeger-operator-2.57.0/jaeger-operator-2.57.0.tgz
- Bitnami Apache Cassandra chart metadata and values: https://github.com/bitnami/charts/tree/main/bitnami/cassandra

## Issues Found
- The Cassandra example used the legacy Bitnami HTTP Helm repository and an old `>=10.0.0 <11.0.0` chart range. Bitnami's current chart index points Cassandra releases to OCI artifacts, so I changed the example to use a Flux `OCIRepository` with `chartRef`, Helm chart layer selection, and the current 12.x semver range.
- The Cassandra and Jaeger Operator HelmReleases were placed in `observability`, which assumes that namespace already exists. I moved them to `flux-system`, added `targetNamespace: observability`, and enabled `install.createNamespace`.
- The Jaeger Operator HelmRelease referenced a `jaegertracing` HelmRepository that was not defined. I added the missing HelmRepository source.
- The Jaeger Cassandra config used `local-dc: datacenter1`, while the schema job and Bitnami Cassandra default datacenter were `dc1`. I set the Cassandra chart datacenter explicitly to `dc1` and aligned Jaeger's `local-dc` with it.
- The Jaeger storage example placed `dependencies` under a comment saying it initialized the Cassandra schema. In Jaeger Operator, `dependencies` configures the dependency graph job, while `cassandraCreateSchema` configures schema creation. I corrected the comments.
- The Jaeger example used unsupported `cassandraCreateSchema.replicationFactor`. The Jaeger Operator CRD exposes fields such as `enabled`, `datacenter`, `mode`, `traceTTL`, and job settings, but not `replicationFactor`. I removed the field and updated the best-practice note to use `mode: prod`.
- The Flux Kustomization example used `dependsOn` as if it could depend on a Cassandra HelmRelease. Flux Kustomization `dependsOn` references other Kustomization objects. I split the example into `jaeger-infrastructure` and `jaeger` Kustomizations, with `wait: true`, so the Jaeger CR is applied only after Cassandra and the Jaeger Operator are ready.

## Review Notes
- The Jaeger Operator Helm chart repository is still available, but its latest chart line is older than current Jaeger 2.x chart releases. This post remains valid for Jaeger Operator based deployments, but future updates may want to discuss Jaeger 2.x deployment patterns separately.
- The YAML snippets were parsed successfully after the fixes.
