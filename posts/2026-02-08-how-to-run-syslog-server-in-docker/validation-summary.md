# Validation Summary: How to Run Syslog Server in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker and Docker Compose
- Syslog
- rsyslog
- syslog-ng
- logrotate
- Docker syslog logging driver
- Elasticsearch forwarding from rsyslog

## Sources Consulted
- Docker Docs: Syslog logging driver: https://docs.docker.com/engine/logging/drivers/syslog/
- Docker Docs: Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs: Version top-level element is obsolete: https://docs.docker.com/reference/compose-file/version-and-name/
- rsyslog official documentation: imudp UDP input module: https://docs.rsyslog.com/doc/configuration/modules/imudp.html
- rsyslog official documentation: imtcp TCP input module: https://docs.rsyslog.com/doc/configuration/modules/imtcp.html
- rsyslog official documentation: omfile output module: https://docs.rsyslog.com/doc/configuration/modules/omfile.html
- rsyslog official documentation: omelasticsearch output module: https://docs.rsyslog.com/doc/configuration/modules/omelasticsearch.html
- rsyslog official documentation: property replacer and date/json formatting: https://www.rsyslog.com/doc/configuration/property_replacer.html
- syslog-ng OSE documentation: sources and network/syslog source options: https://syslog-ng.github.io/admin-guide/060_Sources/README.html
- syslog-ng OSE documentation: file destination options: https://syslog-ng.github.io/admin-guide/070_Destinations/040_File/000_File_destination_options.html
- RFC 5424: The Syslog Protocol: https://www.rfc-editor.org/rfc/rfc5424
- RFC 5425: TLS Transport Mapping for Syslog: https://www.rfc-editor.org/rfc/rfc5425
- RFC 3164: The BSD Syslog Protocol: https://www.rfc-editor.org/rfc/rfc3164

## Issues Found
- The Docker Compose examples used the obsolete top-level `version: "3.8"` field. Removed it from both Compose snippets because modern Compose uses the current Compose Specification and treats `version` as obsolete.
- The rsyslog and syslog-ng Compose examples exposed TCP port 6514, but the provided configurations did not configure TLS listeners. Removed the 6514 port mappings and updated the rsyslog comment so the examples no longer imply TLS is active.
- The logrotate sidecar used `alpine:3.19` but did not install `logrotate`, which is not present in the base Alpine image. Updated the command to install logrotate before running the loop.
- The logrotate configuration tried to send `HUP` to `/var/run/syslogd.pid` from a sidecar container. That PID path is not correct for rsyslog on common systems, and a sidecar cannot signal the rsyslog process without additional PID namespace configuration. Replaced the postrotate signal with `copytruncate`, which works with the shared log volume.
- The monitoring section described `rsyslogd -N1` as checking internal statistics. Corrected it to say it validates the rsyslog configuration.
- The real-time tail command referenced `/var/log/remote/all.log`, which is only created by the syslog-ng example, while the command targeted the `syslog-server` rsyslog container. Updated it to tail the rsyslog dynamic log path.

## Review Notes
- Docker image pulls for the rsyslog and syslog-ng images could not be completed because Docker Hub returned an unauthenticated pull rate-limit error. Local validation was still performed where possible.
- The edited Compose snippets were checked with `docker compose config --quiet`.
- The edited logrotate configuration was checked with `logrotate -d`.
