# Validation Summary: How to Fix Rootless Podman Networking Issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Podman
- Rootless containers
- slirp4netns
- pasta and passt
- Netavark
- aardvark-dns
- firewalld
- nftables
- Linux sysctl networking settings

## Sources Consulted
- Podman network documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman run documentation: https://docs.podman.io/en/v5.2.0/markdown/podman-run.1.html
- containers.conf documentation: https://github.com/containers/common/blob/main/docs/containers.conf.5.md
- Podman rootless shortcomings: https://github.com/containers/podman/blob/main/rootless.md
- Podman rootless tutorial: https://github.com/containers/podman/blob/main/docs/tutorials/rootless_tutorial.md
- firewalld firewall-cmd documentation: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The post used `podman info --format '{{.Host.NetworkBackend}}'` as if it identified `slirp4netns` versus `pasta`. That field reports the Podman network backend such as `netavark` or `cni`, so the text now distinguishes that from the configured rootless networking command in `containers.conf`.
- The privileged-port workaround recommended setting `CAP_NET_BIND_SERVICE` on `rootlessport`. Podman's rootless documentation recommends lowering `net.ipv4.ip_unprivileged_port_start` or redirecting from privileged ports, so the section now uses a firewalld forward-port example instead.
- The post referenced `docker.host.internal`, which is not the Docker-compatible hostname. It now refers to `host.docker.internal` and explains that Podman adds the host aliases only when it can determine the correct host IP for the container network.
- The gateway-address section stated too broadly that the default gateway often points to the host. It now scopes the example to `slirp4netns` and notes that `allow_host_loopback=true` may be required.
- The default rootless networking section referred to the default `podman` network, which is rootful bridge terminology in current Podman docs. It now refers to the default rootless network mode.
- The firewalld section presented adding `podman0` to the trusted zone as rootless advice. It now identifies that as rootful bridge-network guidance and tells readers to inspect the specific rootless custom network interface instead.

## Review Notes
Podman was not installed in the local review environment, so CLI behavior was verified against official Podman and containers/common documentation rather than local `--help` output. The remaining commands and configuration snippets are syntactically valid and consistent with the referenced documentation, with the usual distribution-specific caveat that helper binary paths and package names can vary.
