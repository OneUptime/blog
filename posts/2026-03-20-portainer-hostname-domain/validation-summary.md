# Validation Summary: How to Set Container Hostname and Domain in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose
- Container networking
- RabbitMQ
- PostgreSQL

## Sources Consulted
- Portainer Advanced container settings: https://docs.portainer.io/user/docker/containers/advanced
- Docker Compose services reference (`hostname`, `domainname`, `extra_hosts`, `command`): https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name top-level elements (`version` is obsolete): https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Engine networking overview (`--hostname`, `--dns-search`, `/etc/hosts`): https://docs.docker.com/engine/network/
- Docker Engine running containers (container names resolve on user-defined networks): https://docs.docker.com/engine/containers/run/
- Docker container run reference (`--domainname` and UTS namespace behavior): https://docs.docker.com/reference/cli/docker/container/run/
- RabbitMQ Clustering Guide (`RABBITMQ_NODENAME`, long names, hostname resolution): https://www.rabbitmq.com/clustering.html
- RabbitMQ Docker Official Image overview (current maintained management tags): https://hub.docker.com/_/rabbitmq
- PostgreSQL replication settings (`primary_conninfo`): https://www.postgresql.org/docs/15/runtime-config-replication.html

## Issues Found
- The Portainer navigation was inaccurate. The post said the settings were in a Network tab, but Portainer documents them under `Show advanced options` in the Network section. I corrected the steps.
- The post implied `domainname` automatically produces a specific FQDN and `/etc/hosts` result. Docker documents `domainname` as a container domain setting, not as a general DNS or search-domain feature, so I rewrote that explanation to avoid overstating its behavior.
- The Portainer host entry example used separate IP and hostname fields, but Portainer documents host file entries as `hostname:address`. I corrected that example.
- The Compose `extra_hosts` examples used `:` short syntax. Docker currently prefers `=` in short syntax, so I updated the examples to the current preferred form.
- The Compose example included a top-level `version: "3.8"` key. Docker documents `version` as obsolete, so I removed it and switched the filename reference to `compose.yaml`.
- The container-name section implied Docker name-based DNS works generically across Docker networks. Docker documents this behavior for user-defined networks, so I narrowed the wording and example accordingly.
- The RabbitMQ example used an older image tag and a node-name example that did not align with the configured domain name. I updated it to a current management tag and aligned the long node-name configuration with RabbitMQ's clustering docs.
- The PostgreSQL example used `POSTGRES_PRIMARY_HOST`, which is not a documented setting in the official Postgres image. I replaced it with a `primary_conninfo` example and explicitly noted that full standby initialization is still required.
- The verification section relied on `hostname -f` and a specific `/etc/hosts` layout, which are image- and resolver-dependent. I simplified it to checks the docs actually support consistently.

## Review Notes
- `domainname` is not the same setting as Docker DNS search domains; Docker documents DNS search separately via `dns_search` in Compose and `--dns-search` in `docker run`.
- `extra_hosts` adds entries to the target container's host-resolution configuration; it does not create Docker-wide or external DNS records.
