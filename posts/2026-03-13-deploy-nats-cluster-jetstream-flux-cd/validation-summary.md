# Validation Summary: How to Deploy NATS Cluster with JetStream via Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NATS
- NATS JetStream
- NATS Helm chart
- NATS CLI
- Kubernetes
- Flux CD HelmRepository, HelmRelease, and Kustomization resources
- cert-manager Certificate resources
- Prometheus NATS exporter

## Sources Consulted
- NATS Kubernetes documentation: https://docs.nats.io/running-a-nats-service/nats-kubernetes
- NATS Helm chart `nats` values for chart version 1.2.4: https://raw.githubusercontent.com/nats-io/k8s/nats-1.2.4/helm/charts/nats/values.yaml
- NATS Helm chart templates for chart version 1.2.4: https://github.com/nats-io/k8s/tree/nats-1.2.4/helm/charts/nats
- NATS CLI documentation: https://docs.nats.io/using-nats/nats-tools/nats_cli
- NATS CLI help output from `natsio/nats-box:0.14.5`
- NATS JetStream documentation: https://docs.nats.io/nats-concepts/jetstream
- NATS JetStream model deep dive: https://docs.nats.io/using-nats/developer/develop_jetstream/model_deep_dive
- NATS TLS documentation: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/tls
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository and Kustomization documentation: https://fluxcd.io/flux/components/source/helmrepositories/ and https://fluxcd.io/flux/components/kustomize/kustomizations/
- cert-manager Certificate documentation: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The HelmRelease values used invalid NATS chart keys for chart version 1.2.4. Replaced `config.tls` with `config.nats.tls`, changed `secret.name` to `secretName`, moved the cluster name under `config.cluster.merge`, changed `natsbox` to `natsBox`, and changed `prometheus` to `promExporter`.
- The NATS chart version used in the post does not expose top-level `container.resources` or `reloader.resources` fields. Moved those resource requests and limits under `container.merge.resources` and `reloader.merge.resources`, which the chart supports.
- The `podAntiAffinity: true` value is not a supported chart value. Replaced it with a Kubernetes `podAntiAffinity` configuration under `podTemplate.merge.spec.affinity`.
- The inline NATS config values for `max_payload` and `max_connections` needed the chart's raw-value syntax so they render as NATS size values instead of quoted strings. Updated them to use `<< 1MB >>` and `<< 64K >>`.
- TLS was enabled for NATS, but the setup Job and verification commands did not account for TLS. Added the CA mount and `--tlsca` flags to the Job, configured `tlsCA`, and configured the generated `natsBox` context so the verification commands can use the chart-created context.
- The NATS CLI examples used `--no-prompt`, which is not available in `natsio/nats-box:0.14.5`. Replaced it with `--defaults`, verified against `nats stream add --help` and `nats consumer add --help`.
- The duplicate-window best practice described duplicate delivery prevention. Updated it to duplicate ingestion prevention with a consistent `Nats-Msg-Id`, matching JetStream deduplication behavior.

## Review Notes
- Rendered the corrected Helm values against the official `nats/nats` chart version 1.2.4 with Helm 3.14.0 to confirm the chart accepts the configuration and generates the expected NATS config, TLS mounts, resources, anti-affinity, NATS box context, and Prometheus exporter sidecar.
- The certificate example assumes the referenced `ClusterIssuer` provides a usable `ca.crt` in the generated Secret, which is typical for private CA-backed issuers. Public ACME issuers may not be appropriate for internal `*.svc.cluster.local` names.
