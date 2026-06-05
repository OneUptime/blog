# Validation Summary: How to Monitor Podman VM Resource Usage and Running Container Metrics via the

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman machine
- OpenTelemetry Collector
- OpenTelemetry Collector hostmetrics receiver
- OpenTelemetry Collector docker_stats receiver
- Docker-compatible Podman API socket
- Python subprocess and JSON parsing

## Sources Consulted
- Podman machine documentation: https://docs.podman.io/en/latest/markdown/podman-machine.1.html
- Podman machine inspect documentation: https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman machine set documentation: https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman installation documentation for macOS and Windows machine behavior: https://podman.io/docs/installation
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector contrib docker_stats receiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/dockerstatsreceiver
- OpenTelemetry Collector contrib hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md

## Issues Found
- The post described Podman machine VM providers as QEMU or Apple Virtualization only. Updated the architecture explanation to include WSL/Hyper-V on Windows.
- The VM process filter mentioned only QEMU and vfkit. Added `vmmem.*` to the hostmetrics process filter and updated the explanation to include WSL VM processes.
- The container metrics section implied the `docker_stats` receiver could run directly on macOS with a forwarded socket. The receiver documentation lists unsupported platforms for the component, so the post now states that the receiver should run in a Linux Collector environment, such as inside the Podman machine.
- The macOS socket example used a fixed Podman socket path. Replaced it with `podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'`, which matches the official Podman machine inspect output.
- The Collector socket examples mixed rootful `/run/podman/podman.sock`, `/var/run/podman.sock`, and container paths. Updated the examples to use the rootless `$XDG_RUNTIME_DIR/podman/podman.sock` inside the VM and mount it into the Collector container as `/var/run/docker.sock`.
- The Podman container run example mounted the socket with an SELinux relabel option. Updated it to use `--security-opt label=disable`, matching Podman's guidance for accessing the API socket from inside a container.
- The Python example was described as querying stats via the API, but it shells out to `podman machine inspect`. Updated the wording to say it uses the CLI.
- The `podman machine set --cpus` and `--memory` tips omitted the official QEMU-only caveat. Added that caveat to both tips.

## Review Notes
- The OpenTelemetry Collector configuration examples are syntactically plausible and use current component identifiers and pipeline structure.
- The `docker_stats` receiver is documented as alpha for metrics, so production users should pin a tested Collector version instead of relying on `latest`.
