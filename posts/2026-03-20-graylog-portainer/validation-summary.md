# Validation Summary: How to Deploy Graylog via Portainer

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Portainer
- Docker
- Graylog
- OpenSearch
- MongoDB
- Docker GELF logging driver

## Sources Consulted
- Graylog Compatibility Matrix: https://go2docs.graylog.org/current/downloading_and_installing_graylog/compatibility_matrix.htm
- Graylog Docker Installation with Self-Managed OpenSearch: https://go2docs.graylog.org/current/downloading_and_installing_graylog/docker_installation_os.htm
- Graylog Run Graylog in Docker: https://go2docs.graylog.org/current/downloading_and_installing_graylog/docker_installation.htm
- Graylog Input Diagnosis: https://go2docs.graylog.org/current/getting_in_log_data/input_diagnosis.htm
- OpenSearch Docker documentation: https://docs.opensearch.org/2.15/install-and-configure/install-opensearch/docker/
- Docker GELF logging driver documentation: https://docs.docker.com/engine/logging/drivers/gelf/
- Portainer Add a new stack documentation: https://docs.portainer.io/user/docker/stacks/add
- Graylog Docker Compose README (official repository): https://github.com/Graylog2/docker-compose/blob/main/README.md

## Issues Found
- The post used `pwgen` to generate `GRAYLOG_PASSWORD_SECRET` without declaring or installing that utility. I replaced it with a `/dev/urandom`-based command so the command works on a standard Linux host and matches Graylog's current Docker guidance.
- The OpenSearch `2.15.0` service definition omitted settings required or recommended by the current Graylog/OpenSearch Docker guidance for this deployment pattern. I added `OPENSEARCH_INITIAL_ADMIN_PASSWORD`, `action.auto_create_index=false`, `plugins.security.ssl.http.enabled=false`, and the `nofile` ulimit settings.
- The sample mapped Syslog UDP to privileged port `514`, which Graylog documents as a common cause of `Permission denied` bind failures for inputs. I changed the mapping to `5140:5140/udp` to match Graylog's documented container-friendly port usage.

## Review Notes
- Graylog `6.0.x` remains compatible with MongoDB `6.0` and OpenSearch `2.15.x` according to the current Graylog compatibility matrix.
- Current Graylog documentation identifies Data Node as the preferred deployment path, but self-managed OpenSearch remains supported for Graylog `6.0.x`.
- The Portainer workflow in the post (`Stacks` -> `Add Stack` -> `Web Editor`) matches current Portainer documentation.
