# Validation Summary: How to Benchmark Docker Container Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine and Docker CLI
- Docker Compose
- sysbench
- stress-ng
- fio
- iperf3
- qperf
- PostgreSQL pgbench
- Redis benchmark
- cAdvisor
- wrk and ApacheBench

## Sources Consulted
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- Docker Compose specification: https://docs.docker.com/reference/compose-file/
- Docker networking documentation: https://docs.docker.com/engine/network/
- sysbench command help from `severalnines/sysbench`
- stress-ng command help from `polinux/stress-ng`
- fio command help and option help from `ljishen/fio`
- iperf3 command help from `networkstatic/iperf3` and ESnet iperf3 documentation: https://software.es.net/iperf/
- qperf command help from `pedroperezmsft/qperf`
- PostgreSQL pgbench documentation: https://www.postgresql.org/docs/current/pgbench.html
- Redis benchmark documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/optimization/benchmarks/

## Issues Found
- The standalone iperf3 example used `--network bench-net` without creating `bench-net`. Added `docker network create bench-net` and cleanup with `docker network rm bench-net`.
- The qperf example used `--network bench-net` without creating the network and did not clean up the server container. Added network creation, container cleanup, and network cleanup.
- The qperf example referenced `arjanschaaf/qperf`, which is not pullable from Docker Hub. Replaced it with `pedroperezmsft/qperf` and verified the example runs locally.
- Several fio examples used `--runtime` without `--time_based`, so fio could finish after the requested data size instead of running for the intended duration. Added `--time_based` to the duration-based fio examples.
- The storage comparison section was titled "Compare Storage Drivers" even though it compares Docker volume, bind mount, and tmpfs storage configurations rather than Docker storage drivers. Renamed the heading to "Compare Storage Configurations."
- The Compose snippets used the obsolete top-level `version: '3.8'` field. Removed the field to match the current Compose specification.
- The database benchmark command used the legacy `docker-compose` command. Updated it to the current `docker compose` command.

## Review Notes
The post is technically relevant and the corrected snippets are consistent with current Docker, Compose, fio, iperf3, qperf, sysbench, and stress-ng behavior. Some examples depend on Linux-specific behavior, such as host networking and dropping page cache, and may behave differently on Docker Desktop.
