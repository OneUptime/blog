# Validation Summary: How to Migrate Workloads from Docker Swarm to Talos Linux

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Talos Linux (talosctl)
- Kubernetes (Deployment, StatefulSet, Service, Ingress, PVC, Secret, Namespace)
- Docker Swarm (docker service, docker stack, docker secret, docker config)
- Docker Compose (Swarm-mode v3.8 schema)
- Helm (Longhorn, ingress-nginx, MetalLB)
- PostgreSQL (postgres:15 image)
- kubectl
- rsync

## Sources Consulted
- Talos Linux v1.12 CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux getting-started guide: https://docs.siderolabs.com/talos/v1.12/getting-started/talosctl
- Kubernetes StatefulSet docs: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Ingress (networking.k8s.io/v1) docs
- Longhorn Helm chart: https://charts.longhorn.io
- ingress-nginx Helm chart: https://kubernetes.github.io/ingress-nginx
- MetalLB Helm chart: https://metallb.github.io/metallb
- Docker Hub postgres image: https://hub.docker.com/_/postgres
- Docker Swarm CLI reference

## Issues Found
1. **`talosctl gen secrets -o secrets.yaml`** — the `-o` short flag is not supported by the `gen secrets` subcommand; only `--output-file` is valid. Changed to `talosctl gen secrets --output-file secrets.yaml`. (Confusingly, `gen config` uses `-o/--output`, while `gen secrets` uses `--output-file`.)
2. **`talosctl gen config ... --output-dir _out`** — the `--output-dir` flag was used in older Talos versions and has been replaced. The current flag is `-o`/`--output`. Changed to `--output _out`.

## Review Notes
- The `curl -sL https://talos.dev/install | sh` install command works and is documented by Sidero Labs, though Homebrew (`brew install siderolabs/tap/talosctl`) is the preferred method for users who want auto-updating installs. Not changed since the curl method is valid.
- The web Deployment example uses `replicas: 3` with a single `ReadWriteOnce` PVC (`app-data`). Three replicas cannot reliably share an RWO volume unless all pods land on the same node. This mirrors the Swarm semantics where each task gets a local named volume on its host, but readers should be aware that they typically want `ReadWriteMany` (Longhorn supports this) or convert `web` to a StatefulSet with per-replica PVCs. Left as-is because changing it would significantly restructure the example.
- The `postgres:15` container mounts the PVC directly at `/var/lib/postgresql/data`. With some storage backends (e.g., ext4-formatted volumes that include a `lost+found` directory at the root), postgres will refuse to initialize. A common workaround is `PGDATA=/var/lib/postgresql/data/pgdata` with the volume still mounted at the parent. Not a blocking error and not officially required by the postgres image, so left as-is.
- The StatefulSet PVC naming `db-data-db-0` used in the data-copy `kubectl run` example is correct (`<volumeClaimTemplate>-<statefulSetName>-<ordinal>`).
- MetalLB installation via Helm is correct, but readers will additionally need to create an `IPAddressPool` and `L2Advertisement` (or BGP equivalents) for LoadBalancer services to actually receive addresses. Configuration is out of scope for this migration guide.
- The Docker Compose `version: "3.8"` field is deprecated/ignored in modern Compose v2 but is still accepted for Swarm-mode files. Not changed.
