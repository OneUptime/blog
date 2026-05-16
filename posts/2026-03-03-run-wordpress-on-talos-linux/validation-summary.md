# Validation Summary: How to Run WordPress on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Talos Linux (immutable Kubernetes-focused OS)
- Kubernetes (Namespaces, Secrets, ConfigMaps, StatefulSets, Deployments, Services, PVCs, Ingress, CronJobs)
- WordPress (official Docker image, `wp-config` constants, wp-cron)
- MySQL 8.0 (official Docker image, `mysqladmin ping`, `mysqldump`)
- Redis 7.2 (Object Cache, `maxmemory` / `maxmemory-policy`)
- ingress-nginx (annotations)
- cert-manager (cluster-issuer annotation)
- PHP configuration via `conf.d/uploads.ini`

## Sources Consulted
- WordPress official Docker image documentation — https://hub.docker.com/_/wordpress (env vars: `WORDPRESS_DB_HOST`, `WORDPRESS_DB_NAME`, `WORDPRESS_DB_USER`, `WORDPRESS_DB_PASSWORD`, `WORDPRESS_TABLE_PREFIX`, `WORDPRESS_CONFIG_EXTRA`; PHP conf.d path `/usr/local/etc/php/conf.d/`)
- MySQL official Docker image documentation — https://hub.docker.com/_/mysql (env vars `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`)
- Kubernetes API reference (apps/v1 Deployment & StatefulSet, batch/v1 CronJob, networking.k8s.io/v1 Ingress) — https://kubernetes.io/docs/reference/
- Rancher local-path-provisioner README — https://github.com/rancher/local-path-provisioner (only supports `ReadWriteOnce`)
- WordPress Codex — `wp-cron.php` / `DISABLE_WP_CRON` / `DISALLOW_FILE_EDIT` / `FORCE_SSL_ADMIN` / `WP_MEMORY_LIMIT` — https://developer.wordpress.org/advanced-administration/wordpress/cron/
- ingress-nginx annotations reference — https://kubernetes.github.io/ingress-nginx/user-guide/nginx-configuration/annotations/
- cert-manager docs — https://cert-manager.io/docs/usage/ingress/
- W3Techs CMS usage statistics (WordPress ~43% of websites) — https://w3techs.com/technologies/overview/content_management
- Redis configuration directives `maxmemory` and `maxmemory-policy` — https://redis.io/docs/latest/operate/oss_and_stack/management/config/

## Issues Found
1. **`wordpress-content` PVC used `ReadWriteMany` with `storageClassName: local-path`.** The Rancher `local-path` provisioner only supports `ReadWriteOnce`, so the 2-replica WordPress Deployment sharing `/var/www/html/wp-content` would fail to bind correctly (or each pod would get its own non-shared per-node volume).
   - **Fix:** Changed `storageClassName` of the `wordpress-content` PVC to `nfs-client` (a representative RWX provisioner) and added a note in Prerequisites that an RWX-capable StorageClass (NFS, Longhorn, etc.) is required when running multiple WordPress replicas sharing `wp-content`.

## Review Notes
- The `wordpress-config` ConfigMap defines a `wp-extra-config.php` key that is never mounted into the WordPress pod — its content overlaps with `WORDPRESS_CONFIG_EXTRA` in the Deployment env. This is redundant rather than incorrect; left as written to preserve the author's structure.
- The `wordpress-backup` CronJob references a `wordpress-backup-pvc` PersistentVolumeClaim that is not defined in the post. Users must create that PVC separately. This is consistent with the section being titled "Backup Strategy" (an outline) so was not changed.
- Using readiness/liveness HTTP probes against `/wp-login.php` works because the page returns HTTP 200, but it will hit the database on every probe (potentially leaving stray sessions/log noise). A dedicated lightweight health endpoint or a `/wp-includes/images/blank.gif` static probe is often preferred in production. Not changed — not incorrect.
- The `mysqldump` command uses `-p$MYSQL_PASSWORD` (no space). This is the documented correct form; a space between `-p` and the password would prompt interactively.
- The WordPress Docker tag `wordpress:6.4-php8.2-apache` is a real, published tag. As of mid-2026 newer WordPress 6.x tags exist; the post is version-pinned to 6.4 which is fine but readers may want a newer minor release.
- Redis 7.2 is correct; Redis 7.4 is now the latest stable line but 7.2-alpine remains a valid pinned image.
- The MySQL Service is correctly defined as headless (`clusterIP: None`) for the StatefulSet pattern; the WordPress Deployment connects via `mysql.wordpress.svc.cluster.local` which resolves correctly to the single pod.
