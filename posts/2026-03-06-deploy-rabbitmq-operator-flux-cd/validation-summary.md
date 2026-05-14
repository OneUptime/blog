# Validation Summary: How to Deploy RabbitMQ Operator with Flux CD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- RabbitMQ Cluster Kubernetes Operator
- RabbitMQ Messaging Topology Operator
- RabbitMQ queues, exchanges, bindings, users, permissions, and policies
- Flux CD Kustomizations and HelmReleases
- Kubernetes manifests and Kustomize
- Bitnami RabbitMQ Cluster Operator Helm chart
- Prometheus Operator ServiceMonitor

## Sources Consulted
- RabbitMQ Cluster Operator overview: https://www.rabbitmq.com/kubernetes/operator/operator-overview
- RabbitMQ Cluster Operator usage guide: https://www.rabbitmq.com/kubernetes/operator/using-operator
- RabbitMQ Cluster Operator API reference: https://pkg.go.dev/github.com/rabbitmq/cluster-operator/v2/api/v1beta1
- RabbitMQ Messaging Topology Operator usage guide: https://www.rabbitmq.com/kubernetes/operator/using-topology-operator
- RabbitMQ Messaging Topology Operator API reference: https://pkg.go.dev/github.com/rabbitmq/messaging-topology-operator/api/v1beta1
- Bitnami rabbitmq-cluster-operator chart values: https://github.com/bitnami/charts/blob/main/bitnami/rabbitmq-cluster-operator/values.yaml
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The original Flux layout applied the operator HelmRelease and RabbitMQ custom resources in the same Kustomization, which could apply `RabbitmqCluster` and topology CRs before the Helm chart-installed CRDs exist. I split the repository layout into `operator` and `cluster` Kustomizations and added a second Flux Kustomization with `dependsOn`.
- The ServiceMonitor was shown but not included in the repository structure or Kustomize resources. I added `servicemonitor.yaml` to both places.
- The `useCertManager: false` comment incorrectly described CRD installation. I corrected it to describe chart-generated webhook certificates.
- The RabbitMQ cluster example repeated operator-generated cluster formation settings and set a different Kubernetes API host than the operator defaults. I removed those duplicated settings.
- The additional plugin list included `rabbitmq_management` and `rabbitmq_prometheus`, which the Cluster Operator enables by default. I removed those redundant entries.
- The TLS example set `secretName: ""`, which is not a useful TLS configuration and can mislead readers. I changed it to a commented example that should only be enabled when the referenced secrets exist.
- The prerequisites did not mention that `ServiceMonitor` requires Prometheus Operator CRDs. I added Prometheus Operator to the prerequisites.

## Review Notes
The examples use valid current `rabbitmq.com/v1beta1`, Flux `helm.toolkit.fluxcd.io/v2`, Flux `kustomize.toolkit.fluxcd.io/v1`, and `monitoring.coreos.com/v1` APIs. The queue examples use queue arguments, which are valid, but RabbitMQ's topology operator documentation recommends policies where possible because queue arguments are not easily updated after queue creation.
