# Validation Summary: How to Initialize Dapr in Self-Hosted Mode

## Status
validated

## Post Type
Tutorial / Getting Started Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr CLI (`dapr init`, `dapr run`, `dapr uninstall`)
- Docker (containers for Redis, Zipkin, placement, scheduler)
- Redis (default state store and pub/sub)
- Zipkin (default distributed tracing)

## Sources Consulted
- Dapr official docs — Install Dapr in self-hosted mode: https://docs.dapr.io/getting-started/install-dapr-selfhost/
- Dapr CLI reference — `dapr init`: https://docs.dapr.io/reference/cli/dapr-init/
- Dapr CLI reference — `dapr uninstall`: https://docs.dapr.io/reference/cli/dapr-uninstall/
- Dapr CLI reference — `dapr run`: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr CLI source code (`standalone.go`) for container names, images, and ports

## Issues Found

1. **Missing `dapr_scheduler` container (HIGH):** The blog post omitted the `dapr_scheduler` container, which is created by `dapr init` in current Dapr versions. Fixed by adding it to the Mermaid diagram, the container list, and the `docker ps` example output. Also added port 50006 to the prerequisites.

2. **`dapr status` is Kubernetes-only (HIGH):** The post used `dapr status` to verify the self-hosted installation, but this command only works with Kubernetes deployments. The example output shown (with NAMESPACE, HEALTHY, REPLICAS columns) was Kubernetes-style output. Fixed by replacing with `dapr --version`, `docker ps --filter "name=dapr_"`, and `dapr list` commands, which are the correct self-hosted verification methods.

3. **Incorrect `--slim` description (MEDIUM):** The post stated that `dapr init --slim` installs "the placement service binary," but `--slim` actually excludes the placement and scheduler services. Fixed to accurately describe that only the `daprd` binary and dashboard are installed.

4. **Inaccurate `dapr uninstall` descriptions (MEDIUM):** The post said `dapr uninstall` removes "all Dapr containers and binaries" and `dapr uninstall --all` "also removes Docker containers and images." In reality, `dapr uninstall` only removes the Dapr runtime (not containers), and `--all` removes containers and the `~/.dapr` directory (not images). Fixed both descriptions.

5. **Missing scheduler port from prerequisites (LOW):** Added port 50006 (scheduler) to the list of required available ports.

## Review Notes
- The runtime version shown in the example output (`1.14.x`) is outdated — current Dapr is 1.17.x. This was not changed since it's presented as example output and does not affect correctness of instructions. Readers will see their current version when they run the command.
- The default component YAML files (statestore.yaml and pubsub.yaml) were verified against the Dapr CLI source code and are accurate.
- The `dapr run` command syntax is correct. Note that `--dapr-http-port 3500` is redundant since 3500 is the default, but including it for clarity is reasonable in a tutorial.
- Docker image names (`daprio/dapr`, `redis:6`, `openzipkin/zipkin`) and port mappings were verified as correct.
