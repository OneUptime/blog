# Validation Summary: How to Troubleshoot DNS Resolution Issues in Portainer - Troubleshoot

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Portainer Console / Exec
- Docker Engine
- Docker container networking and embedded DNS
- Docker Compose service DNS configuration
- Linux `/etc/resolv.conf` resolver options
- `iptables`, network namespaces, and `nsenter`
- DNS troubleshooting tools: `nslookup`, `dig`, `getent`, and `tcpdump`
- `jq` for Docker inspect output

## Sources Consulted
- Docker Engine DNS services documentation: https://docs.docker.com/engine/network/#dns-services
- Docker Engine iptables documentation: https://docs.docker.com/engine/network/firewall-iptables/
- Docker Engine nftables documentation: https://docs.docker.com/engine/network/firewall-nftables/
- Docker Compose services reference for `dns`, `dns_opt`, and `dns_search`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker daemon DNS troubleshooting documentation: https://docs.docker.com/engine/daemon/troubleshoot/#specify-dns-servers-for-docker
- Docker `dockerd` reference for daemon DNS options and `daemon.json` keys: https://docs.docker.com/reference/cli/dockerd/
- Docker `docker exec` CLI reference: https://docs.docker.com/reference/cli/docker/container/exec/
- Docker `docker network connect` CLI reference: https://docs.docker.com/reference/cli/docker/network/connect/
- Portainer container console documentation: https://docs.portainer.io/sts/user/docker/containers/console
- Linux `resolv.conf(5)` manual page: https://man7.org/linux/man-pages/man5/resolver.5.html
- Local command help output for `nsenter`, `tcpdump`, `dig`, `getent`, `jq`, `iptables`, and `nft`.

## Issues Found
- The `/etc/resolv.conf` example implied `nameserver 127.0.0.11` is expected for all Docker containers. Docker documents this as the embedded DNS behavior for custom/user-defined networks, while default bridge containers may inherit host DNS settings. Updated the wording and added the default bridge caveat.
- The exec examples assumed `bash` was available in the target container. Docker and Portainer require the selected shell to exist in the image, and many minimal images only include `sh` or `ash`. Changed the examples to use `sh`.
- The `tcpdump -n port 53` command could miss DNS traffic on loopback or non-default interfaces. Changed it to `tcpdump -ni any port 53` to capture DNS traffic across interfaces.
- The Docker DNS iptables check was shown as a host-level `iptables -t nat -L DOCKER_OUTPUT -n` command. Docker documents DNS firewall rules as being created in the container network namespace, so the command was changed to inspect the container namespace with `docker inspect -f '{{.State.Pid}}'` and `nsenter`.
- The firewall check used a broad `iptables -L -n | grep 53` command. Replaced it with a host `DOCKER-USER` forwarding-chain check, which is more relevant for container egress filtering.
- The Compose example used the obsolete top-level `version: "3.8"` property. Removed it to match the current Compose Specification.
- The `/etc/docker/daemon.json` block contained a `//` comment, which is invalid JSON. Moved the file path description outside the JSON block and kept the snippet valid.
- The daemon-level DNS text implied the setting affects all containers immediately. Updated it to say the setting applies to new containers and added a note to restart Docker after changing `daemon.json`.
- The `ndots` comments incorrectly said `ndots:0` would never append search domains. `ndots` controls when an initial absolute query is attempted; it does not disable search-domain behavior entirely. Updated the explanation and changed the Compose fix to `ndots:0` for short-name direct-first lookups.
- The Step 6 code fence mixed shell commands and YAML. Split it into separate `bash` and `yaml` blocks so the snippets are syntactically accurate.

## Review Notes
Docker was not installed in the local workspace, so Docker commands were validated against official Docker documentation rather than executed end-to-end against a daemon. The post now assumes Docker's default iptables backend; Docker 29's nftables backend is experimental, and a future update could add an nftables-specific inspection command. Public DNS resolvers such as `1.1.1.1` and `8.8.8.8` are appropriate for external DNS failures, but environments with internal or split-horizon DNS should use their internal resolvers instead.
