# Validation Summary: How to Deploy NATS on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NATS (core messaging)
- NATS JetStream (persistence layer)
- NATS Helm Chart (nats/nats)
- Talos Linux
- Kubernetes (StatefulSet, ConfigMap, Pod, Deployment, topology spread constraints)
- `nats` CLI / `natsio/nats-box`
- NATS Prometheus Exporter (`natsio/prometheus-nats-exporter`)

## Sources Consulted
- NATS Helm chart values.yaml: https://raw.githubusercontent.com/nats-io/k8s/main/helm/charts/nats/values.yaml
- NATS Helm chart README: https://raw.githubusercontent.com/nats-io/k8s/main/helm/charts/nats/README.md
- Kubernetes Pod Topology Spread Constraints docs: https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- NATS CLI source (`consumer_command.go`, `stream_command.go`, `reply_command.go`): https://github.com/nats-io/natscli
- NATS server `monitor.go` (`/healthz` query params): https://github.com/nats-io/nats-server/blob/main/server/monitor.go
- NATS JetStream resource management docs: https://docs.nats.io/running-a-nats-service/configuration/resource_management
- ArtifactHub `nats/nats` chart listing (current version 2.14.0)

## Issues Found

1. **Helm values: `memStorage` → `memoryStore`.** The NATS Helm chart's JetStream key is `config.jetstream.memoryStore`, not `memStorage`. Updated the values.yaml example accordingly.
2. **Helm values: `size` → `maxSize` under memoryStore.** The chart uses `memoryStore.maxSize`, not `memoryStore.size`. Updated to `maxSize: 1Gi`.
3. **Helm values: `fileStorage` → `fileStore`.** The chart key is `config.jetstream.fileStore`, not `fileStorage`. Updated the values.yaml example.
4. **Helm values: fileStore PVC structure.** The chart nests `size` and `storageClassName` under `fileStore.pvc`, not directly under `fileStore`. Restructured the fileStore block to use `fileStore.pvc.{enabled,size,storageClassName}`.
5. **Kubernetes spec: `whenUnsatisfied` → `whenUnsatisfiable`.** The correct field name on a topology spread constraint is `whenUnsatisfiable` (per the Kubernetes API). Fixed the typo in the `podTemplate.topologySpreadConstraints` block.

## Review Notes

- The `helm repo add nats https://nats-io.github.io/k8s/helm/charts/` URL is the current official chart repo (the bare browser URL returns a redirect splash page, but it works correctly as a Helm repo endpoint).
- `nats:2.10-alpine` is a valid image tag; NATS 2.10 is still a supported release line, though 2.11 is also available. The post does not need to be bumped, but a future revision could mention 2.11.
- The NATS CLI `--filter` flag used for `nats consumer add` is correct (it accepts one or more subjects; there is no `--filter-subject` alias in the current CLI).
- `/healthz?js-enabled-only=true` is the correct, current query parameter (the older `js-enabled` is deprecated by the server).
- The post says JetStream provides "exactly-once semantics" in Step 5 while the intro correctly says "at-least-once." JetStream is at-least-once by default, with exactly-once achievable via message-ID deduplication and double-ack — technically defensible, but slightly imprecise. Left as written since it is not strictly incorrect.
- `config.merge` and `container.merge` are legitimate escape hatches in the NATS chart for free-form server config and container spec overrides — the post uses them correctly.
- The standalone `nats.conf` JetStream keys `max_mem` and `max_file` match the documented short forms.
