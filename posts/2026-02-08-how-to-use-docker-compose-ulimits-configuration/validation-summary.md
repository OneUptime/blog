# Validation Summary: How to Use Docker Compose ulimits Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Docker Compose
- Linux ulimits / resource limits
- Elasticsearch
- PostgreSQL
- Redis
- Nginx

## Sources Consulted
- Docker Compose file reference, `ulimits`: https://docs.docker.com/reference/compose-file/services/#ulimits
- Docker Compose file reference, obsolete `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker `docker run --ulimit` reference: https://docs.docker.com/reference/cli/docker/container/run/#set-ulimits-in-container---ulimit
- Docker daemon default ulimit settings: https://docs.docker.com/reference/cli/dockerd/#default-ulimit-settings
- Docker daemon configuration file locations: https://docs.docker.com/engine/daemon/
- Elastic Docker installation and ulimit guidance: https://www.elastic.co/guide/en/elasticsearch/reference/current/docker.html
- Elastic swapping and `bootstrap.memory_lock` guidance: https://www.elastic.co/guide/en/elasticsearch/reference/current/setup-configuration-memory.html
- Linux `getrlimit(2)` manual page: https://man7.org/linux/man-pages/man2/getrlimit.2.html
- Linux `/proc/pid/limits` manual page: https://man7.org/linux/man-pages/man5/proc_pid_limits.5.html
- Redis client handling and `maxclients`: https://redis.io/docs/latest/develop/reference/clients/

## Issues Found
- Removed obsolete top-level `version: "3.8"` from Compose examples. Current Docker Compose uses the Compose Specification and treats `version` as only informational, emitting an obsolete warning.
- Replaced `elasticsearch:8.12.0` with the official Elastic Docker image reference `docker.elastic.co/elasticsearch/elasticsearch:8.12.0`.
- Changed Elasticsearch `nofile` examples from `65536` to `65535` where the post was presenting Elastic-specific production guidance, matching Elastic's documented Docker example.
- Removed `memlock` from the PostgreSQL example because PostgreSQL does not generally require unlimited locked memory in the shown configuration.
- Corrected Elasticsearch `memlock` guidance. Elastic recommends disabling swap for production; unlimited `memlock` is required when using the `bootstrap.memory_lock=true` approach.
- Corrected the troubleshooting text so Elasticsearch startup failures are not described as always requiring unlimited `memlock`; `memlock` is only required when memory locking is enabled.

## Review Notes
The Docker Compose `ulimits` syntax, Docker daemon `default-ulimits` JSON shape, Docker inspection commands, `/proc/1/limits` verification approach, Redis `maxclients` guidance, and Linux soft/hard limit explanations are technically sound. The `nproc` limit is user-scoped on Linux rather than a strict per-container process limit, which the post correctly hints at by describing it as a user process/thread limit.
