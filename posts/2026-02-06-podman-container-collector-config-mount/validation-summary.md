# Validation Summary: How to Run the OpenTelemetry Collector as a Podman Container with Config Mount

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Docker Stats receiver
- Podman rootless and rootful containers
- Podman API socket and systemd socket activation
- Podman pods
- SELinux volume labeling
- systemd user services

## Sources Consulted
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Contrib Docker Stats receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/dockerstatsreceiver/README.md
- OpenTelemetry Collector logging exporter removal announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- Podman system service documentation: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman volume option documentation: https://docs.podman.io/en/v4.4/markdown/options/volume.html
- Podman run documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman generate systemd documentation: https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- Podman Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html

## Issues Found
- The Collector config used the removed `logging` exporter with `loglevel`. Current Collector releases removed the logging exporter in favor of the `debug` exporter, and the `loglevel` option is not valid for `debug`. Changed the example to use `debug` with `verbosity: normal`.
- The Podman socket mounts used `:Z` relabeling. Podman documentation recommends mounting the API socket and running the container with `--security-opt label=disable` when accessing the Unix socket from inside a container. Updated the rootless, rootful, and pod examples accordingly.
- The rootless Collector example did not account for the official Collector image running as a non-root user while the Podman socket is protected by Unix socket permissions. Added `--user 0` for rootless examples so container root maps to the invoking rootless Podman user.
- The rootful Podman example did not publish port `13133`, but the post later verifies the health endpoint on that port. Added `-p 13133:13133`.
- The pod example reused the same Collector configuration but did not mount the Podman socket, so the `docker_stats` receiver would not be able to query container stats. Added the rootless Podman socket mount and related flags.
- The systemd section claimed `--new` ensures the container always starts with the latest image. Podman `--new` recreates the container, but `podman run` defaults to pulling only when the image is missing. Updated the explanation and noted that Podman recommends Quadlet for new systemd-managed containers.
- The introduction stated that Podman runs rootless by default. Adjusted the wording to say Podman can run rootless without a daemon, since rootless versus rootful depends on how Podman is invoked.

## Review Notes
The post remains technically relevant. The Docker Stats receiver is documented for Docker API 1.25+, while Podman exposes a Docker-compatible API service; compatibility still depends on Podman's Docker API behavior and the Collector process being able to access the Podman socket. Local `podman` and `otelcol-contrib` binaries were not available in the workspace, so validation was performed against official documentation rather than local command execution.
