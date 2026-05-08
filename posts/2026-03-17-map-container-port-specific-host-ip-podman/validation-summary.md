# Validation Summary: How to Map a Container Port to a Specific Host IP in Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Container networking
- Host port publishing
- IPv4 and IPv6 address binding
- Linux network verification with ss

## Sources Consulted
- Podman run official documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman port official documentation: https://docs.podman.io/en/latest/markdown/podman-port.1.html
- Podman inspect official documentation: https://docs.podman.io/en/latest/markdown/podman-inspect.1.html

## Issues Found
- The first example said the service was "Only accessible from the 192.168.1.0/24 network." Binding to `192.168.1.100` controls the local destination address/interface, but remote reachability still depends on routing and firewall policy. Changed the comment to "Accessible through the 192.168.1.100 host address."
- The final section was titled "Using --mount with Port Binding" even though the command demonstrated `--network mynetwork` and did not use `--mount`. Changed the heading to "Using --network with Port Binding."

## Review Notes
The `-p HOST_IP:HOST_PORT:CONTAINER_PORT` examples match Podman's documented `--publish` syntax. Podman documentation confirms that omitting the host IP or using `0.0.0.0` binds the published port on all host IPs, and `podman port` is the documented command for checking mappings. The local environment did not have the `podman` binary installed, so CLI behavior was verified against the official documentation rather than local `--help` output.
