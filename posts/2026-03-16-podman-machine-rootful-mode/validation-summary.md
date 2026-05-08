# Validation Summary: How to Configure Podman Machine for Rootful Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Podman Machine
- Podman system connections
- Rootful and rootless container execution
- Privileged containers and Linux capabilities

## Sources Consulted
- Podman official documentation: `podman-machine-init` - https://docs.podman.io/en/latest/markdown/podman-machine-init.1.html
- Podman official documentation: `podman-machine-set` - https://docs.podman.io/en/stable/markdown/podman-machine-set.1.html
- Podman official documentation: `podman-machine-inspect` - https://docs.podman.io/en/stable/markdown/podman-machine-inspect.1.html
- Podman official documentation: `podman-system-connection-list` - https://docs.podman.io/en/v5.2.2/markdown/podman-system-connection-list.1.html
- Podman official documentation: `podman-system-service` socket paths - https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Podman Desktop documentation: setting Podman machine default connection - https://podman-desktop.io/docs/podman/setting-podman-machine-default-connection
- Podman project documentation: Podman for Windows rootful/rootless behavior - https://github.com/containers/podman/blob/main/docs/tutorials/podman-for-windows.md
- Podman official option documentation: `--privileged` - https://docs.podman.io/en/v4.6.0/markdown/options/privileged.html

## Issues Found
- The post described a "Podman daemon" running as a user or as root. Podman is daemonless, although it can expose an API service/socket for remote clients. Updated the wording to describe rootless/rootful container execution inside the VM.
- The rootful comparison said rootful containers have "full device access." Official `--privileged` documentation is more precise: access depends on the launching user and VM/device configuration. Changed this to "broader device access."
- The `podman machine inspect my-machine | jq '.Rootful'` examples were incorrect because `podman machine inspect` returns an array in the documented JSON output. Changed them to `jq '.[0].Rootful'`.
- The connection verification text implied only rootful machines expose a root connection. Podman machine exposes both rootless and rootful connections; the rootful connection commonly uses a `-root` suffix and `/run/podman/podman.sock`. Updated the explanation.
- The multiple-machine example used `podman --connection dev-rootful`, which would typically refer to the rootless connection for that machine. Changed it to `podman --connection dev-rootful-root` for explicit rootful access.
- The privileged-container example implied specific operations such as `modprobe` would always work. Updated the wording to clarify that privileged operations depend on VM configuration.

## Review Notes
Podman was not installed in the local review environment, so CLI help could not be checked locally. Commands and behavior were validated against current official Podman and Podman Desktop documentation instead.
