# Validation Summary: How to Set Up Database Operators in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (Apps & Marketplace)
- Kubernetes Operators / Operator pattern
- CloudNativePG (PostgreSQL operator, CNCF Sandbox)
- Helm 3
- Percona XtraDB Cluster Operator (MySQL/Galera)
- Zalando Postgres Operator (mentioned)
- MongoDB Community Operator (mentioned)
- Longhorn (referenced as a StorageClass)
- Barman / S3 backup configuration via CNPG

## Sources Consulted
- CloudNativePG installation docs: https://cloudnative-pg.io/docs/devel/installation_upgrade/
- CloudNativePG Helm charts repo: https://github.com/cloudnative-pg/charts
- Rancher Apps & Marketplace docs (Helm-based): https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/helm-charts-in-rancher
- Rancher charts repo: https://github.com/rancher/charts
- Percona XtraDB Cluster Operator install docs: https://docs.percona.com/percona-operator-for-mysql/pxc/kubernetes.html
- Percona XtraDB Cluster Operator GitHub bundle.yaml: https://github.com/percona/percona-xtradb-cluster-operator/blob/main/deploy/bundle.yaml
- Operator Lifecycle Manager: https://olm.operatorframework.io/

## Issues Found
1. **Incorrect claim that Rancher's Apps & Marketplace integrates with OLM.**
   - What was wrong: The post stated "Rancher's Apps & Marketplace integrates with OLM (Operator Lifecycle Manager)." This is inaccurate. Rancher Apps & Marketplace (introduced in Rancher 2.5, renamed to "Apps" in 2.6.5+) is built on Helm 3 and consumes Helm chart repositories (HTTP, Git, OCI). It does not use OLM, which is a separate operator-management framework primarily associated with OpenShift/OKD.
   - What I changed: Replaced the sentence with an accurate description: "Rancher's Apps & Marketplace is built on Helm 3 and provides a curated catalog of charts you can install graphically with version management. Navigate to **Apps > Charts** in the Rancher UI and search for your database operator's Helm chart to install it."
   - Why: Confirmed against the official Rancher documentation and the rancher/charts repository description, both of which describe the system as Helm-based with no OLM integration.

2. **Missing `--server-side` flag on the Percona PXC bundle install.**
   - What was wrong: The command `kubectl apply -f .../deploy/bundle.yaml` will commonly fail with the bundle.yaml on `main` because the bundled CRDs exceed the client-side apply annotation size limit (kubectl prints "metadata.annotations: Too long: must have at most 262144 bytes").
   - What I changed: Added `--server-side` so the command becomes `kubectl apply --server-side -f .../deploy/bundle.yaml --namespace databases`.
   - Why: The official Percona documentation explicitly recommends `kubectl apply --server-side -f deploy/bundle.yaml` as the simplified single-command install path.

## Review Notes
- The CloudNativePG Helm repo URL (`https://cloudnative-pg.github.io/charts`), chart name (`cnpg/cloudnative-pg`), and default namespace (`cnpg-system`) are correct and match official docs.
- The `Cluster` custom resource (apiVersion `postgresql.cnpg.io/v1`, fields `instances`, `storage`, `postgresql.parameters`, `bootstrap.initdb` with `secret.name`, and `backup.barmanObjectStore` with `s3Credentials`) is valid CNPG schema.
- "CNCF sandbox operator" is correct: CloudNativePG was accepted into the CNCF Sandbox in January 2025.
- Percona XtraDB Cluster does provide synchronous multi-primary (multi-master) replication via Galera, so the "multi-primary replication" description is accurate.
- The post pins the Percona bundle to `main`, which moves over time. For production guides, pinning to a tagged release (e.g. `v1.19.1`) is safer; this is a stylistic suggestion, not a technical error.
- `kubectl get crd | grep postgresql` will match CNPG CRDs (`clusters.postgresql.cnpg.io`, `backups.postgresql.cnpg.io`, etc.) — correct.
- Minor stylistic issue (not fixed, since not a technical error): "version upgrades-tasks that are error-prone" in the introduction uses a hyphen where an em-dash or comma would read more cleanly.
