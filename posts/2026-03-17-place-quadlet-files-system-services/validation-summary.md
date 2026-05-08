# Validation Summary: How to Place Quadlet Files for System Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- Podman
- Quadlet
- systemd system services
- Rootful containers
- Prometheus Node Exporter

## Sources Consulted
- Podman `podman-systemd.unit(5)` official documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman Quadlet basic usage official documentation: https://docs.podman.io/en/latest/markdown/podman-quadlet-basic-usage.7.html
- systemd `systemd.special(7)` official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.special
- Prometheus Node Exporter official README: https://github.com/prometheus/node_exporter/blob/master/README.md

## Issues Found
- The post described system-level Quadlet containers as having "full system access." Rootful Quadlet services are root-owned system services, but container isolation still applies unless host resources are mounted or Podman options grant broader access. I changed this wording in the introduction and summary.
- The post used `sudo systemctl enable nginx-proxy` and `sudo systemctl disable nginx-proxy` for generated Quadlet services. The Podman Quadlet man page explains that generated services are transient and that the generator applies the `[Install]` section during generation. I removed those commands and left boot behavior tied to the `[Install]` section.
- The Node Exporter example combined `PublishPort=9100:9100` with host networking and did not pass the required `--path.rootfs` argument for host filesystem monitoring. I changed the example to use `Network=host`, `PodmanArgs=--pid=host`, `Volume=/:/host:ro,rslave`, and `Exec=--path.rootfs=/host`, matching the Prometheus Node Exporter container guidance.
- The `WantedBy` explanation said `multi-user.target` ensures network and filesystems are available. I corrected the network part to note that Quadlet adds `network-online.target` dependencies for root units by default.
- The dry-run command used `/usr/libexec/podman/quadlet --dryrun`. The current Podman documentation shows `/usr/lib/systemd/system-generators/podman-system-generator --dryrun`, so I updated the command.

## Review Notes
The remaining Quadlet keys and examples use documented syntax, including `Image=`, `PublishPort=`, `Volume=`, `Environment=`, `Label=`, `Restart=`, `TimeoutStartSec=`, and `WantedBy=multi-user.target`. The article intentionally uses example credentials for PostgreSQL; a production guide should avoid hard-coded database passwords or use `EnvironmentFile=`/secrets, but that is a security hardening improvement rather than a Quadlet syntax error.
