# Validation Summary: How to Deploy MariaDB on Rancher

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- MariaDB
- Rancher / Kubernetes
- Helm (Bitnami charts)
- kubectl
- Persistent Volume Claims / StorageClass (Longhorn referenced as example)
- Prometheus metrics exporter (chart sub-component)

## Sources Consulted
- Bitnami MariaDB Helm chart source: https://github.com/bitnami/charts/tree/main/bitnami/mariadb
- Bitnami chart `values.yaml` (auth, primary, metrics top-level keys)
- Artifact Hub Bitnami MariaDB chart page
- Kubernetes documentation for `kubectl logs`, `kubectl run`, `kubectl patch`
- Helm CLI documentation for `helm repo add` / `helm install --version`

## Issues Found
1. **Incorrect workload kind in `kubectl logs` command.** The post used `kubectl logs -n databases deployment/mariadb -f`, but the Bitnami MariaDB chart deploys MariaDB as a **StatefulSet**, not a Deployment (template path: `bitnami/charts/bitnami/mariadb/templates/primary/statefulset.yaml`). Running the original command would have failed with `error: deployments.apps "mariadb" not found`. Changed to `statefulset/mariadb`.
2. **Outdated pinned chart version.** The post pinned chart version `18.0.0`, which dates to roughly late-2023 / early-2024 and ships a much older MariaDB appVersion. The current Bitnami MariaDB chart is `23.0.1` (appVersion `12.0.2`). Updated `--version 18.0.0` to `--version 23.0.1` so the tutorial installs a current, supported chart.

## Review Notes
- The Bitnami HTTPS Helm repo (`https://charts.bitnami.com/bitnami`) still resolves and serves charts, but as of the August 2025 Bitnami Secure Images transition, Bitnami's recommended distribution is OCI (`oci://registry-1.docker.io/bitnamicharts`) and the free catalog is more restricted. A future revision could mention the OCI alternative (`helm install mariadb oci://registry-1.docker.io/bitnamicharts/mariadb`) and the implications of the legacy/secure split for production deployments.
- The values keys used (`auth.rootPassword`, `auth.database`, `auth.username`, `auth.password`, `primary.persistence.{enabled,storageClass,size}`, `primary.resources.{requests,limits}`, `metrics.enabled`) are all valid in the current chart.
- The default Service name produced by `helm install mariadb bitnami/mariadb` is `mariadb` in `standalone` architecture, so the FQDN `mariadb.databases.svc.cluster.local` used in Step 6 is correct. Note: switching the chart to `architecture: replication` would change the primary Service name to `mariadb-primary` — worth flagging if the post ever expands into HA territory.
- Resource limits (1Gi memory / 500m CPU) are reasonable for a tutorial but should be raised for any real production workload — left unchanged as a stylistic/sizing choice rather than a correctness issue.
- The `kubectl run mariadb-client` command sets `MARIADB_ROOT_PASSWORD` via env but then runs `mysql -uroot -p` (interactive prompt) — slightly redundant but functionally correct, so left as-is.
