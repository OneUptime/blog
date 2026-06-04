# Validation Summary: How to Mount ConfigMaps as Volumes with subPath for Single File Updates

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ConfigMaps
- Kubernetes Secrets
- Kubernetes volumes and `subPath`
- Kubernetes Deployments and StatefulSets
- NGINX Docker image configuration
- Redis Docker image configuration
- PostgreSQL configuration
- Stakater Reloader

## Sources Consulted
- Kubernetes Volumes documentation: https://kubernetes.io/docs/concepts/storage/volumes/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes ConfigMap update tutorial: https://kubernetes.io/docs/tutorials/configuration/updating-configuration-via-a-configmap/
- Kubernetes immutable ConfigMaps documentation: https://kubernetes.io/docs/concepts/configuration/configmap/#configmap-immutable
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- NGINX Docker Official Image documentation: https://hub.docker.com/_/nginx
- Redis Docker Official Image documentation: https://hub.docker.com/_/redis
- PostgreSQL Docker Official Image documentation: https://hub.docker.com/_/postgres
- PostgreSQL server configuration documentation: https://www.postgresql.org/docs/current/config-setting.html
- Stakater Reloader annotation reference: https://docs.stakater.com/reloader/latest/reference/annotations.html

## Issues Found
- Several `apps/v1` Deployment examples omitted `.spec.selector` and matching `.spec.template.metadata.labels`. Added selectors and template labels because Kubernetes requires them and rejects Deployments where they are absent or do not match.
- The initial NGINX `nginx.conf` example placed a `server` block at the top level. Updated it to a valid minimal NGINX configuration with `events {}` and `http { ... }`.
- The Redis example used `/etc/redis/redis.conf`, which is not the documented custom configuration path for the Redis Docker Official Image. Updated the command, mount path, and explanatory text to use `/usr/local/etc/redis/redis.conf`.
- The PostgreSQL example implied that PostgreSQL automatically reads `/etc/postgresql/conf.d/`. Added a main `postgresql.conf` with `include_dir = '/etc/postgresql/conf.d'`, mounted it with `subPath`, configured the container to use it, and updated the explanation to state that the directory is read when included by the main config file.
- Removed PostgreSQL log collector settings that could require a writable `/var/log/postgresql` directory not created by the example.

## Review Notes
The core `subPath` behavior and update limitation are correct: Kubernetes documents that ConfigMap and Secret volumes mounted with `subPath` do not receive automatic updates. YAML snippets were parsed locally with PyYAML after edits.
