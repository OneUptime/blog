# Validation Summary: How to Use HelmRelease for Deploying RabbitMQ with Flux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux Helm Controller and Source Controller
- Kubernetes
- Helm
- HelmRelease
- HelmRepository
- RabbitMQ
- Bitnami RabbitMQ Helm chart
- Prometheus ServiceMonitor

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm Controller HelmRelease spec: https://github.com/fluxcd/helm-controller/blob/main/docs/spec/v2/helmreleases.md
- Bitnami RabbitMQ chart on Artifact Hub: https://artifacthub.io/packages/helm/bitnami/rabbitmq
- Bitnami RabbitMQ chart values, version 15.5.3 from `oci://registry-1.docker.io/bitnamicharts/rabbitmq`
- Bitnami RabbitMQ chart source: https://github.com/bitnami/charts/tree/main/bitnami/rabbitmq
- RabbitMQ cluster formation and Kubernetes peer discovery documentation: https://www.rabbitmq.com/docs/cluster-formation
- RabbitMQ definitions documentation: https://www.rabbitmq.com/docs/definitions
- RabbitMQ management plugin documentation: https://www.rabbitmq.com/docs/management
- RabbitMQ configuration documentation: https://www.rabbitmq.com/docs/configure

## Issues Found
- The HelmRelease was placed in the `rabbitmq` namespace without creating that namespace first. A Namespace manifest was added before the HelmRelease because Kubernetes must be able to create the HelmRelease custom resource in its namespace before Flux can reconcile it.
- The Bitnami RabbitMQ chart documents `plugins` as the default plugin list and recommends `extraPlugins` for additional plugins. The example was changed from overriding `plugins` to using `extraPlugins` for the shovel plugins; `metrics.enabled` still enables the Prometheus plugin through the chart.
- The permissions comment referred to the `guest` user, but the example configures `auth.username: admin`. The comment was corrected to refer to the default user.
- The comment above the Kubernetes peer discovery settings incorrectly described the block as queue mirroring policy. It was corrected to "Kubernetes peer discovery".
- The ServiceMonitor example used `metrics.serviceMonitor.enabled`, which is not the chart 15.x value shape. It was changed to `metrics.serviceMonitor.default.enabled` with the namespace retained.
- The definitions-loading example mounted a ConfigMap manually and only set `load_definitions`. It was updated to use the Bitnami chart's documented `extraSecrets`, `loadDefinition.enabled`, `loadDefinition.existingSecret`, and `/app/load_definition.json` pattern.

## Review Notes
- The `HelmRepository` OCI form shown in the post is supported by Flux, but Flux documentation notes that OCI `HelmRepository` is in maintenance mode and recommends `OCIRepository` for improved OCI chart support in new designs.
- The post pins chart version `15.x`. That version range still exists in the Docker Hub OCI registry, while the current Bitnami RabbitMQ chart is 16.x as of this review date.
- Local `helm`, `flux`, and `kubectl` binaries were not installed in the review environment, so command behavior was checked against official documentation and chart source rather than local CLI help output.
