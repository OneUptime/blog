# Validation Summary: How to Connect Two Docker Containers to MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Docker (container networking, user-defined bridge networks)
- Docker Compose (service definitions, depends_on with health checks)
- MySQL 8.0 (official Docker image, environment variables)
- Adminer (database management UI)
- Node.js 20 Alpine (application container example)

## Sources Consulted
- Docker official documentation on networking: https://docs.docker.com/network/
- Docker Compose file reference (depends_on, healthcheck): https://docs.docker.com/reference/compose-file/
- MySQL Docker Hub official image documentation: https://hub.docker.com/_/mysql
- Adminer Docker Hub official image documentation: https://hub.docker.com/_/adminer
- Docker embedded DNS server documentation: https://docs.docker.com/engine/network/#dns-services

## Issues Found
1. **Missing healthcheck on MySQL service**: The `depends_on` block for the `app` service used `condition: service_healthy`, but the `mysql` service did not define a `healthcheck`. The official MySQL Docker image does not include a built-in HEALTHCHECK instruction, so Docker Compose would wait indefinitely (or fail) because the MySQL container would never report as healthy. Added a `healthcheck` block using `mysqladmin ping` with appropriate interval, timeout, and retry settings.

## Review Notes
- The `version: "3.9"` field in the Compose file is now considered obsolete by Docker Compose V2 and is ignored (a warning is printed). It is not incorrect to include it, but modern Compose files typically omit it. This is a minor style point, not a technical error.
- The troubleshooting section suggests running `mysqladmin` from inside the app container (`node:20-alpine`), which does not have the MySQL client installed by default. The command syntax is correct, but users would need to install the `mysql-client` package first or run the command from a container that has it (e.g., the MySQL container itself). This is a practical caveat rather than a technical error.
- All Docker networking claims (user-defined bridge DNS resolution, default bridge limitations) are accurate per official Docker documentation.
