# Validation Summary: How to Migrate Docker Networks to Podman

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Docker networking
- Podman networking
- Netavark
- CNI
- Bridge networks
- Macvlan and IPvlan networks
- Podman pods
- Bash scripting with jq

## Sources Consulted
- Podman network command documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman network inspect documentation: https://docs.podman.io/en/latest/markdown/podman-network-inspect.1.html
- Podman network connect documentation: https://docs.podman.io/en/stable/markdown/podman-network-connect.1.html
- Podman pod create documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman info documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Docker network create CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker networking overview: https://docs.docker.com/engine/network/
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker macvlan network driver documentation: https://docs.docker.com/engine/network/drivers/macvlan/

## Issues Found
- The Docker-to-Podman network mapping listed Docker overlay networks as unavailable with pods as an alternative. Pods share one host/pod network namespace and are not an equivalent to Docker overlay multi-host networks, so the mapping now recommends Kubernetes or another multi-host networking solution.
- The network type mapping omitted Docker IPvlan even though both Docker and Podman document IPvlan support, so an IPvlan mapping was added.
- The post stated that `com.docker.network.bridge.name` is Docker-specific and omitted it from the Podman example. Podman documents support for this bridge option, so the Podman command now preserves it and notes `--interface-name` as another Netavark option.
- The batch migration script would have recreated Docker overlay networks as bridge networks and lost macvlan parent/mode settings. It now skips overlay/plugin drivers that do not have a built-in Podman equivalent, supports IPvlan, and carries over macvlan `parent` and `macvlan_mode` as Podman options.
- The pod example attempted to start Postgres without required initialization environment and then run `curl` from an Nginx container against a Postgres port. The example now uses an Nginx container plus a transient curl container in the same pod to demonstrate localhost communication accurately.

## Review Notes
Podman was not installed in the local environment, so Podman commands were verified against official Podman documentation rather than local `--help` output. Docker CLI help was available locally and was also cross-checked against Docker's official documentation.
