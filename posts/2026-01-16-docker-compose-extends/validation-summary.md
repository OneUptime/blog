# Validation Summary: How to Use Docker Compose Extends for Reusable Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Compose
- Compose file `extends`
- Compose file `include`
- Multiple Compose file merging
- YAML configuration

## Sources Consulted
- Docker Docs: Extend your Compose file - https://docs.docker.com/compose/how-tos/multiple-compose-files/extends/
- Docker Docs: Merge Compose files - https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/
- Docker Docs: Include - https://docs.docker.com/compose/how-tos/multiple-compose-files/include/
- Docker Docs: Compose file reference, services `extends` - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose file reference, merge rules - https://docs.docker.com/reference/compose-file/merge/
- Docker Docs: Compose file reference, include - https://docs.docker.com/reference/compose-file/include/
- Local Docker Compose CLI help and config validation with Docker Compose v5.1.3

## Issues Found
- In the complete example, `compose/development.yml` used `build.context: ..` and `../src:/app/src`. Because that file is used with `docker compose -f docker-compose.yml -f compose/development.yml`, Docker Compose resolves relative paths from the first Compose file's directory, not from the override file's own directory. Changed these to `build.context: .` and `./src:/app/src` so they resolve to the project root and project `src` directory as intended.

## Review Notes
- The `include` examples are valid for modern Docker Compose versions that support the top-level `include` element.
- The `extends` examples correctly declare required top-level resources, such as the `node_modules` volume, in the consuming Compose model.
- The merge behavior examples are accurate for the shown fields: scalar values are overridden, environment mappings are merged by key, and non-conflicting port entries are added.
