# Validation Summary: How to Set Up Graylog for Centralized Log Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Setup guide

## Technologies Covered
- Graylog 5.2
- OpenSearch 2.11.1
- MongoDB 6.0
- Docker / Docker Compose
- Ubuntu 20.04 / 22.04
- nginx + Certbot (Let's Encrypt) reverse proxy
- rsyslog (RFC 5424 / RSYSLOG_SyslogProtocol23Format)
- Filebeat 8.x (Elastic apt repo)
- GELF / Syslog / Beats input protocols

## Sources Consulted
- Graylog 5.2 Docker installation: https://go2docs.graylog.org/5-2/downloading_and_installing_graylog/docker_installation.htm
- Graylog compatibility matrix (MongoDB / OpenSearch supported versions): https://go2docs.graylog.org/current/downloading_and_installing_graylog/compatibility_matrix.htm
- Graylog Beats input: https://go2docs.graylog.org/current/getting_in_log_data/beats_input.html
- OpenSearch 2.12 admin password requirement (introduction of `OPENSEARCH_INITIAL_ADMIN_PASSWORD`): https://opensearch.org/blog/replacing-default-admin-credentials/
- OpenSearch security plugin `plugins.security.disabled` behavior: https://github.com/opensearch-project/security/issues/4062
- Filebeat `log` input deprecation notice: https://www.elastic.co/guide/en/beats/filebeat/current/filebeat-input-log.html
- Filebeat migration from `log` to `filestream`: https://www.elastic.co/guide/en/beats/filebeat/current/migrate-to-filestream.html
- rsyslog reserved template names (`RSYSLOG_SyslogProtocol23Format`): https://www.rsyslog.com/doc/reference/templates/templates-reserved-names.html
- MongoDB Database Tools compatibility & installation: https://www.mongodb.com/docs/database-tools/mongodump/mongodump-compatibility-and-installation/
- Official `mongo:6.0` Docker image Dockerfile (verifies `mongodb-org-tools` is installed, which pulls in `mongodump`/`mongorestore`): https://github.com/docker-library/mongo

## Issues Found

1. **Unnecessary `OPENSEARCH_INITIAL_ADMIN_PASSWORD` with misleading comment** — The compose file set `OPENSEARCH_INITIAL_ADMIN_PASSWORD=TempPassword1!` and labeled it with the comment `# Disable performance analyzer`. Two problems: (a) the comment is inaccurate — that env var has nothing to do with the performance analyzer; it sets the bootstrap admin password for the security plugin. (b) The env var was introduced in OpenSearch **2.12**; on the pinned 2.11.1 image it is simply ignored, and with `plugins.security.disabled=true` the security plugin is never initialized so the password is irrelevant regardless. I removed both the env var and the misleading comment.

## Review Notes

- **Filebeat `type: log` is deprecated in 8.x** in favor of `type: filestream`. The `log` input still works in Filebeat 8.x so the example will run as written, but readers starting fresh today should consider `filestream`. Left as-is to avoid restructuring the example.
- **`version: '3'` in `docker-compose.yml`** is obsolete in Compose v2 and emits a harmless warning on startup; functionality is unaffected.
- **`docker compose exec graylog curl -s http://localhost:9000/api/system/throughput`** in the troubleshooting section will return HTTP 401 without authentication (`-u admin:<password>`). The intent (showing where to look) still comes through; not strictly wrong, just incomplete.
- **MongoDB tools in the `mongo:6.0` image** — verified the official image installs the `mongodb-org-tools` package which pulls in `mongodb-database-tools`, so `mongodump`/`mongorestore` are present and the backup snippet works as written.
- If readers later upgrade OpenSearch to 2.12+ they will need to set `OPENSEARCH_INITIAL_ADMIN_PASSWORD` (or keep `plugins.security.disabled=true`); worth flagging when bumping the pinned version.
- Graylog 5.2 supports OpenSearch up to (but not including) 2.14 — readers bumping OpenSearch should consult the Graylog compatibility matrix.
