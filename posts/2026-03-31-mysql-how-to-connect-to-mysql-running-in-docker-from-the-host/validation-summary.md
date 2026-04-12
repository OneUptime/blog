# Validation Summary: How to Connect to MySQL Running in Docker from the Host

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0
- Docker (container runtime, port binding, docker exec)
- Docker Compose v2
- MySQL CLI client
- GUI tools (MySQL Workbench, DBeaver, TablePlus)

## Sources Consulted
- Docker official documentation on container networking and port publishing: https://docs.docker.com/engine/network/#published-ports
- Docker `run` reference for `-p` flag syntax: https://docs.docker.com/reference/cli/docker/container/run/#publish
- MySQL 8.0 reference manual on connecting to the server: https://dev.mysql.com/doc/refman/8.0/en/connecting.html
- MySQL 8.0 `CREATE USER` and `GRANT` syntax: https://dev.mysql.com/doc/refman/8.0/en/create-user.html
- Official MySQL Docker image documentation: https://hub.docker.com/_/mysql
- Docker Compose specification: https://docs.docker.com/compose/compose-file/

## Issues Found
No technical issues found.

## Review Notes
- `FLUSH PRIVILEGES` after `CREATE USER`/`GRANT` is unnecessary in MySQL 8.0+ since these statements automatically reload the grant tables. It is not incorrect, just redundant. Many guides still include it for backward compatibility with older MySQL versions, so this is acceptable as-is.
- The post uses `mysql:8.0` as the image tag. MySQL 8.0 reached end-of-life in April 2026. Authors may want to update examples to `mysql:8.4` (the current LTS) or `mysql:9.x` (the current Innovation release) in a future revision.
- The `-prootsecret` inline password syntax in the `docker exec` example will produce a MySQL CLI warning about using a password on the command line being insecure. This is expected behavior and appropriate for the demonstration context.
