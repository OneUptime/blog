# Validation Summary: How to Deploy OneUptime on Kubernetes with Persistent Storage

## Status
validated

## Post Type
Tutorial / deployment guide with shell commands and Helm values.

## Technologies Covered
- OneUptime 12.0.33
- Kubernetes, PersistentVolumes, PersistentVolumeClaims, StorageClasses, and CSI
- Helm 3
- PostgreSQL and CloudNativePG
- ClickHouse, Altinity operator, and ClickHouse Keeper
- Redis
- TLS, Kubernetes Secrets, database backups, and recovery

## Sources Consulted
- [Official chart repository](https://helm-chart.oneuptime.com/) and [repository index](https://helm-chart.oneuptime.com/index.yaml).
- [Published OneUptime 12.0.33 chart archive](https://helm-chart.oneuptime.com/oneuptime-12.0.33.tgz): inspected defaults and templates and used it for linting and rendering.
- [Versioned chart values](https://github.com/OneUptime/oneuptime/blob/12.0.33/HelmChart/Public/oneuptime/values.yaml).
- [Versioned installation guide](https://github.com/OneUptime/oneuptime/blob/12.0.33/HelmChart/Public/oneuptime/docs/installation.md).
- [Versioned database options](https://github.com/OneUptime/oneuptime/blob/12.0.33/HelmChart/Public/oneuptime/docs/databases.md).
- [Versioned production checklist](https://github.com/OneUptime/oneuptime/blob/12.0.33/HelmChart/Public/oneuptime/docs/production-checklist.md).
- [Kubernetes persistent volumes](https://kubernetes.io/docs/concepts/storage/persistent-volumes/).
- [Kubernetes StorageClasses](https://kubernetes.io/docs/concepts/storage/storage-classes/).
- [kubectl get reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/).
- [Helm install reference](https://helm.sh/docs/helm/helm_install/) and [Helm show values reference](https://helm.sh/docs/helm/helm_show_values/).
- Local Helm 3.12.3 official CLI help for install, show values, repo add, repo update, search repo, and status. The chart installation guide specifies Helm 3; current online Helm documentation also covers Helm 4.

## Issues Found
- **Unpinned defaults inspection:** `helm show values` selected the latest chart while the article described 12.0.33. Pinned both inspection and installation to 12.0.33 and explained that these versions must match when changed.
- **Incomplete HTTPS setup:** `httpProtocol: https` alone does not provision TLS. Added the required TLS termination prerequisite and the chart-supported `ssl.provision` alternative with its public hostname and port requirements. Identified the example file as `values-production.yaml`, matching the install command.
- **Redis durability implication:** Being separate from the primary databases does not make loss of queued work harmless. Clarified that disabled persistence can lose queued telemetry, other work, and sessions. Noted that AOF or RDB must also be configured because the default Redis configuration disables both.
- **Operator installation ambiguity:** The chart bundles and installs CNPG and Altinity when enabled. Corrected the implication that separate installation is required, and noted duplicate operator installation restrictions and the lack of automatic data migration.
- **Chart pin versus image pin:** Added that pinning the chart does not freeze mutable application or database image tags. The defaults include `release` and `latest`; the official production checklist calls for explicit image pins.
- **Inadequate persistence check:** Restarting an application Pod does not exercise database PVC reuse. Changed the check to recreate PostgreSQL and ClickHouse Pods individually while retaining PVCs, wait for readiness, and verify stored configuration and telemetry. Identified the expected standalone database downtime.
- **Helm version scope:** Explicitly identified Helm 3, matching the versioned installation prerequisites and the CLI used for verification.

## Review Notes
- Downloaded the official versioned documentation successfully through raw GitHub URLs after the browser fetch of the GitHub database page failed. The three versioned documentation targets exist.
- `helm lint` passed with the corrected article values: one chart linted, zero failures. `helm template` succeeded using the published 12.0.33 archive and namespace `oneuptime`; rendered YAML parsed successfully.
- Confirmed rendered PostgreSQL and ClickHouse volume claim templates use `fast-retain`, request `100Gi` and `1Ti` respectively, and use `ReadWriteOnce`. Redis renders without volume claims. The named StorageClass and capacities are explicitly cluster-specific examples.
- Confirmed standalone topology, default database volume sizes of 25Gi, generally empty resource settings, operator enablement keys, and external database Secret/TLS inputs against the versioned chart.
- The storage expansion, reclaim policy, backup, and restore guidance is consistent with Kubernetes behavior. Helm value changes alone do not guarantee existing PVC expansion; driver and StorageClass support must be verified.
- Commands were checked against documentation and CLI help, and shell blocks were syntax-checked. No installation, Pod restart, storage expansion, network/TLS test, load test, or restore was run against a live cluster. Rendering does not establish runtime readiness or durability.
- Changes preserve the existing sections and writing style; only technical corrections and necessary clarifications were made.
