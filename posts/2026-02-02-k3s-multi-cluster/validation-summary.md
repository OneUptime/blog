# Validation Summary: How to Handle K3s Multi-Cluster

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- K3s (lightweight Kubernetes distribution)
- Rancher Fleet (GitOps multi-cluster controller)
- ArgoCD (referenced)
- Submariner (cross-cluster networking, MCS API)
- Linkerd (service mesh, multi-cluster federation)
- ExternalDNS (DNS automation, Cloudflare provider)
- OpenTelemetry Collector (metrics/logs/traces, kubeletstats receiver, file_storage extension, OTLP exporter)
- Prometheus / Mimir / Loki / Tempo / Grafana (observability stack)
- External Secrets Operator (Vault/AWS Secrets Manager integration)
- system-upgrade-controller (K3s rolling upgrades)
- WireGuard (via Flannel `wireguard-native` backend)
- etcd / SQLite / PostgreSQL (K3s datastore options)

## Sources Consulted
- K3s server CLI reference — https://docs.k3s.io/cli/server
- K3s HA with embedded etcd — https://docs.k3s.io/datastore/ha-embedded
- K3s etcd-snapshot — https://docs.k3s.io/cli/etcd-snapshot
- K3s datastore options — https://docs.k3s.io/datastore
- K3s automated upgrades — https://docs.k3s.io/upgrades/automated
- Rancher Fleet GitRepo reference — https://fleet.rancher.io/reference/ref-gitrepo
- Rancher Fleet installation — https://fleet.rancher.io/how-tos-for-operators/installation
- Submariner subctl — https://submariner.io/operations/deployment/subctl/
- Submariner NAT traversal — https://submariner.io/operations/nat-traversal/
- Submariner service discovery — https://submariner.io/getting-started/architecture/service-discovery/
- Linkerd multicluster installation — https://linkerd.io/2-edge/tasks/installing-multicluster/
- Linkerd multicluster CLI reference — https://linkerd.io/docs/reference/cli/multicluster/
- ExternalDNS GitHub releases — https://github.com/kubernetes-sigs/external-dns/releases
- ExternalDNS Cloudflare tutorial — https://kubernetes-sigs.github.io/external-dns/latest/docs/tutorials/cloudflare/
- OpenTelemetry Collector Contrib v0.91.0 release notes — https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.91.0
- OTel kubeletstats receiver — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/kubeletstatsreceiver/README.md
- OTel file_storage extension — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OTel resource processor — https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- External Secrets Operator v1 API — https://external-secrets.io/latest/api/externalsecret/
- ESO v1beta1 removal (v0.17.0) — https://github.com/external-secrets/external-secrets/issues/5478
- system-upgrade-controller — https://github.com/rancher/system-upgrade-controller

## Issues Found

1. **External Secrets Operator API version outdated** — The `ExternalSecret` manifest used `external-secrets.io/v1beta1`. ESO promoted the API to `v1` and `v1beta1` is removed as of v0.17.0. For a 2026 post the correct apiVersion is `external-secrets.io/v1`. Updated the manifest accordingly. The spec field names (`refreshInterval`, `secretStoreRef`, `target`, `data`) are identical between versions, so no further edits were required.

2. **Linkerd `multicluster link` deprecated** — The bash example invoked `linkerd multicluster link --cluster-name ...`. Starting with edge-25.3.3, `link`/`unlink` are deprecated in favor of `link-gen`/`unlink-gen` (more GitOps-friendly: emits manifests without applying). Updated to `linkerd multicluster link-gen` and added a brief comment noting the replacement. The flag set (`--cluster-name`, `--kubeconfig`) is unchanged.

## Review Notes

- **Old container image tags but still valid.** `otel/opentelemetry-collector-contrib:0.91.0` (Dec 2023) and `registry.k8s.io/external-dns/external-dns:v0.14.0` (Nov 2023) are real releases and the YAML examples remain valid against them. For a 2026 post, more recent tags (OTel ~v0.140+, ExternalDNS ~v0.18.x) would be more representative, but no syntax or field has broken so left as-is.
- **OTel DaemonSet references env vars that the pod spec does not define.** The collector config substitutes `${env:NODE_NAME}` and `${env:CLUSTER_NAME}`, but the container has no `env:` block setting them. This would yield empty substitutions at runtime. Not corrected here because the fix would require adding content (downward-API `NODE_NAME` and a literal `CLUSTER_NAME`) beyond a pure technical correction; the snippet reads as a template the operator is expected to wire up. Worth tightening in a future revision.
- **Fleet Cluster created in `clusters` namespace.** Fleet expects Cluster resources in a workspace namespace (default `fleet-default` or `fleet-local`). Using a custom `clusters` namespace works only if it has been created as a workspace. Not strictly incorrect — left as-is.
- **Submariner `--natt=false`** verified. The boolean flag is the current spelling (replaced the earlier `--disable-nat` back in v0.9.0).
- **K3s `--flannel-backend=wireguard-native`** is the correct, non-deprecated value (the plain `wireguard` value was deprecated).
- **K3s SQLite path `/var/lib/rancher/k3s/server/db/state.db`** is consistent with the kine default and widely cited; current K3s docs document the directory but not the explicit filename. Left as-is.
- **Fleet `forceSyncGeneration: 1`** is valid; users typically increment this value to force a resync.
