# Validation Summary: How to Deploy MySQL on Kubernetes with StatefulSet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Kubernetes (StatefulSet, Service, ConfigMap, Secret, PersistentVolumeClaim)
- kubectl CLI

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes Headless Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/#headless-services
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes `kubectl create secret` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Kubernetes variable expansion in pod fields: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Official MySQL Docker image documentation: https://hub.docker.com/_/mysql
- MySQL `mysqladmin` and client CLI documentation: https://dev.mysql.com/doc/refman/8.0/en/mysqladmin.html

## Issues Found
1. **Misleading base64 statement in Step 1**: The text stated "The value must be base64-encoded" immediately before a `kubectl create secret generic --from-literal` command. The `--from-literal` flag accepts plaintext values and kubectl handles base64 encoding automatically. The original wording could mislead readers into pre-encoding their values, resulting in double-encoded secrets. Fixed the sentence to clarify that `--from-literal` handles encoding automatically.

## Review Notes
- The readiness probe uses `$(MYSQL_ROOT_PASSWORD)` variable expansion in the exec command. Kubernetes does expand `$(VAR_NAME)` in probe exec commands, so this works correctly, but the `mysql` CLI will emit a warning about using a password on the command line. This is cosmetic and does not affect probe functionality.
- The StatefulSet uses `replicas: 1`, which is appropriate for a tutorial but the post correctly notes in Best Practices that production deployments should consider MySQL Group Replication or the MySQL Operator for high availability.
- No `storageClassName` is specified in the VolumeClaimTemplate, so it relies on the cluster's default StorageClass. This is fine for a tutorial but could be called out for production use.
- All Kubernetes YAML manifests are syntactically correct and use current stable API versions (`apps/v1`, `v1`).
- The ConfigMap mounts to `/etc/mysql/conf.d`, which is the correct path where the official MySQL Docker image reads additional `.cnf` configuration files.
- DNS naming (`mysql-0.mysql`) is correct for StatefulSet pods behind a headless service within the same namespace.
