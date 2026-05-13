# Validation Summary: How to Deploy RabbitMQ Cluster Operator with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- HelmRelease and HelmRepository APIs
- RabbitMQ Cluster Kubernetes Operator
- RabbitMQ `RabbitmqCluster` CRD
- RabbitMQ CLI tools
- Bitnami Helm chart for RabbitMQ Cluster Operator

## Sources Consulted
- RabbitMQ Cluster Operator usage documentation: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Cluster Operator CRD and source code: https://github.com/rabbitmq/cluster-operator
- RabbitMQ external default user secret example: https://github.com/rabbitmq/cluster-operator/tree/main/docs/examples/external-admin-secret-credentials
- RabbitMQ release information: https://www.rabbitmq.com/release-information
- RabbitMQ upgrade documentation: https://www.rabbitmq.com/docs/upgrade
- RabbitMQ CLI and diagnostics documentation: https://www.rabbitmq.com/docs/4.2/man/rabbitmq-diagnostics.8
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Bitnami RabbitMQ Cluster Operator chart values: https://github.com/bitnami/charts/tree/main/bitnami/rabbitmq-cluster-operator

## Issues Found
- The `RabbitmqCluster` used the `rabbitmq` namespace without creating it. Added a `Namespace` manifest for `rabbitmq`.
- The post used the unsupported RabbitMQ `3.13.4-management` image. Updated the example to `rabbitmq:4.2.5-management`, which is in a currently supported RabbitMQ release series as of the review date.
- The default-user customization used `RABBITMQ_DEFAULT_USER` and `RABBITMQ_DEFAULT_PASS` StatefulSet overrides. Replaced this with the operator-supported `spec.secretBackend.externalSecret` flow and a Secret containing `default_user.conf`.
- The custom default-user Secret used non-operator keys `default_user` and `default_pass`. Replaced them with the Service Binding style fields and `default_user.conf` expected by the operator.
- The Flux cluster Kustomization path included the operator and cluster resources together while also depending on `rabbitmq-operator`. Updated the example path to the cluster manifests and added a note that it should depend on a separate operator Kustomization.
- The StatefulSet health check referenced `production`, but the operator creates StatefulSets named `<cluster-name>-server`. Updated it to `production-server`.
- The verification command used `rabbitmqctl node_health_check`, which is deprecated and a no-op in RabbitMQ 4.x. Replaced it with `rabbitmq-diagnostics -q ping`.
- The Service scrape annotations used port `15692` while TLS was enabled. The operator exposes Prometheus on `15691` when TLS is configured, so the annotations now use port `15691` and HTTPS.

## Review Notes
- The `rabbitmq_management`, `rabbitmq_prometheus`, and `rabbitmq_peer_discovery_k8s` plugins are essential plugins enabled by the operator, so listing them in `additionalPlugins` is redundant but not harmful.
- The Bitnami chart version `4.3.25` still exists in the Bitnami Helm repository at validation time.
