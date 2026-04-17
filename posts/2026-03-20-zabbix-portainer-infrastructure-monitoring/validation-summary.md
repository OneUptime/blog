# Validation Summary: How to Deploy Zabbix via Portainer for Infrastructure Monitoring

## Status
validated

## Post Type
Tutorial / Step-by-step deployment guide

## Technologies Covered
- Zabbix 7.0 (Server, Web Frontend, Agent2, Java Gateway)
- Portainer (CE/BE)
- Docker / Docker Compose
- PostgreSQL 15 (Alpine)
- Ubuntu/Debian package management (apt, dpkg)
- systemd
- SMTP / Email alerting

## Sources Consulted
- Zabbix 7.0 official documentation — Data Collection > Hosts: https://www.zabbix.com/documentation/7.0/en/manual/web_interface/frontend_sections/data_collection/hosts
- Zabbix Docker images repository: https://github.com/zabbix/zabbix-docker
- Zabbix Ubuntu repository (verified package URL returns HTTP 200): https://repo.zabbix.com/zabbix/7.0/ubuntu/pool/main/z/zabbix-release/
- Zabbix download portal: https://www.zabbix.com/download

## Issues Found
No technical issues found.

Verifications performed:
- Docker image tags (`zabbix/zabbix-server-pgsql:alpine-7.0-latest`, `zabbix-web-nginx-pgsql`, `zabbix-agent2`, `zabbix-java-gateway`) are valid and current for Zabbix 7.0 LTS.
- Environment variables (`ZBX_JAVAGATEWAY_ENABLE`, `ZBX_STARTJAVAPOLLERS`, `ZBX_SERVER_HOST`, `DB_SERVER_HOST`, `PHP_TZ`, `ZBX_HOSTNAME`, `ZBX_CACHESIZE`, `ZBX_HISTORYCACHESIZE`, `ZBX_STARTPOLLERS`, `ZBX_STARTPINGERS`, `ZBX_STARTDISCOVERERS`) match the documented zabbix-docker variables.
- The `ZBX_JAVAGATEWAY` host defaults to `zabbix-java-gateway`, which matches the container name in the stack — no override needed.
- Default credentials (`Admin`/`zabbix`) and trapper port (`10051`) are correct.
- Zabbix 7.0 menu paths are accurate (notably the renamed "Data Collection" section that replaced "Configuration" in earlier versions); "Alerts > Media types", "Alerts > Actions > Trigger actions" are valid.
- Ubuntu 22.04 package URL `zabbix-release_7.0-1+ubuntu22.04_all.deb` was confirmed reachable (HTTP 200).
- Agent2 host volume mounts (`/var/run/docker.sock`, `/proc`, `/sys`) and config file path (`/etc/zabbix/zabbix_agent2.conf`) and systemd unit name (`zabbix-agent2`) are correct.
- PostgreSQL healthcheck syntax (`pg_isready -U zabbix`) is valid.

## Review Notes
- The Compose `version: "3.8"` field is deprecated in the modern Compose Spec but remains accepted by Docker Compose for backward compatibility — not an error.
- The Zabbix repo now also publishes a `zabbix-release_latest_7.0+ubuntu22.04_all.deb` alias which would auto-track future point releases; the pinned `7.0-1` URL still works but readers may wish to use the `latest` alias for maintenance.
- Running the agent with `privileged: true` is broader than strictly required for standard host metrics; readers in security-sensitive environments may prefer narrower capability grants, but it is functionally correct as written.
- Port 8443 is exposed for HTTPS but no TLS certs are mounted; serving HTTPS would require additional configuration of the web container's SSL settings.
