# Validation Summary: How to Use HelmRelease for Deploying Kafka with Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRepository and HelmRelease APIs
- Kubernetes
- Helm
- Apache Kafka
- Bitnami Kafka Helm chart
- KRaft mode
- Prometheus JMX metrics and ServiceMonitor
- Kafka UI

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Bitnami Kafka Helm chart documentation for chart 31.1.0: https://artifacthub.io/packages/helm/bitnami/kafka/31.1.0
- Bitnami Kafka Helm chart current README and values: https://github.com/bitnami/charts/tree/main/bitnami/kafka
- Kafka UI documentation: https://docs.kafka-ui.provectus.io/overview/getting-started
- Kafka UI configuration documentation: https://docs.kafka-ui.provectus.io/configuration/misc-configuration-properties

## Issues Found
- The HelmRelease was placed in the `kafka` namespace while relying on `install.createNamespace: true`. A HelmRelease object cannot be created in a namespace that does not already exist, so I moved the HelmRelease to `flux-system` and set `spec.targetNamespace: kafka`, allowing Helm to create the release namespace.
- The Flux status command used `-n kafka`, but the HelmRelease now lives in `flux-system`. I updated the command to `flux get helmrelease kafka -n flux-system`.
- The metrics block used `metrics.kafka.enabled` while describing JMX exporter metrics. For the Bitnami Kafka chart, JMX metrics are enabled with `metrics.jmx.enabled`, and ServiceMonitor depends on JMX metrics being enabled. I changed the values block to use `metrics.jmx`.
- The SASL comment said to enable SASL for production, but the listeners were configured as `PLAINTEXT`, so that block only defines credentials and does not enable SASL. I updated the comment to clarify that the credentials are used when SASL listener protocols are selected.
- The Kafka UI manifest only created a Deployment, leaving no Kubernetes Service for in-cluster access to the web interface. I added a ClusterIP Service targeting port 8080.
- The summary called the example production-ready even though it intentionally uses plaintext listeners and example credentials. I adjusted the wording to describe it as a declarative baseline that can be hardened for production.

## Review Notes
- The post pins the Bitnami Kafka chart to `31.x`; the reviewed values match the 31.x chart family. Current Bitnami Kafka chart releases have moved additional configuration toward newer keys such as `overrideConfiguration`, so future updates to `32.x` or later should re-check the values block before changing the chart version.
- The local environment did not have `helm`, `kubectl`, `flux`, or `ruby` installed, so CLI execution and YAML parser checks were not run locally. The review was performed against official Flux, Bitnami, and Kafka UI documentation.
