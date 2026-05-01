# Validation Summary: How to Configure Drone CI with IPv6

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Drone CI
- Drone Docker runner
- Drone Docker plugin
- Docker Engine networking
- Docker Compose
- IPv6
- YAML configuration
- Shell commands

## Sources Consulted
- Drone Docker runner configuration reference (`DRONE_RUNNER_NETWORKS`): https://docs.drone.io/runner/docker/configuration/reference/drone-runner-networks/
- Drone Docker pipeline services: https://docs.drone.io/pipeline/docker/syntax/services/
- Drone Docker pipeline schema: https://docs.drone.io/yaml/docker/
- Drone substitution reference: https://docs.drone.io/pipeline/environment/substitution/
- Drone Docker plugin reference: https://docs.drone.io/plugins/popular/docker/
- Docker IPv6 networking: https://docs.docker.com/engine/daemon/ipv6/
- Docker bridge network driver: https://docs.docker.com/network/drivers/bridge/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose version top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker `network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Official Drone runner source (`DRONE_RUNNER_NETWORK_OPTS` / runner config): https://github.com/drone-runners/drone-runner-docker/blob/master/command/daemon/config.go
- Official Drone runner source (network creation): https://github.com/drone-runners/drone-runner-docker/blob/master/engine/engine.go
- Official Drone runner source (services are represented as steps in the Docker runner): https://github.com/drone-runners/drone-runner-docker/blob/master/engine/resource/pipeline.go

## Issues Found
- The server Compose example used an invalid IPv6 subnet (`2001:db8:drone::/64`). I replaced it with a valid ULA subnet.
- Both Compose examples used the obsolete top-level `version` field. I removed it because current Compose treats it as informational and warns that it is obsolete.
- The server port publishing example claimed `[::]:80:80` and `[::]:443:443` bind to both IPv4 and IPv6. That is inaccurate. I changed the example to standard published ports and updated the explanation to match Docker's current dual-stack behavior.
- The runner example incorrectly used `DRONE_RUNNER_VOLUMES` to mount `daemon.json` into pipeline containers as though that enabled IPv6. I replaced it with the documented `DRONE_RUNNER_NETWORKS` setting and updated the explanation so the runner attaches pipeline containers to a pre-created IPv6 Docker network.
- The runner host setup configured default-bridge daemon settings and enabled Docker experimental mode even though the post needed an IPv6 user-defined network for pipeline containers. I replaced that section with `docker network create --ipv6 --subnet ...`, which matches Docker's documented approach for IPv6 user-defined bridge networks.
- The `verify-ipv6` step used `ping6` against an assumed gateway address. That target was not guaranteed to exist. I changed the step to inspect IPv6 addresses and verify IPv6 stack availability with `ping -6 ::1`.
- The Docker image build/push example lacked registry credentials and did not actually enable the Docker plugin's IPv6 mode. I added secret-based `username` / `password` settings and `ipv6: true`.
- The integration pipeline defined `ports` under a Drone service container. Drone services are modeled as Docker pipeline steps and do not expose a documented `ports` attribute. I removed that field.
- The integration pipeline used `curlimages/curl:latest` while also running `ip -6 addr show`; that image does not provide `iproute2`. I changed the image to `ubuntu:22.04`, installed the required tools, and forced IPv6 with `curl -6`.
- Step 5 suggested that a privileged setup step could configure the pipeline network from inside a container. That is misleading because `.drone.yml` does not expose Docker IPAM or network creation controls. I rewrote the section as a verification example and corrected the explanation.
- The verification commands used a brittle `docker ps | grep drone-pipeline` container lookup. I changed them to inspect containers attached to the dedicated IPv6 Docker network.

## Review Notes
- Docker documents IPv6 support for Docker Engine on Linux hosts; these examples assume Linux runner hosts.
- `DRONE_RUNNER_NETWORKS` is documented. The fact that Docker services are handled as runner steps, and therefore receive the same attached networks, was confirmed in the official Drone runner source.
- The Docker plugin's `ipv6` setting enables IPv6 in the plugin's nested Docker daemon. Depending on runner privilege policy and plugin restrictions, some deployments may still need additional runner-side allowances for Docker-in-Docker workflows.
