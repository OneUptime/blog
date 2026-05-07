# Validation Summary: How to Fix Podman Container DNS Resolution Failures

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Podman
- Netavark
- aardvark-dns
- systemd-resolved
- slirp4netns
- pasta
- containers.conf
- resolv.conf
- Podman Compose / Compose DNS settings

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman network inspect` documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman `podman network connect` documentation: https://docs.podman.io/en/stable/markdown/podman-network-connect.1.html
- Podman configuration files documentation: https://docs.podman.io/en/v5.3.2/markdown/podman.1.html
- containers/common `containers.conf` configuration reference: https://pkg.go.dev/go.podman.io/common/pkg/config
- systemd-resolved service man page: https://man7.org/linux/man-pages/man8/systemd-resolved.service.8.html
- systemd `resolved.conf` man page: https://man7.org/linux/man-pages/man5/resolved.conf.5.html
- Linux `resolv.conf` man page: https://man7.org/linux/man-pages/man5/resolv.conf.5.html

## Issues Found
- The section "Use the Resolved Stub Listener" actually instructed readers to use `/run/systemd/resolve/resolv.conf`, which bypasses the local stub and contains upstream DNS servers. Changed the heading to "Use the Resolved Upstream Configuration" to match systemd-resolved behavior.
- The command `sudo cat > /etc/systemd/resolved.conf.d/podman.conf` would not reliably write to a root-owned file because shell redirection is performed before `sudo` runs `cat`. Replaced it with `sudo tee /etc/systemd/resolved.conf.d/podman.conf >/dev/null`.
- The `DNSStubListenerExtra=10.88.0.1` fix made systemd-resolved listen on the Podman bridge address, but did not tell Podman containers to use that address as their DNS server. Added the required `podman run --dns 10.88.0.1 myimage` step.
- The heading "Configure systemd-resolved to Listen on All Interfaces" overstated the configuration. `DNSStubListenerExtra=10.88.0.1` listens on the specified Podman bridge address, not all interfaces. Updated the heading accordingly.

## Review Notes
Podman is not installed in the review environment, so commands could not be executed locally. CLI flags, configuration keys, and systemd-resolved behavior were checked against official Podman documentation, containers/common configuration references, and Linux/systemd man pages.
