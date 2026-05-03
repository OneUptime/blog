# Validation Summary: How to Deploy CockroachDB on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- CockroachDB (distributed SQL database)
- Rancher (Kubernetes management)
- Kubernetes (StatefulSets, PersistentVolumes, Services)
- Helm (package manager)
- TLS/PKI (inter-node and client encryption)
- Longhorn (StorageClass example)

## Sources Consulted
- CockroachDB Helm chart values reference: https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb/values.yaml
- CockroachDB Helm chart init job template: https://github.com/cockroachdb/helm-charts/blob/master/cockroachdb/templates/job.init.yaml
- CockroachDB official Kubernetes deployment docs: https://www.cockroachlabs.com/docs/stable/deploy-cockroachdb-with-kubernetes
- CockroachDB SQL client docs: https://www.cockroachlabs.com/docs/stable/cockroach-sql

## Issues Found
1. **Step 5 — manual init job is wrong.** The post instructed users to run `kubectl create -f https://raw.githubusercontent.com/cockroachdb/helm-charts/master/cockroachdb/templates/job.init.yaml`. That URL points to a Helm template containing `{{ .Values }}` directives, so applying it directly with `kubectl create -f` would fail. Additionally, the chart already includes a `helm.sh/hook: post-install,post-upgrade` Job (`<release>-init`) that initializes the cluster automatically when `statefulset.replicas > 1`. Replaced the manual command with a verification step that checks the auto-created init job's status and logs.
2. **Step 6 — wrong scheme for the Admin UI URL.** TLS was enabled in the values file, so the DB Console listens on HTTPS, not HTTP. Changed `http://localhost:8080` to `https://localhost:8080` and added a parenthetical note.
3. **Step 7 — `--insecure` flag contradicts TLS.** The `cockroach sql --insecure` command would fail against a TLS-enabled cluster. Replaced with `--certs-dir=/cockroach/cockroach-certs --host=cockroachdb-public`, which uses the certificates already mounted into the StatefulSet pods by the chart.

## Review Notes
- The `helm repo add cockroachdb https://charts.cockroachdb.com/` URL is correct.
- The `storage.persistentVolume`, `tls.enabled`, `conf.cache`, `conf.max-sql-memory`, and `statefulset.replicas` keys all match the upstream chart's value schema.
- The browser will display a certificate warning when visiting the DB Console because the chart provisions self-signed certificates by default; users may want to integrate with cert-manager or supply their own CA for production use.
- After creating the SQL user with a password, granting privileges via `GRANT ALL ON DATABASE` works but the more idiomatic modern CockroachDB pattern is to grant role-level privileges (e.g., `GRANT admin TO appuser` or `GRANT CONNECT ON DATABASE`). Left the original wording since it functions correctly.
- Connecting to `cockroachdb-0` works, but the official docs recommend running the secure client from a dedicated `cockroachdb-client-secure` pod for cleaner separation; the in-pod approach used here is still functionally valid.
