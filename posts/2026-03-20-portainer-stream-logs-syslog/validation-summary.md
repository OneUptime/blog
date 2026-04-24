# Validation Summary: How to Stream Portainer Logs to Syslog

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Portainer
- Docker Engine logging drivers (`syslog`, `fluentd`)
- Docker Compose
- Syslog / RFC 5424
- Fluentd

## Sources Consulted
- Docker Docs: View container logs — https://docs.docker.com/engine/logging/
- Docker Docs: Syslog logging driver — https://docs.docker.com/engine/logging/drivers/syslog/
- Docker Docs: Fluentd logging driver — https://docs.docker.com/engine/logging/drivers/fluentd/
- Docker Docs: Services top-level element (`logging`) — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs: CLI configuration options — https://docs.portainer.io/advanced/cli
- Portainer Docs: Stream auth and activity logs to an external provider — https://docs.portainer.io/sts/advanced/siem
- Portainer Docs: Install Portainer CE with Docker on Linux — https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Docs: How can I get the logs for Portainer itself? — https://docs.portainer.io/sts/faqs/troubleshooting/logs-errors-and-debugging/how-can-i-get-the-logs-for-portainer-itself

## Issues Found
- The multiline `docker run` examples contained shell comments in positions that broke line continuation in `bash`. I removed those comments so the commands are executable as written.
- The first syslog example used `--log-opt syslog-severity=info`, but Docker's `syslog` logging driver does not support a `syslog-severity` option. I removed it and kept only documented `syslog` driver options.
- Several examples published only port `9000` or published no ports at all. Current Portainer CE installation guidance publishes `9443` for the UI and `8000` for the tunnel server, while `9000` is legacy HTTP only. I updated the examples to use the current published ports.
- The post implied Docker log-driver forwarding covers Portainer authentication/activity audit logging. Docker logging drivers forward container `STDOUT`/`STDERR`; Portainer's separate `--syslog-*` feature is the documented mechanism for streaming auth and activity logs. I corrected the introductory explanation to make that distinction explicit.
- The Compose example used the obsolete top-level `version` field. I removed it to align the snippet with the current Compose Specification.
- The Compose and `docker run` examples passed unnecessary `--log-level INFO` flags and the sample queries assumed undocumented Portainer-specific message strings. I removed the `--log-level` flags and replaced the queries with conservative tag-based filters that match the configured logging examples.

## Review Notes
- Portainer's current SIEM documentation has an internal naming inconsistency: the flag table documents `--syslog-address`, while the example command uses `--syslog-addr`. Because of that, the post now references Portainer's `--syslog-*` audit-log streaming feature generically rather than prescribing a specific flag spelling outside Docker log-driver examples.
