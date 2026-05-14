# Validation Summary: How to Deploy NATS with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- NATS
- NATS Helm chart
- Kubernetes
- Kubernetes NetworkPolicy
- Prometheus Operator PodMonitor
- NATS CLI
- JetStream

## Sources Consulted
- Flux HelmRelease API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- NATS Kubernetes documentation: https://docs.nats.io/running-a-nats-service/nats-kubernetes
- NATS Helm chart repository index: https://nats-io.github.io/k8s/helm/charts/index.yaml
- NATS Helm chart values and templates from the official nats-io/k8s release artifacts: https://github.com/nats-io/k8s
- NATS authorization documentation: https://docs.nats.io/running-a-nats-service/configuration/securing_nats/authorization
- NATS CLI documentation: https://docs.nats.io/using-nats/nats-tools/nats_cli
- NATS JetStream stream and consumer administration documentation: https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/streams and https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/consumers
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Docker Hub nats-box image documentation: https://hub.docker.com/r/natsio/nats-box

## Issues Found
- The HelmRelease used `version: "1.2.x"`, which was not a specific reproducible pin and is behind the current official chart series. Updated it to the current chart version `2.14.0`.
- The Helm values used old or invalid paths such as `cluster`, `jetstream.fileStore.storageDirectory`, `nats.resources`, `exporter`, and `auth`. Updated them to the official chart structure under `config.cluster`, `config.jetstream.fileStore.dir`, `container.resources`, `promExporter`, and `config.merge.authorization`.
- The authentication Secret stored a `nats.conf` file that the HelmRelease did not mount or reference. Replaced it with password keys and wired those keys into the chart through `container.env` and the NATS config merge.
- The ServiceMonitor example did not match the NATS Helm chart, which exposes a Prometheus `PodMonitor` for the exporter sidecar. Replaced the ServiceMonitor snippet with the chart-supported `promExporter.podMonitor.enabled` configuration.
- The NetworkPolicy allowed client and route traffic but blocked Prometheus scraping of the exporter sidecar. Added ingress for TCP port `7777` from a `monitoring` namespace.
- The Flux Kustomization used `dependsOn` as if it ordered resources in the same directory and health-checked the Helm-created StatefulSet. Removed the misleading dependency and changed the health check to the `HelmRelease`, which is the documented Flux pattern.
- The verification and JetStream setup commands did not authenticate even though the deployment enabled authentication. Added `--user` and `--password` flags where needed.
- The examples used `natsio/nats-tools`, which is not the documented NATS utility image. Replaced it with `natsio/nats-box`.
- The publish/subscribe examples used `test.*` subjects that were not allowed by the configured client permissions. Updated them to `events.*`.
- The JetStream consumer command omitted `--pull` for the pull consumer example. Added `--pull` to match the documented CLI usage.

## Review Notes
- The placeholder passwords are suitable for an example only; production deployments should replace them and encrypt the Secret with SOPS, Sealed Secrets, or an equivalent GitOps secret-management workflow.
- Prometheus must be configured to discover PodMonitor resources in `nats-system`; otherwise the PodMonitor will exist but not be scraped.
