# Validation Summary: How to Configure Security Options in Quadlet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Quadlet
- systemd user services
- Linux capabilities
- SELinux labels
- seccomp profiles
- container read-only filesystems

## Sources Consulted
- Podman `podman-systemd.unit` official documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman `podman-run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-container-inspect` official documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html
- Podman `--security-opt` official option documentation: https://docs.podman.io/en/v4.4/markdown/options/security-opt.html

## Issues Found
- The capability example used `AddCapability=net_bind_service`. Podman Quadlet documents capability values in canonical `CAP_*` form, so this was changed to `AddCapability=CAP_NET_BIND_SERVICE`.
- The read-only filesystem example used `Volume=appdata.volume:/app/data` without defining a corresponding `appdata.volume` Quadlet file. Current Quadlet documentation treats `.volume` suffixes as references to Quadlet volume units, so this was changed to `Volume=appdata:/app/data`.
- The custom seccomp example used `PodmanArgs=--security-opt=seccomp=/path/to/custom-seccomp.json`. Quadlet provides the native `SeccompProfile=` directive, so the example was changed to `SeccompProfile=/path/to/custom-seccomp.json`.
- The no-new-privileges example used `PodmanArgs=--security-opt=no-new-privileges:true`. Quadlet provides the native `NoNewPrivileges=` directive, so the example was changed to `NoNewPrivileges=true`.
- The verification commands inspected `secure-app`, but Quadlet-generated containers are named with a `systemd-` prefix by default. The commands now inspect `systemd-secure-app` and `systemd-readonly-app`.
- The read-only verification command checked the secure-app container, which did not set `ReadOnly=true`. The verification snippet now starts `readonly-app.service` and checks `systemd-readonly-app`.
- The summary omitted native Quadlet directives for seccomp and no-new-privileges. It now lists `SeccompProfile` and `NoNewPrivileges`.

## Review Notes
The examples are accurate for current Podman Quadlet documentation. `PodmanArgs` remains available for unsupported generator options, but native Quadlet directives are preferable when they exist.
