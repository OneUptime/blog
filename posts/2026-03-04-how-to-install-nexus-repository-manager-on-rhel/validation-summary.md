# Validation Summary: How to Install Nexus Repository Manager on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Sonatype Nexus Repository Manager
- systemd
- firewalld
- Maven proxy repositories
- Nexus Repository REST API

## Sources Consulted
- Sonatype Nexus Repository System Requirements: https://help.sonatype.com/en/sonatype-nexus-repository-system-requirements.html
- Sonatype Install Self-Hosted Nexus Repository: https://help.sonatype.com/en/install-nexus-repository.html
- Sonatype Run as a Service: https://help.sonatype.com/en/run-as-a-service.html
- Sonatype Nexus Repository Download: https://help.sonatype.com/en/download.html
- Sonatype Nexus Repository 3.92.0 Release Notes: https://help.sonatype.com/en/sonatype-nexus-repository-3-92-0-release-notes.html
- Sonatype Download Archives - Repository Manager 3: https://help.sonatype.com/en/download-archives---repository-manager-3.html
- Sonatype Community 3.92.2 release announcement: https://community.sonatype.com/t/sonatype-nexus-repository-3-92-2-released/16347
- Sonatype Repositories API: https://help.sonatype.com/en/repositories-api.html
- Sonatype Maven Repositories: https://help.sonatype.com/en/maven-repositories.html
- Red Hat firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/securing_networks/using-and-configuring-firewalld_securing-networks

## Issues Found
- The post installed Java 11 and stated Java 8 or 11 was required. Current Sonatype documentation says Nexus Repository requires Java 21, and release 3.78.0 and later Linux bundles include the recommended JVM. Changed the prerequisite command to install basic tools instead of Java.
- The post downloaded Nexus 3.68.0, which is old and was superseded by 3.68.1 for a critical vulnerability fix. Updated the install commands to use the current 3.92.2 Linux x86-64 archive.
- The post created the `nexus` user with `/sbin/nologin`, but Sonatype states the Nexus Repository process user must be able to create a valid shell. Changed the shell to `/bin/bash`.

## Review Notes
The Maven proxy REST API endpoint, systemd service pattern, default port 8081, admin password file path, data directory path, and Maven Central proxy URL match Sonatype documentation. The API example uses a placeholder password and may require additional optional repository fields depending on local Nexus defaults; Sonatype recommends using the instance Swagger UI or `/service/rest/swagger.json` for exact schema details.
