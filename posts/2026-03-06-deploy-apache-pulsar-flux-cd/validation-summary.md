# Validation Summary: How to Deploy Apache Pulsar with Flux CD - 2026-03-06

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Apache Pulsar
- Apache Pulsar Helm chart
- Flux CD HelmRelease and Kustomization
- Kubernetes Namespace, Job, Secret volumes, NetworkPolicy, StatefulSet, and PVCs
- Prometheus Operator ServiceMonitor
- Pulsar admin and client CLI tools

## Sources Consulted
- Apache Pulsar Helm chart repository: https://github.com/apache/pulsar-helm-chart
- Apache Pulsar Helm chart values.yaml: https://raw.githubusercontent.com/apache/pulsar-helm-chart/master/charts/pulsar/values.yaml
- Apache Pulsar Helm chart Chart.yaml: https://raw.githubusercontent.com/apache/pulsar-helm-chart/master/charts/pulsar/Chart.yaml
- Flux HelmRelease API v2 reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Apache Pulsar admin CLI reference: https://pulsar.apache.org/docs/4.0.x/reference-pulsar-admin/
- Apache Pulsar 4.0.10 CLI source: https://github.com/apache/pulsar/tree/v4.0.10/pulsar-client-tools
- Apache Pulsar tenant administration documentation: https://pulsar.apache.org/docs/4.0.x/admin-api-tenants/
- Apache Pulsar produce/consume tutorial: https://pulsar.apache.org/docs/4.1.x/tutorials-produce-consume/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Prometheus Operator ServiceMonitor API reference: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitor

## Issues Found
- The Kubernetes prerequisite was listed as v1.26 or later, but the current Apache Pulsar Helm chart declares support for Kubernetes v1.25 or later. Updated the prerequisite accordingly.
- The storage prerequisite said 50Gi, but the example requests 270Gi across ZooKeeper and BookKeeper PVCs. Updated the prerequisite to match the shown volume sizes.
- The ServiceMonitor examples require Prometheus Operator CRDs. Added that prerequisite.
- The HelmRelease used `version: "3.x"`, which would select older chart releases while the post uses a 2026 context. Updated it to the current major chart range `>=4.0.0 <5.0.0`.
- The Helm values used obsolete or incorrect persistence keys such as `zookeeper.persistence` and `bookkeeper.persistence`. Updated them to the chart's `volumes` structure.
- Broker configuration keys were written without the chart's required `PULSAR_PREFIX_` prefix for broker.conf overrides. Added the prefix to the transaction, retention, and deduplication settings.
- Proxy port overrides were nested under `proxy.service.ports`, which is not the current chart schema. Moved them under `proxy.ports`.
- Pulsar Manager was enabled with `pulsar_manager.enabled`, which is not the component toggle used by the chart. Added `components.pulsar_manager: true`.
- The post used a non-existent `monitoring.prometheus` / `monitoring.grafana` values block. Replaced it with `victoria-metrics-k8s-stack.enabled: false` for the external ServiceMonitor approach used later in the post.
- The authentication section created a standalone Secret with broker config keys that the chart would not consume. Replaced it with the chart-supported `auth.authentication.jwt.generateSecrets` values.
- The tenant setup Job used Helm hook annotations, an older Pulsar image, no mounted token, an unreliable admin URL mechanism, and the wrong cluster name `standalone`. Updated it for Flux-managed Jobs, Pulsar 4.0.10, generated admin token mounting, explicit admin auth flags, and the default chart cluster name `pulsar`.
- BookKeeper component labels and StatefulSet/pod names were written as `bookkeeper`, but the chart's component value is `bookie`. Updated NetworkPolicy selectors, ServiceMonitor selectors, health checks, and troubleshooting commands.
- Verification commands used broker pods for client operations after enabling authentication. Updated tenant listing and produce/consume checks to use the chart's toolset pod and added `-p Earliest` so consuming after producing can read the test message.
- The conclusion described the result as production-ready even though the chart documentation says the chart is a starting point requiring security customization. Reworded the conclusion to avoid overstating production readiness.

## Review Notes
- Local `helm`, `kubectl`, and `flux` binaries were not installed in the workspace, so CLI verification was performed against official documentation and chart source instead of local `--help` output.
- The Apache Pulsar Helm chart documentation warns that the chart is a starting point and may require production-specific customization, especially for security, TLS, and network exposure.
