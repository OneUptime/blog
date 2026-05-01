# Validation Summary: How to Deploy WordPress on Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Helm
- WordPress
- MariaDB
- Longhorn
- Ingress
- Persistent Volumes
- CronJob backups

## Sources Consulted
- Bitnami WordPress chart README: https://github.com/bitnami/charts/blob/main/bitnami/wordpress/README.md
- Bitnami WordPress chart values: https://github.com/bitnami/charts/blob/main/bitnami/wordpress/values.yaml
- Bitnami WordPress deployment template: https://github.com/bitnami/charts/blob/main/bitnami/wordpress/templates/deployment.yaml
- Bitnami MariaDB chart values: https://github.com/bitnami/charts/blob/main/bitnami/mariadb/values.yaml
- Bitnami MariaDB service template: https://github.com/bitnami/charts/blob/main/bitnami/mariadb/templates/primary/svc.yaml
- Bitnami WordPress container README: https://github.com/bitnami/containers/blob/main/bitnami/wordpress/README.md
- Helm OCI registry docs: https://helm.sh/docs/v3/topics/registries/
- Kubernetes Persistent Volumes docs: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes CronJob docs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Longhorn RWX volume docs: https://longhorn.io/docs/latest/nodes-and-volumes/volumes/rwx-volumes/

## Issues Found
- The post used the legacy `helm repo add bitnami ...` flow, while the current Bitnami WordPress chart documentation installs from Bitnami's OCI registry. I updated the install command to `oci://registry-1.docker.io/bitnamicharts/wordpress`.
- The values file set `replicaCount: 2` without shared RWX storage. Bitnami's chart documentation states that `ReadWriteMany` PVCs are required when `replicaCount > 1`. I added `persistence.accessModes: [ReadWriteMany]` and updated the media-storage guidance and conclusion to match.
- The Kubernetes-specific WordPress config used `extraEnvVars` for settings that are first-class chart values, and it used `WORDPRESS_SKIP_INSTALL`, while the current chart maps `wordpressSkipInstall` to `WORDPRESS_SKIP_BOOTSTRAP`. I replaced that snippet with the chart-supported `wordpressTablePrefix`, `wordpressScheme`, `wordpressExtraConfigContent`, and the documented reverse-proxy env var `WORDPRESS_ENABLE_REVERSE_PROXY`.
- The backup CronJob piped `mysqldump` output to `aws s3 cp` from a MariaDB image and used the floating `bitnami/mariadb:latest` tag. That example was not reproducible as written. I changed it to a versioned MariaDB image and a PVC-backed backup target so the manifest only depends on components shown in the post.
- The description claimed autoscaling, but the article did not configure HPA. I narrowed the description so it matches the actual content.

## Review Notes
- The Bitnami WordPress chart does support HPA through `autoscaling.*`, but this post does not configure it.
- The examples still use inline application and database passwords for brevity. In a production Rancher or Kubernetes deployment, those values should come from Secrets rather than being committed in plaintext.
