# Validation Summary: How to Deploy NATS with ArgoCD

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- NATS
- NATS JetStream
- NATS Helm chart
- NATS CLI
- Argo CD
- Kubernetes
- External Secrets Operator
- Prometheus Operator

## Sources Consulted
- NATS Kubernetes documentation: https://docs.nats.io/running-a-nats-service/nats-kubernetes
- NATS Helm chart 1.2.4 values and templates: https://github.com/nats-io/k8s/tree/nats-1.2.4/helm/charts/nats
- NATS server configuration documentation: https://docs.nats.io/running-a-nats-service/configuration
- NATS authorization documentation: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/authorization
- NATS CLI documentation: https://docs.nats.io/using-nats/nats-tools/nats_cli
- NATS JetStream stream administration documentation: https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/streams
- NATS JetStream clustering administration documentation: https://docs.nats.io/running-a-nats-service/configuration/clustering/jetstream_clustering/administration
- NATS leafnode configuration documentation: https://docs.nats.io/running-a-nats-service/configuration/leafnodes/leafnode_conf
- Argo CD resource hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/v0.10.5/api/externalsecret/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus NATS exporter source and metric names: https://github.com/nats-io/prometheus-nats-exporter

## Issues Found
- The Helm `config.merge` values `max_payload: 8MB` and `write_deadline: 10s` would be rendered as quoted strings by the NATS Helm chart, which makes `max_payload` invalid for `nats-server`. Updated them to the chart's unquoted scalar syntax: `<< 8MB >>` and `<< 10s >>`.
- The authentication example created a standalone Secret containing `auth.conf` but did not mount or include that file in the NATS Helm chart configuration. Replaced it with Helm values that configure `authorization` through `config.merge` and read passwords from the `nats-credentials` Secret via environment variables.
- The ExternalSecret omitted `notification-service-password` even though the authentication example referenced a notification-service credential. Added the missing secret mapping.
- The stream setup job used `--retention=workqueue`, which is not accepted by the NATS CLI in `natsio/nats-box:0.14.5`; the supported work-queue retention value is `work`. Updated the flag to `--retention=work`.
- The monitoring example used a ServiceMonitor for the `prom-metrics` port, but the NATS Helm chart exposes the Prometheus exporter as a pod container port and provides a built-in PodMonitor option. Enabled `promExporter.podMonitor.enabled` in the Helm values and changed the standalone manifest to a PodMonitor.
- The listed Prometheus metric names did not match the `-prefix=nats` metrics emitted by the chart's Prometheus exporter. Updated them to `nats_varz_connections`, `nats_varz_out_msgs`, `nats_varz_in_msgs`, `nats_server_total_streams`, and `nats_consumer_num_pending`.
- The scaling section claimed JetStream automatically rebalances stream replicas across an expanded cluster. Adjusted the wording to clarify that new streams can be placed on the expanded cluster and existing streams can be rebalanced explicitly with the NATS CLI.
- The health-check section described the custom StatefulSet health script as JetStream-aware, but the script only checks StatefulSet replica readiness. Updated the wording to describe it as an explicit StatefulSet health rule.

## Review Notes
- Verified the corrected Helm values by rendering the official NATS chart version 1.2.4 with Helm and checking that `max_payload` and `write_deadline` render unquoted in `nats.conf`, and that the chart creates a PodMonitor with the `prom-metrics` port.
- Verified NATS CLI flags against `natsio/nats-box:0.14.5` command help.
- The post pins NATS Helm chart `1.2.4`, which deploys NATS server `2.10.20`; newer chart releases exist, but the pinned version is still technically coherent for the examples shown.
