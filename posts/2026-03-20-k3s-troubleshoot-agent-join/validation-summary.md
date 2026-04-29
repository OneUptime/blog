# Validation Summary: How to Troubleshoot K3s Agent Join Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Linux systemd and journald
- Linux networking and firewall tooling (`curl`, `nc`, `ufw`, `firewall-cmd`, `openssl`)
- TLS certificates and node registration

## Sources Consulted
- K3s Requirements: https://docs.k3s.io/installation/requirements
- K3s Token CLI: https://docs.k3s.io/cli/token
- K3s Architecture: https://docs.k3s.io/architecture
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Certificate CLI: https://docs.k3s.io/cli/certificate
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s Uninstalling K3s: https://docs.k3s.io/installation/uninstall
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Cluster Load Balancer: https://docs.k3s.io/datastore/cluster-loadbalancer
- Kubernetes API health endpoints: https://kubernetes.io/docs/reference/using-api/health-checks/
- Local CLI help output for `journalctl`, `timedatectl`, `openssl s_client`, and `nc`

## Issues Found
- Replaced `https://<server-ip>:6443/healthz` with `https://<server-ip>:6443/readyz` because Kubernetes documents `/healthz` as deprecated.
- Corrected UDP connectivity checks from `nc -zv` to `nc -zvu`, and added WireGuard IPv6 port `51821`, because K3s documents Flannel VXLAN and WireGuard ports as UDP and notes `51821` for IPv6.
- Corrected firewall guidance so the post reflects K3s’ documented port requirements by networking mode, and clarified that port `10250` is relevant for node-to-node kubelet access when metrics-server is used.
- Corrected token guidance to use `agent-token` for agent joins, retained `node-token` as a default-install fallback, and replaced the overspecific token-format example with the documented secure token format.
- Replaced deletion of `/var/lib/rancher/k3s/server/cred/node-passwd` with deletion of the old Node object, because current K3s documents node passwords as Kubernetes secrets tied to the Node resource.
- Updated the certificate SAN remediation step to rotate the API server certificate and restart K3s, instead of implying that a restart alone will regenerate the certificate with new SANs.
- Corrected the stated K3s agent memory requirement from `~256MB` to the documented `512MB` minimum, and clarified that the kernel cmdline example enables memory cgroups rather than “cgroup v2 memory”.
- Replaced broad manual cleanup steps, including flushing all iptables tables, with the documented uninstall-and-rejoin approach using `k3s-agent-uninstall.sh` and removal of the old Node object.
- Replaced bootstrap-token inspection via `kubectl get secrets ... | grep bootstrap` with the documented `k3s token list` command for clusters that use expiring bootstrap tokens.

## Review Notes
- Validated against the current K3s and Kubernetes documentation available on 2026-04-29.
- Some generic troubleshooting tools in the post, such as `telnet`, `dig`, `traceroute`, `chronyc`, or `ntpq`, may not be installed by default on minimal Linux images; this is not a correctness issue, but operators may need to install them.
