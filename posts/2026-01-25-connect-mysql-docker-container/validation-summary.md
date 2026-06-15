# Validation Summary: How to Connect to MySQL from Docker Container

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker Engine networking
- Docker Compose
- MySQL 8.0 Docker image
- MySQL user grants and host binding
- Node.js mysql2
- Python SQLAlchemy with PyMySQL
- Go database/sql with go-sql-driver/mysql

## Sources Consulted
- Docker networking overview: https://docs.docker.com/engine/network/
- Docker network create CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker container run CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker host gateway configuration: https://docs.docker.com/reference/cli/dockerd/#configure-host-gateway-ip
- Docker Desktop networking how-tos: https://docs.docker.com/desktop/features/networking/networking-how-tos/
- Docker Compose networking: https://docs.docker.com/compose/how-tos/networking/
- Docker Compose startup order and service_healthy: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Compose services reference for depends_on conditions: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose interpolation: https://docs.docker.com/reference/compose-file/interpolation/
- Docker MySQL official image documentation: https://hub.docker.com/_/mysql
- MySQL documentation for Docker deployment variables: https://dev.mysql.com/doc/refman/8.2/en/docker-mysql-more-topics.html
- MySQL CREATE USER documentation: https://dev.mysql.com/doc/en/create-user.html
- MySQL GRANT documentation: https://dev.mysql.com/doc/en/grant.html
- MySQL account name documentation: https://dev.mysql.com/doc/en/account-names.html
- mysqladmin ping manual: https://man7.org/linux/man-pages/man1/mysqladmin.1.html
- mysql2 documentation: https://sidorares.github.io/node-mysql2/docs
- SQLAlchemy engine configuration: https://docs.sqlalchemy.org/en/latest/core/engines.html
- Go database/sql opening handles: https://go.dev/doc/database/open-handle
- go-sql-driver/mysql documentation: https://github.com/go-sql-driver/mysql

## Issues Found
- The Docker Compose example used `version: '3.8'`. Current Compose Specification treats the top-level `version` element as obsolete and Docker Compose warns when it is used. Removed the `version` line so the example uses the current Compose format while preserving the same service behavior.

## Review Notes
- The Docker network and container DNS explanation is correct for user-defined networks.
- The MySQL image environment variables and `/docker-entrypoint-initdb.d` mount are valid for the official MySQL image, with the usual caveat that initialization variables and scripts apply when the data directory is first initialized.
- The Linux `--add-host=host.docker.internal:host-gateway` example is correct for modern Docker Engine. Host networking also works on Linux, but it changes the container's network isolation model.
- The host MySQL grant example targets Docker's default bridge-style `172.17.%` range. Custom Docker networks may use different subnets, so readers should check `docker network inspect` for their actual subnet.
- The language connection snippets use valid APIs and connection string formats. The Go snippet opens a database handle; applications that need to verify connectivity immediately should call `db.Ping()` or `db.PingContext()`.
