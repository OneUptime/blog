# Validation Summary: How to Configure Docker Ulimits for Production Workloads

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker Compose
- Linux ulimits and resource limits
- systemd service limits
- Nginx
- PostgreSQL
- Elasticsearch
- Redis
- MongoDB
- Java containers
- Node.js containers

## Sources Consulted
- Docker CLI reference for `docker run --ulimit`, supported ulimit names, `nproc` behavior, capabilities, and sysctls: https://docs.docker.com/reference/cli/docker/container/run/
- Docker daemon reference for `default-ulimits`: https://docs.docker.com/reference/cli/dockerd/
- Docker Compose services reference for `ulimits`, `cap_add`, and `sysctls`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose reference for obsolete top-level `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Elastic documentation for Elasticsearch Docker production ulimits and memory lock settings: https://www.elastic.co/docs/deploy-manage/deploy/self-managed/install-elasticsearch-docker-prod
- Linux `mlock(2)` manual for `RLIMIT_MEMLOCK` and `CAP_IPC_LOCK` behavior: https://man7.org/linux/man-pages/man2/mlock.2.html
- Linux capabilities manual for capability semantics: https://man7.org/linux/man-pages/man7/capabilities.7.html
- PostgreSQL documentation for kernel resource and shared memory behavior: https://www.postgresql.org/docs/current/kernel-resources.html
- MongoDB documentation for recommended UNIX ulimit settings: https://www.mongodb.com/docs/manual/reference/ulimit/
- Docker Hub OpenJDK deprecation notice: https://hub.docker.com/_/openjdk
- Eclipse Temurin container image documentation: https://adoptium.net/installation/containers
- Oracle Java documentation for `JAVA_TOOL_OPTIONS`: https://docs.oracle.com/javase/8/docs/technotes/guides/troubleshoot/envvars002.html

## Issues Found
- The Docker daemon JSON example included a `// /etc/docker/daemon.json` comment inside a `json` block. JSON configuration files do not allow comments, so I moved the file path into prose before the code block.
- The PostgreSQL examples configured `memlock` and `IPC_LOCK`, but the shown PostgreSQL configuration does not explicitly lock memory. I removed those settings from the PostgreSQL examples to avoid implying that the ulimit alone makes PostgreSQL lock memory.
- The Java example used `openjdk:21`, but the Docker Official Image for OpenJDK is deprecated and users are directed to replacement images. I changed it to `eclipse-temurin:21-jdk`.
- The Java example used `JAVA_OPTS`, which is not automatically consumed by the JVM unless an entrypoint script applies it. I changed it to `JAVA_TOOL_OPTIONS`, which the JVM recognizes.
- The memory-locking note stated that containers must have `IPC_LOCK`. Linux permits unprivileged locking up to `RLIMIT_MEMLOCK`, while `CAP_IPC_LOCK` bypasses that limit. I revised the note to make the capability conditional.
- The complete Compose example used the obsolete top-level `version: '3.8'` key. I removed it to match the current Compose Specification.
- The summary table implied all databases should use `memlock: -1` and that Elasticsearch requires `IPC_LOCK`. I adjusted the rows to distinguish general databases from services that explicitly use memory locking.

## Review Notes
Docker's `nproc` limit is per user rather than strictly per container, which the Docker documentation calls out as an important caveat. The post already warns against setting it too low; future revisions could expand that caveat for multi-container workloads running under the same user.
