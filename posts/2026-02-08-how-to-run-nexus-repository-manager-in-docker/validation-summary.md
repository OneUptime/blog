# Validation Summary: How to Run Nexus Repository Manager in Docker

## Status
validated

## Post Type
Tutorial / Deployment guide

## Technologies Covered
- Sonatype Nexus Repository
- Docker
- Docker Compose
- Maven
- npm
- Docker Registry
- PyPI / pip
- REST APIs
- Backup and monitoring

## Sources Consulted
- Sonatype Nexus Repository API Reference: https://help.sonatype.com/en/api-reference.html
- Sonatype Nexus Repository OpenAPI schema: https://sonatype.github.io/sonatype-documentation/api/nexus-repository/latest/nexus-repository-api.json
- Sonatype container deployment documentation: https://help.sonatype.com/en/cloud-deployments.html
- Sonatype Nexus Repository 3 download archive and current release notes: https://help.sonatype.com/en/download-archives---repository-manager-3.html
- Sonatype Maven repositories documentation: https://help.sonatype.com/en/maven-repositories.html
- Sonatype npm configuration documentation: https://help.sonatype.com/en/configuring-npm.html
- Sonatype PyPI repositories and client configuration documentation: https://help.sonatype.com/en/pypi-repositories.html and https://help.sonatype.com/en/configure-pypi-with-nexus.html
- Sonatype Docker registry and authentication documentation: https://help.sonatype.com/en/docker-registry.html and https://help.sonatype.com/en/docker-authentication.html
- Sonatype cleanup policies and Cleanup Policies API documentation: https://help.sonatype.com/en/cleanup-policies.html and https://help.sonatype.com/en/cleanup-policies-api.html
- Sonatype backup documentation: https://help.sonatype.com/en/configure-and-run-the-backup-task.html and https://help.sonatype.com/en/prepare-a-backup.html
- Sonatype system status API support article: https://support.sonatype.com/hc/en-us/articles/226254487-System-Status-and-Metrics-REST-API-for-Sonatype-Nexus-Repository
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/ and https://docs.docker.com/reference/compose-file/version-and-name/
- Local CLI help/version checks for Docker, Docker Compose, GNU tar, npm, and pip.

## Issues Found
- The Docker image tag was pinned to an older Nexus version (`3.72.0`). Updated the Docker run and Compose examples to the current Sonatype-published `sonatype/nexus3:3.92.3` tag.
- The Compose snippet used the obsolete top-level `version: "3.8"` property. Removed it to match the current Compose Specification.
- The npm publishing command referenced `npm-hosted` without creating that hosted repository. Added a matching `repositories/npm/hosted` API example before the login command.
- The Docker registry section omitted the Docker Bearer Token Realm prerequisite. Added the required realm note before Docker client usage.
- The PyPI proxy repository API body was missing required `httpClient` and `negativeCache` objects, and omitted PyPI-specific settings. Added those fields with the `/simple` index path.
- The cleanup policy example used the wrong endpoint and body shape. Changed it to `/service/rest/v1/cleanup-policies` with `criteriaLastDownloaded`, `criteriaLastBlobUpdated`, and `criteriaReleaseType`.
- Cleanup policies are documented as a Pro feature in current Sonatype materials. Added that caveat and adjusted the conclusion accordingly.
- The backup section implied a live volume tarball was sufficient and used an outdated task name. Added the stop-before-filesystem-backup caveat and changed the task reference to `Admin - Backup H2 Database`.

## Review Notes
The remaining examples are syntactically valid and align with the current Sonatype REST schema, Docker Compose behavior, and documented Nexus client setup. The article still uses HTTP localhost examples for simplicity; production deployments should use TLS, especially for package and Docker client authentication.
