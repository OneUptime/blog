# Validation Summary: How to Optimize Docker for High-Throughput Applications

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker networking drivers
- Docker Compose
- Linux sysctl networking parameters
- Linux conntrack
- Linux CPU affinity and NUMA placement
- Docker storage mounts, tmpfs, ulimits, and memory constraints

## Sources Consulted
- Docker Docs: Host network driver - https://docs.docker.com/engine/network/drivers/host/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: `docker container run` reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Resource constraints - https://docs.docker.com/engine/containers/resource_constraints/
- Docker Docs: `dockerd` reference and daemon configuration options - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose deploy specification - https://docs.docker.com/reference/compose-file/deploy/
- Docker Docs: Volumes - https://docs.docker.com/engine/storage/volumes/
- Linux kernel documentation: IP sysctl parameters - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Local Docker CLI help and validation: `docker run --help`, `dockerd --help`, `docker compose config -q`

## Issues Found
- The CPU throttling section incorrectly stated that Docker's default CPU CFS bandwidth control can throttle containers. Docker documents that containers have unlimited CPU access by default unless constraints are set. I updated the text to describe throttling from explicit CPU quotas and changed the example to run without quota flags.
- The IRQ affinity example said it pinned interrupts to cores 4-5 but wrote only `4` to `smp_affinity_list`. I changed it to write `4-5`.
- The Direct I/O section implied that a volume mount itself bypasses the page cache with O_DIRECT and called a bind mount a volume. I clarified that O_DIRECT must be configured by the application where supported, and that bind mounts or Docker volumes avoid the container writable overlay layer for data paths.
- The Compose example used `network_mode: host` together with `sysctls` for `net.core.somaxconn`. Docker disallows network namespace sysctls when the container uses the host network namespace, and local runtime testing produced `sysctl "net.core.somaxconn" not allowed in host network namespace`. I removed those per-container sysctls from the host-network Compose services; host-level sysctl tuning is already covered earlier in the post.

## Review Notes
- TCP Fast Open still requires application support for client and/or server use; setting `net.ipv4.tcp_fastopen = 3` only enables the kernel feature.
- `tcp_tw_reuse = 1` is valid, but the current Linux kernel documentation advises changing it only with expert guidance and notes the default is loopback-only reuse on current kernels.
- The Compose YAML and daemon JSON snippets were syntax-checked after edits. Docker Hub image pulls were rate-limited in this environment, so runtime validation used locally available images where needed.
