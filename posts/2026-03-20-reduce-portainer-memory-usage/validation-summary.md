# Validation Summary: How to Reduce Portainer Memory Usage - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer CE
- Portainer Agent and Edge Agent
- Docker Engine CLI
- Docker Compose
- Bash

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer architecture: https://docs.portainer.io/start/architecture
- Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Why Portainer recommends the Edge Agent: https://docs.portainer.io/faqs/getting-started/why-do-we-recommend-using-the-edge-agent-instead-of-the-traditional-agent
- Install Portainer CE with Docker on Linux (LTS example): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Docker Compose file reference: https://docs.docker.com/compose/compose-file/
- Version and name top-level elements in Compose: https://docs.docker.com/reference/compose-file/version-and-name/
- Compose services reference (`mem_limit`, `memswap_limit`, `cpus`): https://docs.docker.com/reference/compose-file/services/
- `docker container stats` / `docker stats` reference: https://docs.docker.com/reference/cli/docker/container/stats/
- `docker system df` reference: https://docs.docker.com/reference/cli/docker/system/df/
- `docker system prune` reference: https://docs.docker.com/reference/cli/docker/system/prune/
- Docker prune guidance: https://docs.docker.com/engine/manage-resources/pruning/

## Issues Found
- The post said Portainer's `--snapshot-interval` default was `60s` and used bare integer values like `300` and `600`. Current Portainer CLI docs require Go duration strings such as `10m`, and document the default as `5m`. I updated the examples and conclusion accordingly.
- The post used `--no-analytics`, which is not listed in Portainer's current documented CLI flags. I removed it from the Compose examples.
- The Compose snippets used the top-level `version: "3.8"` field. Current Docker Compose docs mark the `version` field as obsolete, so I removed it.
- The `docker inspect portainer --format '{{.HostConfig.Memory}}'` example was described as a runtime memory breakdown, but it actually shows the configured memory limit. I corrected the explanation.
- The post described `docker system df` as a prune dry run. Docker documents it as a disk-usage and reclaimable-space report, so I corrected that wording.
- The database-optimization section used a manual BoltDB compaction workflow. Portainer documents a built-in `--compact-db` flag, so I replaced the unsupported/manual flow with the documented flag and clarified that this is mainly a disk-space optimization rather than a direct memory reduction.
- The remote-agent section claimed memory-specific benefits that were not supported by current Portainer docs. I rewrote it to match Portainer's documented guidance: the classic Agent is lightweight and stateless but legacy, and the Edge Agent is recommended for most remote environments.
- The monitoring script had a broken `docker exec ... wc -c < /data/portainer.db` command because shell redirection would occur on the host, not inside the container. I fixed it to run through `sh -c`.
- The alert example in the monitoring script was unreachable because it appeared after an infinite loop. I moved the threshold check into the loop and switched it to use `MemPerc`, which avoids fragile parsing of human-readable memory units.

## Review Notes
- The post is now technically consistent with current Portainer and Docker documentation, but the practical effect of database compaction is mostly reduced on-disk database size rather than a large direct reduction in Portainer RSS.
- The monitoring example assumes a Linux-style Docker environment. Docker documents `.MemPerc` as unavailable on Windows.
- Docker was not installed in the review workspace, so command behavior was validated against official documentation rather than local CLI help output.
