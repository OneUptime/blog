# Validation Summary: How to Run a Container with Port Mapping in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Containers
- Container networking
- Port publishing and forwarding
- Rootless Podman
- Linux sysctl networking settings

## Sources Consulted
- Podman `podman-run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `--publish` official documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html#publish-p-ip-hostport-containerport-protocol
- Podman `podman-port` official documentation: https://docs.podman.io/en/v4.3/markdown/podman-port.1.html
- Podman project rootless documentation and README: https://github.com/containers/podman
- Red Hat rootless Podman privileged port guidance: https://access.redhat.com/solutions/7044059

## Issues Found
- The `--publish` format was shown as requiring a host port. Updated it to the official optional form, `[[host-ip:][host-port]:]container-port[/protocol]`, because Podman supports random host port assignment when the host port is omitted.
- The port conflict explanation said a host port can only be used by one container. Narrowed this to the same host IP, port, and protocol combination, which is the accurate binding constraint.
- The rootless low-port sysctl example only showed `podman machine ssh`, which applies to Podman Machine environments. Added the native Linux `sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80` command and clarified that the existing command is for Podman Machine.
- The summary used `-p HOST:CONTAINER`, which could be confused with a host name or host IP. Updated it to `-p HOST_PORT:CONTAINER_PORT`.

## Review Notes
The remaining examples match Podman's documented `--publish` and `podman port` behavior. Podman was not installed in the local environment, so command verification used official Podman documentation rather than local `--help` output.
