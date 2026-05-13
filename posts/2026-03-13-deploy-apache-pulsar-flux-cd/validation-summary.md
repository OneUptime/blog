# Validation Summary: How to Deploy Apache Pulsar with Flux CD - 2026-03-13

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache Pulsar
- Apache Pulsar Helm Chart
- Flux CD HelmRepository, HelmRelease, and Kustomization APIs
- Kubernetes Namespace, Job, StatefulSet, and PersistentVolumeClaim configuration
- Pulsar Admin CLI and Pulsar Client CLI
- JWT authentication and authorization for Pulsar

## Sources Consulted
- Apache Pulsar Helm Chart 3.3.0 source archive and chart values: https://archive.apache.org/dist/pulsar/helm-chart/3.3.0/
- Apache Pulsar Helm Chart repository documentation: https://github.com/apache/pulsar-helm-chart
- Apache Pulsar 3.3.x admin CLI reference: https://pulsar.apache.org/docs/3.3.x/reference-pulsar-admin/
- Apache Pulsar produce/consume tutorial: https://pulsar.apache.org/docs/tutorials-produce-consume/
- Apache Pulsar client subscription initial position API reference: https://pulsar.apache.org/api/client/3.1.x/org/apache/pulsar/client/api/SubscriptionInitialPosition.html
- Apache Pulsar broker configuration reference: https://pulsar.apache.org/docs/2.10.x/reference-configuration/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/

## Issues Found
- The Pulsar Manager value used `pulsar_manager.enabled: true`, which is not how the official Pulsar Helm chart enables components. Changed it to `components.pulsar_manager: true` and kept resource configuration under `pulsar_manager`.
- The JWT authentication example placed authentication settings directly under `broker.configData`. The official chart uses the top-level `auth` values to render broker and proxy authentication settings and mount token key secrets. Replaced the snippet with the chart-supported `auth.authentication`, `auth.authorization`, and `auth.superUsers` values.
- The setup Job used `apachepulsar/pulsar:3.3.0`, but chart version `3.3.0` has appVersion `3.0.2` and uses `apachepulsar/pulsar-all` by default. Changed the setup image to `apachepulsar/pulsar-all:3.0.2` to match the deployed chart app version and include the expected Pulsar tools.
- The backlog quota command used `--limit-size`, which is not a valid Pulsar 3.3.x `pulsar-admin namespaces set-backlog-quota` option. Changed it to `--limit 10G`.
- The verification text said brokers were in standalone mode, but the Helm deployment creates a distributed Pulsar cluster with ZooKeeper, BookKeeper, brokers, and proxies. Changed the wording to verify that brokers are registered in the cluster.
- The consume command ran after producing a message with a new subscription. Pulsar creates new subscriptions at the latest position by default, so the command could miss the already-produced test message. Added `--subscription-position Earliest`.

## Review Notes
The post pins Pulsar Helm chart `3.3.0`, which is not the latest chart available as of 2026-05-13, but the examples are now internally consistent for that pinned chart version. Production JWT deployments still need the token key and token secrets created or supplied according to the official chart workflow.
