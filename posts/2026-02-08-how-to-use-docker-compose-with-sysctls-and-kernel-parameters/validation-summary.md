# Validation Summary: How to Use Docker Compose with sysctls and Kernel Parameters

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Compose
- Docker Engine
- Linux sysctls
- Linux network namespaces and IPC namespaces
- NGINX
- PostgreSQL
- Redis
- HAProxy

## Sources Consulted
- Docker Compose services reference, `sysctls` and `shm_size`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI `docker container run` reference, `--sysctl`, supported namespaced sysctls, and privileged mode: https://docs.docker.com/reference/cli/docker/container/run/
- Docker resource constraints documentation: https://docs.docker.com/engine/containers/resource_constraints/
- PostgreSQL 17 documentation, Managing Kernel Resources: https://www.postgresql.org/docs/17/kernel-resources.html
- Postgres Docker Official Image documentation: https://hub.docker.com/_/postgres
- Local Docker CLI checks using Docker Engine 29.4.2 on Linux 6.17.0: `docker run --sysctl`, `docker run --privileged --sysctl`, and `docker run --cap-add NET_ADMIN --sysctl`

## Issues Found
- The Compose examples used top-level `version: "3.8"`. Docker Compose now treats the top-level `version` property as obsolete and only informative, so the examples were updated to omit it.
- The PostgreSQL example claimed large `kernel.shmmax`, `kernel.shmall`, and `kernel.sem` settings were required for large PostgreSQL `shared_buffers`. PostgreSQL's current Linux documentation says it usually allocates only a small amount of System V shared memory unless configured otherwise, and the official Postgres image recommends `shm_size` for `/dev/shm`. The example was updated to use `shm_size` and keep only network sysctls.
- The Redis comment implied a non-namespaced sysctl could be handled by privileged mode in the Compose `sysctls` list. Docker rejects `vm.overcommit_memory` as a Docker sysctl even with `--privileged`, so the text now says it must be set on the host.
- The HAProxy example said `net.netfilter.nf_conntrack_max` only required `NET_ADMIN`. Local Docker runtime checks rejected that sysctl even with `NET_ADMIN`, additional capabilities, and privileged mode. The Compose sysctl was removed, and the note now recommends setting it on the host.
- The troubleshooting text suggested using privileged mode for non-namespaced sysctls configured through Compose. It now directs readers to remove those entries from `sysctls` and set them on the host.

## Review Notes
Most network and IPC sysctl examples matched Docker's documented namespaced sysctl support and were also spot-checked locally with `docker run --sysctl`. Some tuning values are workload-dependent and should be benchmarked before production use.
