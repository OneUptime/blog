# Validation Summary: How to Configure Docker Containers with Custom MTU Settings

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker Engine networking
- Docker bridge and overlay networks
- Docker Compose network configuration
- Linux networking tools: iproute2, ping, tracepath, tcpdump
- Path MTU Discovery and ICMP Fragmentation Needed
- AWS EC2 networking MTU
- Google Cloud VPN MTU
- Azure VM MTU

## Sources Consulted
- Docker Docs: Bridge network driver, including `com.docker.network.driver.mtu` and default bridge configuration: https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: `docker network create` CLI reference and bridge driver options: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Compose file `driver_opts` reference: https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Overlay network driver overview: https://docs.docker.com/engine/network/drivers/overlay/
- Local Docker CLI help for `docker network create` and `dockerd --help`.
- Local iputils `ping` help for `-M do`, `-s`, `-c`, and `-W`.
- Local iproute2 `ip link help` output for MTU configuration syntax.
- Local `tracepath` and `tcpdump` help output.
- RFC 1191: Path MTU Discovery: https://www.rfc-editor.org/rfc/rfc1191
- AWS EC2 User Guide: Network maximum transmission unit (MTU): https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html
- Google Cloud VPN documentation: MTU considerations: https://docs.cloud.google.com/network-connectivity/docs/vpn/concepts/mtu-considerations
- Microsoft Learn: Configure MTU for virtual machines in Azure: https://learn.microsoft.com/en-us/azure/virtual-network/how-to-virtual-machine-mtu
- Linux capabilities manual page for `CAP_NET_ADMIN`.

## Issues Found
- The AWS example used `8981` as the Docker network MTU for jumbo-frame intra-VPC traffic. Docker's bridge MTU option sets the container network MTU directly, and AWS documents jumbo frames as MTU 9001, so the example was corrected to `9001`.
- The AWS section implied broad VPC-wide jumbo-frame support. AWS documents that all EC2 instance types support MTU 1500, while jumbo-frame support depends on instance type and traffic path. The wording was narrowed to jumbo-frame-capable VPC paths.
- The GCP Cloud VPN example used `1460`, which is the Cloud VPN gateway MTU, not the tunnel payload MTU that container packets must fit within. The example was corrected to `1406` for Cloud VPN tunnels using AEAD ciphers on IPv4 gateway interfaces.
- The `tracepath` description said the output includes detected MTU for each hop. `tracepath` reports path MTU information when it detects MTU changes, so the wording was corrected.
- The `/proc/net/snmp` `FragFails` explanation stated definitively that incrementing counters mean packets are being dropped due to fragmentation issues. The wording was softened because the counter indicates fragmentation failures during tests, but should still be interpreted in context.

## Review Notes
The Docker network MTU commands, Compose `driver_opts` syntax, `daemon.json` `"mtu"` setting, `ping -M do` examples, `ip link` commands, tcpdump ICMP type/code filter, and temporary MTU change with `CAP_NET_ADMIN` are technically valid. GCP Cloud VPN payload MTU varies by cipher and IPv4 versus IPv6 gateway interfaces, so future updates could add a small lookup table if the post is expanded.
