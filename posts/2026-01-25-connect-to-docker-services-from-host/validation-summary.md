# Validation Summary: How to Connect to Services Running in Docker from Host Machine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker port publishing with `docker run -p`
- Docker Compose port mappings and service networking
- Docker host network mode
- PostgreSQL Docker image
- MySQL Docker image
- Redis Docker image
- MongoDB Docker image and `mongosh`
- Node.js Express binding behavior
- Common networking troubleshooting tools: `docker ps`, `ss`, `netstat`, `lsof`, `nc`, `curl`

## Sources Consulted
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Host network driver - https://docs.docker.com/engine/network/drivers/host/
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Compose file services reference, `ports` and `network_mode` - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose `version` top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Docker Desktop networking how-tos - https://docs.docker.com/desktop/features/networking/networking-how-tos/
- Docker Hub Official Image: Postgres - https://hub.docker.com/_/postgres
- Docker Hub Official Image: MySQL - https://hub.docker.com/_/mysql
- Docker Hub Official Image: Mongo - https://hub.docker.com/_/mongo
- MongoDB Docs: mongosh connection and `authSource` behavior - https://www.mongodb.com/docs/mongodb-shell/connect/
- Local Docker CLI help: `docker run --help` with Docker version 29.4.2

## Issues Found
- The post stated that host network mode is not available on Docker Desktop for Mac/Windows and is only available on Linux. Docker's current documentation says host networking is supported on Docker Engine for Linux and Docker Desktop 4.34 or later when enabled. Updated the bullet to reflect current platform support.
- The Compose examples used the top-level `version: '3.8'` key. Docker's current Compose Specification keeps this key only for backward compatibility and marks it obsolete. Removed the `version` lines from the Compose snippets while keeping the examples otherwise unchanged.

## Review Notes
- The port publishing syntax, localhost binding examples, Compose `ports` syntax, service-name DNS explanation, and host networking behavior are consistent with Docker documentation.
- The database container examples use valid environment variables for the referenced official images.
- The troubleshooting commands are broadly correct, but `netstat` and `ss` may not be installed in every minimal container image; users may need an image-specific debugging tool or a temporary debugging container.
