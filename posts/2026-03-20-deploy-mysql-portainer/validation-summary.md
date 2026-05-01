# Validation Summary: How to Deploy MySQL via Portainer

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer stacks
- MySQL
- Docker Compose
- Docker CLI
- Docker volumes

## Sources Consulted
- Portainer: Add a new stack https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer: How Relative Path Support works in Portainer https://docs.portainer.io/advanced/relative-paths
- Portainer: Secrets https://docs.portainer.io/user/docker/secrets
- Docker Docs: Version and name top-level elements https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Networking in Compose https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Control startup and shutdown order in Compose https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs: docker container exec https://docs.docker.com/reference/cli/docker/container/exec/
- Docker Docs: docker container cp https://docs.docker.com/reference/cli/docker/container/cp/
- Docker Official Image: mysql https://hub.docker.com/_/mysql/
- MySQL 8.0 Reference Manual: More Topics on Deploying MySQL Server with Docker https://dev.mysql.com/doc/refman/8.0/en/docker-mysql-more-topics.html
- MySQL 8.0 Reference Manual: InnoDB Startup Options and System Variables https://dev.mysql.com/doc/refman/8.0/en/innodb-parameters.html
- MySQL 8.0 Reference Manual: Server System Variables https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL Reference Manual: mysqladmin https://dev.mysql.com/doc/refman/en/mysqladmin.html

## Issues Found
- The Compose example used the top-level `version` field, which Docker now documents as obsolete. I removed it from the stack snippet.
- The stack used relative bind mounts (`./mysql-conf` and `./init-scripts`) while the post specifically instructs readers to use Portainer's stack editor. Portainer's relative-path support is limited and not the generic behavior for web-editor stacks, so I changed the mounts and file examples to absolute host-path placeholders.
- The MySQL config used `innodb_log_file_size`, which MySQL 8.0.30+ deprecates in favor of `innodb_redo_log_capacity`. I replaced it with `innodb_redo_log_capacity = 128M` to preserve the intended approximate total redo-log capacity.
- The initialization-script explanation said scripts run on "first start". The official MySQL image only runs `/docker-entrypoint-initdb.d` files when initializing a fresh data directory, so I corrected that wording.
- The backup, restore, and verification commands assumed the container name was literally `mysql` and one verification command tried to expand `MYSQL_ROOT_PASSWORD` on the host instead of inside the container. I replaced those examples with `<mysql-container-name>` placeholders and `sh -c` where container-side expansion is required.
- The post described Portainer environment variables as a secure way to manage passwords. I narrowed that claim so it no longer overstates the security properties of environment variables and pointed to Docker secrets for Swarm-based production deployments.

## Review Notes
- The post still uses the `mysql:8.0` image tag, which remains available in the official image. As of 2026-05-01, `8.4` and `lts` are the current LTS-oriented tags in the Docker Official Image.
- Portainer secrets are only available for Docker Swarm environments, so the post's main stack example appropriately continues to use environment variables for a generic Portainer walkthrough.
