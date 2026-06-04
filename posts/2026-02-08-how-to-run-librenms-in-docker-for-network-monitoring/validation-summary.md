# Validation Summary: How to Run LibreNMS in Docker for Network Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- LibreNMS
- Docker
- Docker Compose
- MariaDB
- Redis
- SNMP and SNMP traps
- LibreNMS alerting
- LibreNMS auto-discovery

## Sources Consulted
- LibreNMS Docker installation documentation: https://docs.librenms.org/Installation/Docker/
- LibreNMS Docker image repository and compose example: https://github.com/librenms/docker
- LibreNMS Docker environment variables and container initialization scripts: https://github.com/librenms/docker
- LibreNMS Auto-Discovery documentation: https://docs.librenms.org/Extensions/Auto-Discovery/
- LibreNMS API Alerts documentation: https://docs.librenms.org/API/Alerts/
- LibreNMS Alert Transport documentation: https://docs.librenms.org/Alerting/Transports/
- LibreNMS Slack transport documentation and implementation: https://docs.librenms.org/Alerting/Transports/Slack/
- LibreNMS `device:add` command implementation: https://github.com/librenms/librenms/blob/master/app/Console/Commands/DeviceAdd.php
- Docker Compose CLI validation with `docker compose config --quiet`

## Issues Found
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it after validating that the remaining Compose file is accepted by current Docker Compose.
- The LibreNMS container used `BASE_URL`, but the official Docker image reads `LIBRENMS_BASE_URL` and maps it into `APP_URL` and the seeded `base_url` config. Updated the environment variable.
- The Compose example mounted separate volumes at `/opt/librenms/rrd` and `/opt/librenms/logs`. The official Docker image uses `/data`, with seeded `rrd_dir: /data/rrd` and `log_dir: /data/logs`. Updated the Compose volumes, RRD backup command, log command, and production note to use the shared `/data` volume.
- The device-add examples used the old `/opt/librenms/addhost.php` positional syntax. Current LibreNMS exposes `lnms device:add` with explicit options for SNMP version, community, SNMPv3 security name, auth password, auth protocol, privacy password, and privacy protocol. Updated both SNMPv2c and SNMPv3 examples.
- The auto-discovery example appended PHP directly to `/opt/librenms/config.php` and included an unsupported `autodiscovery.snmpscan` setting. Updated it to use `lnms config:set` for documented auto-discovery settings and to run `/opt/librenms/snmp-scan.py` for SNMP scanning.
- The alert transport example used an undocumented `/api/v0/alert/transports` endpoint. Current official API routes document alert rules and templates, not transport creation. Replaced the transport creation curl with the documented web UI configuration path and kept the verified `/api/v0/rules` list example.

## Review Notes
- The final Docker Compose snippet was extracted from the post and validated successfully with `docker compose config --quiet`.
- The official LibreNMS Docker compose example also includes optional services such as `msmtpd` and `syslogng`; this post's smaller stack is still technically valid for the monitoring, dispatcher, Redis, database, and SNMP trap use case described.
