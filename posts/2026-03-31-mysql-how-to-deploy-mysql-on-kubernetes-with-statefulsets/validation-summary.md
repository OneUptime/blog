# Validation Summary: How to Deploy MySQL on Kubernetes with StatefulSets

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Kubernetes (v1.21+)
- StatefulSets
- Headless Services
- PersistentVolumeClaims
- ConfigMaps and Secrets

## Sources Consulted
- Kubernetes StatefulSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/
- Kubernetes probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes variable expansion documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/
- Official MySQL Docker image documentation: https://hub.docker.com/_/mysql
- MySQL 8.0 server system variables reference: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html

## Issues Found
- **Readiness probe environment variable expansion**: The readiness probe used `$(MYSQL_ROOT_PASSWORD)` in the exec command array. Kubernetes only performs `$(VAR_NAME)` variable substitution in a container's `command`, `args`, and `env[].value` fields — not in probe exec commands. The literal string `-p$(MYSQL_ROOT_PASSWORD)` would be passed to `mysql`, causing the readiness probe to always fail. Fixed by wrapping the command in `/bin/sh -c` so the shell performs environment variable expansion (`${MYSQL_ROOT_PASSWORD}`).

## Review Notes
- The `storageClassName: standard` assumes a StorageClass named "standard" exists. While common on many clusters (e.g., GKE), this is not universal. The prerequisites section correctly notes a StorageClass is needed, but users on other platforms may need to adjust this value or omit it to use their cluster's default.
- The `slow_query_log_file` is set to `/var/log/mysql/slow.log`, but the `/var/log/mysql/` directory may not exist in the official `mysql:8.0` Docker image. MySQL will log a warning and skip enabling the slow query log if it cannot open the file. An init container or a modified entrypoint to create this directory would be needed in practice.
- The post covers a single-instance MySQL deployment. For production multi-replica setups, additional configuration for replication would be required, which is correctly outside the scope of this tutorial.
