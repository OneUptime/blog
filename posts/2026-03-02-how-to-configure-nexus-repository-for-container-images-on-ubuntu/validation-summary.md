# Validation Summary: How to Configure Nexus Repository for Container Images on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- Sonatype Nexus Repository
- Docker and OCI container images
- Docker Engine daemon configuration
- systemd
- Nginx reverse proxy
- Let's Encrypt/Certbot

## Sources Consulted
- Sonatype Nexus Repository System Requirements: https://help.sonatype.com/en/sonatype-nexus-repository-system-requirements.html
- Sonatype Nexus Repository Download: https://help.sonatype.com/en/download.html
- Sonatype Install Self-Hosted Nexus Repository: https://help.sonatype.com/en/install-nexus-repository.html
- Sonatype Run as a Service: https://help.sonatype.com/en/run-as-a-service.html
- Sonatype Configuring the Runtime Environment: https://help.sonatype.com/en/configuring-the-runtime-environment.html
- Sonatype Nexus Repository Memory Overview: https://help.sonatype.com/en/nexus-repository-memory-overview.html
- Sonatype Docker Registry documentation: https://help.sonatype.com/en/docker-registry.html
- Sonatype Proxy Repository for Docker: https://help.sonatype.com/en/proxy-repository-for-docker.html
- Sonatype Docker Reverse Proxy Strategies: https://help.sonatype.com/en/docker-repository-reverse-proxy-strategies.html
- Sonatype Cleanup Policies: https://help.sonatype.com/en/cleanup-policies.html
- Sonatype Tasks reference: https://help.sonatype.com/en/tasks.html
- Docker daemon configuration overview: https://docs.docker.com/engine/daemon/
- Docker dockerd insecure registries reference: https://docs.docker.com/reference/cli/dockerd/

## Issues Found
- The post said Nexus required Java 11 or 17 and installed OpenJDK 17. Current Nexus Repository requires Java 21 for external JVM use, and current official archives bundle the recommended Java runtime, so the requirements and Java installation instructions were updated.
- The download section claimed to download the latest Nexus OSS version but used the stale `3.63.0-01` Unix archive naming. It was updated to the current Nexus Repository Community Edition `3.92.2-01` Linux x86-64 archive URL and filename.
- The extraction command did not include Sonatype's recommended `--keep-directory-symlink` option for archive extraction. The tar command was updated.
- The ownership command targeted the `/opt/nexus` symlink instead of the extracted application directory. It now changes ownership of `/opt/nexus-${VERSION}` and `/opt/sonatype-work`.
- The JVM memory example used `-Xms2g` and `-Xmx2g`, below Sonatype's current minimum heap guidance. It was updated to the documented 8GB-host example of `-Xms4g`, `-Xmx4g`, and `-XX:MaxDirectMemorySize=2g`, and the current documented JVM options were completed.
- The systemd service timeout used `TimeoutStopSec=60`; Sonatype's current systemd example uses `TimeoutSec=600`, so the service example was aligned.
- The cleanup section suggested only Docker incomplete-upload cleanup and blob store compaction. It now includes the cleanup-policy task and Docker unused-manifest/image cleanup task needed for Docker repository cleanup.

## Review Notes
The tutorial still uses Docker port connectors, which remain supported for self-hosted Nexus Repository but are described by Sonatype as the legacy routing method. Current Nexus also supports path-based routing, which may be worth covering in a future revision.
