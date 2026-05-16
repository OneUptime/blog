# Validation Summary: How to Deploy Ghost CMS on Talos Linux

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Ghost CMS 5 (Node.js publishing platform)
- Talos Linux
- Kubernetes (Deployment, StatefulSet, Service, Ingress, PVC, CronJob, Job, Secret, Namespace)
- MySQL 8.0
- Nginx Ingress Controller
- cert-manager (Let's Encrypt)
- Alpine Linux 3.19
- Nodemailer (Ghost's mail transport via SMTP)

## Sources Consulted
- Ghost official Docker image documentation (https://hub.docker.com/_/ghost) — verified `ghost:5-alpine` tag and `/var/lib/ghost/content` content path, container port 2368
- Ghost configuration reference (https://ghost.org/docs/config/) — verified env var naming convention with `__` double-underscore for nested keys (`database__client`, `database__connection__*`, `mail__transport`, `mail__options__*`, `mail__from`)
- Ghost Admin API reference (https://ghost.org/docs/admin-api/) — verified that Ghost 5 standardized on the unversioned `/ghost/api/admin/...` URL pattern (versioned `/v3/`, `/v4/` URLs were deprecated)
- MySQL 8.0 official image documentation (https://hub.docker.com/_/mysql) — verified `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD` env vars and `/var/lib/mysql` data path
- Kubernetes Ingress v1 API reference (networking.k8s.io/v1) — verified `ingressClassName`, `pathType`, `tls`, and backend service spec
- ingress-nginx annotations reference — verified `nginx.ingress.kubernetes.io/proxy-body-size` and `nginx.ingress.kubernetes.io/ssl-redirect`
- cert-manager documentation — verified `cert-manager.io/cluster-issuer` annotation
- Node.js documentation — verified `NODE_OPTIONS=--max-old-space-size` flag
- mysqldump documentation — verified `-p$DB_PASSWORD` (no space) and `--single-transaction` usage

## Issues Found
1. **Incomplete `kubectl apply` commands in Step 1.** The YAML block in Step 1 used file-name comments (`# ghost-namespace.yaml`, `# ghost-db-secret.yaml`, `# ghost-mysql.yaml`) to signal three separate manifests, but the bash block only ran `kubectl apply -f ghost-namespace.yaml`. Following the post as written would create the namespace but never apply the DB credentials Secret or MySQL StatefulSet, so Ghost would never come up. Added `kubectl apply -f ghost-db-secret.yaml` and `kubectl apply -f ghost-mysql.yaml`.

2. **Deprecated Ghost API path in liveness/readiness probes.** The probes referenced `/ghost/api/v4/admin/site/`, but the deployment pulls `ghost:5-alpine`. Ghost 5 standardized on the unversioned `/ghost/api/admin/...` URL pattern (the versioned `/v3/`, `/v4/` URLs were removed/deprecated). Updated both probe paths to `/ghost/api/admin/site/`, which is the correct public, unauthenticated bootstrap endpoint and returns HTTP 200 with basic site info.

## Review Notes
- The Ghost env-var naming with `__` (double underscore) for nested config keys is correct and matches Ghost's [knex-style config loader](https://ghost.org/docs/config/#running-ghost-with-config-env-variables).
- `mail__transport: "SMTP"` is correct (Ghost is case-insensitive here; both `SMTP` and `smtp` work via Nodemailer).
- The MySQL container has a memory limit but no CPU limit — that's a valid and intentional pattern in Kubernetes (CPU is compressible), so left as-is.
- The two-container backup CronJob runs `db-backup` and `content-backup` in parallel, both writing to the same `/backups` mount. That's fine because the filenames are distinct (`ghost-db-*.sql` vs `ghost-content-*.tar.gz`).
- The `tar` content-backup mounts `ghost-content` as `readOnly: true`, which is the right safety choice since `tar` only reads.
- The post does not show creating the `ghost-backup-pvc` PVC referenced by the backup CronJob — readers will need to create that separately. Not a technical error but worth noting for future revisions.
- The post does not show creating the StorageClass `local-path` — assumes the cluster already has one (the Prerequisites do mention a StorageClass exists).
- The `--max-old-space-size=256` value pairs reasonably with the 512Mi memory limit (leaves headroom for V8 overhead and native allocations).
