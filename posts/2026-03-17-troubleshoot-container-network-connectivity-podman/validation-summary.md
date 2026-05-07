# Validation Summary: How to Troubleshoot Container Network Connectivity in Podman

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Podman
- Podman container networking
- Netavark and aardvark-dns
- Linux bridge networking, routing, DNS, firewalls, and port publishing
- iptables, nftables, firewalld, iproute2, sysctl, ss, curl, ping, and nslookup

## Sources Consulted
- Podman `podman network` documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman `podman network inspect` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman network connect` documentation: https://docs.podman.io/en/stable/markdown/podman-network-connect.1.html
- Podman `podman info` documentation: https://docs.podman.io/en/latest/markdown/podman-info.1.html
- Podman `podman run --publish` documentation: https://docs.podman.io/en/v4.3/markdown/podman-run.1.html
- Podman `podman exec` documentation: https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- Podman `podman container inspect` documentation: https://docs.podman.io/en/latest/markdown/podman-container-inspect.1.html

## Issues Found
- The post stated that `net.ipv4.ip_forward` should be `1` for container networking in general. This is too broad because current Podman rootless networking defaults to pasta, while the rootful default bridge network is the case where host forwarding is relevant. Updated the text to say it should be enabled for rootful bridge networks that need external routing.
- The common-issues table used the abbreviated solution `podman network connect`, but the command requires a network and container argument. Updated the example to `podman network connect mynetwork myapp`.
- The port publishing example used `-p host:container`, which is easy to misread as host name syntax. Updated it to the documented `-p hostPort:containerPort` form.
- The rootless privileged-port solution named only `ip_unprivileged_port_start`. Updated it to the full sysctl name, `net.ipv4.ip_unprivileged_port_start`, and noted that using a high host port is also a valid fix.

## Review Notes
The commands are Linux-focused. Some examples depend on tools being present in the container image, such as `ip`, `ping`, `nslookup`, and `ss`; minimal images may require installing those diagnostic tools or using a debug container.
