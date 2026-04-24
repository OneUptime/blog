# Validation Summary: How to Monitor Disk Space per Volume in Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer
- Docker Engine
- Docker volumes
- Bash
- `du` and `df`
- Prometheus
- cAdvisor
- Alertmanager

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer API access token guidance: https://docs.portainer.io/2.21/api/access
- Portainer Docker volumes documentation: https://docs.portainer.io/user/docker/volumes
- Portainer roles documentation: https://docs.portainer.io/sts/admin/user/roles
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker `docker system df` CLI reference: https://docs.docker.com/reference/cli/docker/system/df/
- Docker volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Docker Engine API schema (`GET /system/df`, `Volume`, `UsageData`): https://raw.githubusercontent.com/moby/moby/master/api/swagger.yaml
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- cAdvisor Prometheus metric labels implementation: https://raw.githubusercontent.com/google/cadvisor/master/metrics/prometheus.go
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/

## Issues Found
- The introduction overstated Portainer’s built-in disk-usage visibility. I changed it to say Portainer helps inspect volume metadata and attachments, because Portainer’s UI docs do not document a native per-volume usage column.
- The container-console example used `df -h /data` as though it measured per-volume usage. `df` reports backing filesystem capacity/usage, not the size of the mounted path itself, so I changed the main example to `du -sh /data` and kept `df -h /data` as an optional filesystem-capacity check.
- The API automation examples used a JWT token for ongoing monitoring. Portainer documents access tokens for API use and JWTs expire after a limited lifetime, so I switched the recurring examples to `X-API-Key` with a Portainer access token.
- The host-level example assumed Docker volumes always live under `/var/lib/docker/volumes`. I replaced that with `docker volume inspect -f '{{ .Mountpoint }}'` so the commands use the mountpoint Docker reports instead of assuming the default data root.
- The Prometheus section incorrectly implied cAdvisor exposes a Docker-volume label with `container_fs_usage_bytes{volume!=""}`. cAdvisor’s published metric implementation shows these filesystem metrics are keyed by `device`, not Docker volume name, so I rewrote the section to describe exporting a custom per-volume metric and alerting on that.
- The prerequisites mentioned “operator-level access” even though the post also targets Portainer CE, where that RBAC role is not generally applicable. I changed the wording to generic required permissions.

## Review Notes
- `UsageData.Size` is documented in the Docker Engine `/system/df` response and is available when Portainer proxies Docker API requests through `/api/endpoints/{id}/docker/...`.
- The corrected Prometheus rule intentionally uses a custom metric name (`docker_volume_usage_bytes`); readers still need an exporter or collection pipeline that emits that metric.
- Docker CLI was not available in the local review environment, so Docker-specific commands were validated against official Docker and Portainer documentation rather than executed locally.
