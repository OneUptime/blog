# Validation Summary: How to Forward Container Logs to Syslog via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Engine logging drivers
- Docker Compose / Portainer stack syntax
- Syslog
- rsyslog
- OpenSSL

## Sources Consulted
- Docker Docs: Syslog logging driver - https://docs.docker.com/engine/logging/drivers/syslog/
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: Customize log driver output - https://docs.docker.com/engine/logging/log_tags/
- Docker Docs: Define services in Docker Compose (`services.logging`) - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Version and name top-level elements (`version` is obsolete) - https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs: How Relative Path Support works in Portainer - https://docs.portainer.io/sts/advanced-topics/relative-paths
- rsyslog Docs: Using Rsyslog Docker Containers - https://docs.rsyslog.com/doc/installation/rsyslog_docker.html
- rsyslog Docs: rsyslog/rsyslog-collector - https://docs.rsyslog.com/doc/containers/collector.html
- rsyslog Docs: Development and Historical Images - https://docs.rsyslog.com/doc/containers/development_images.html
- rsyslog Docs: dynaFile - https://docs.rsyslog.com/doc/reference/parameters/omfile-dynafile.html

## Issues Found
- The Compose examples used the top-level `version` field. Docker now documents that field as obsolete, so I removed it from both YAML snippets.
- The syslog options table said `rfc5424` was the default `syslog-format`. Docker documents the default as `local`, and it also supports `rfc5424micro`, so I corrected that row and clarified how `tag` is used.
- The rsyslog deployment example used `rsyslog/syslog_appliance_alpine:latest`, which rsyslog now documents as historical/discontinued. I replaced it with the current official `rsyslog/rsyslog-collector:latest` image.
- The Portainer stack example mounted `./rsyslog.conf`, but Portainer relative-path bind mounts are only supported in specific Business Edition Git-based deployments. I changed the example to use an absolute host path and the correct in-container path `/etc/rsyslog.conf`.
- The rsyslog stack declared an external network without showing that it had been created first. That would cause deployment failures in common setups, so I removed the unnecessary network block from the example.
- The `dynaFile` template used `%programname%` directly even though the article’s Docker `tag` values contain `/`. I changed it to `secpath-replace` so file paths are generated safely and predictably.
- The fallback section referenced `syslog-async`, which is not a valid Docker syslog logging option. I replaced it with Docker’s documented `mode: "non-blocking"` and `max-buffer-size`.
- The TLS example generated `syslog.crt` but referenced `syslog-ca.pem`. I aligned the config example with the generated certificate filename.

## Review Notes
- The post is technically relevant and, after the above corrections, accurate against current Docker, Portainer, and rsyslog documentation as of 2026-04-24.
- The TLS section only configures Docker’s sender side. A real deployment also needs a matching TLS listener configuration on the receiving syslog server.
- For production use, pin a specific `rsyslog/rsyslog-collector` image tag instead of relying on `:latest`.
