# Validation Summary: How to Configure IP Forwarding for Podman Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Linux IP forwarding
- Linux sysctl
- iptables/netfilter
- firewalld
- Container bridge networking
- NAT and DNAT

## Sources Consulted
- Podman network documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman network inspect documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman run documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Local sysctl(8) manual
- Local iptables and iptables-extensions help/manual output

## Issues Found
- The permanent sysctl example used `sudo cat > /etc/sysctl.d/...`, but shell redirection would still run as the unprivileged user. Changed it to `sudo tee ... > /dev/null`.
- The rootless Podman section described checking the container network mode but used a Podman network backend query. Changed the example to inspect a running container's `HostConfig.NetworkMode`.
- The inter-network communication section stated that containers on separate Podman networks cannot communicate by default. Current Podman/Netavark behavior depends on network and firewall configuration, and network isolation is controlled with network options. Reworded the statement to apply the forwarding rules when firewall policy blocks bridge-to-bridge forwarding.
- The same section said it was adding routes inside containers, but the commands only collected container IP addresses. Corrected the text to match the commands.
- Route changes inside containers require network administration capability. Added `--cap-add NET_ADMIN` to the example application containers and router container so the later `ip route add` and forwarding setup are feasible.
- The manual DNAT example said "from the host," which could imply locally generated host traffic. Clarified that the PREROUTING DNAT rule applies to traffic arriving at the host port.
- The Fedora/RHEL iptables persistence example used `sudo iptables-save > /etc/sysconfig/iptables`, which has the same unprivileged shell redirection problem. Changed it to run the redirection inside `sudo sh -c`.

## Review Notes
Podman can manage bridge sysctls, masquerading, and port forwarding for managed bridge networks, so many manual iptables examples are best treated as advanced or troubleshooting scenarios rather than the normal path. The post now reflects that the exact forwarding behavior can depend on Podman network options and host firewall policy.
