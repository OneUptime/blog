# Validation Summary: How to Choose Between Bridge and Host Networking Modes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine networking
- Docker bridge network driver
- Docker host network driver
- Docker Compose networking
- Docker CLI
- iperf3 network benchmarking

## Sources Consulted
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Host network driver - https://docs.docker.com/engine/network/tutorials/host/
- Docker Docs: Network drivers - https://docs.docker.com/engine/network/drivers/
- Docker Docs: Docker container run reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Docker network create reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Compose file services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Networking on Docker Desktop - https://docs.docker.com/desktop/features/networking/
- Docker Docs: Docker Desktop networking how-tos - https://docs.docker.com/desktop/features/networking/networking-how-tos/

## Issues Found
- The post stated that host networking only works on Linux and is essentially useless on macOS and Windows. Docker Desktop 4.34 and later supports host networking as an opt-in feature, with limitations compared with native Linux host networking. Updated the platform caveat and decision bullets accordingly.
- The Linux iperf3 bridge-mode benchmark used `host.docker.internal` without configuring it. On native Docker Engine for Linux, that hostname is not automatically available. Added `--add-host host.docker.internal=host-gateway` to make the command work as described.
- The Compose security example implied an internal service was only reachable from nginx and that the database was completely isolated. Containers on the same Compose network can reach each other by service name, regardless of `expose`; they are isolated from the host when ports are not published. Updated the comments to reflect that accurately.

## Review Notes
The performance numbers are presented as typical illustrative results, not guaranteed benchmarks. Actual throughput and latency depend on host hardware, kernel, Docker configuration, network driver settings, and whether Docker Desktop or native Linux Engine is used.
