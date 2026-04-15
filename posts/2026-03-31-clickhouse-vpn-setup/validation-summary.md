# Validation Summary: How to Set Up ClickHouse with a VPN

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (HTTP interface on port 8123, native TCP on port 9000)
- WireGuard VPN
- UFW (Uncomplicated Firewall)
- iptables (NAT/forwarding via WireGuard PostUp/PostDown)

## Sources Consulted
- WireGuard official documentation: https://www.wireguard.com/quickstart/
- WireGuard man page for wg(8) and wg-quick(8)
- ClickHouse server configuration documentation: https://clickhouse.com/docs/en/operations/server-configuration-parameters/settings#listen_host
- ClickHouse client documentation: https://clickhouse.com/docs/en/interfaces/cli
- ClickHouse HTTP interface documentation: https://clickhouse.com/docs/en/interfaces/http
- UFW documentation: https://help.ubuntu.com/community/UFW

## Issues Found
No technical issues found.

## Review Notes
- The post correctly uses placeholder values (`<server_private_key>`, `<client_public_key>`, etc.) for sensitive key material.
- Private key file permissions are not mentioned (ideally `chmod 600` on key files), but this is a best practice omission rather than a technical error.
- The architecture correctly separates the VPN subnet (10.8.0.0/24) from the private network where ClickHouse resides (10.0.0.5), with the server-side iptables rules handling forwarding and NAT between the two.
- The client `AllowedIPs = 10.0.0.0/8` is a broad range that covers both the VPN subnet and the ClickHouse private IP — this works but readers should be aware it routes all 10.x.x.x traffic through the tunnel.
- IP forwarding (`net.ipv4.ip_forward = 1` in sysctl) is a prerequisite for the server-side NAT/forwarding to work but is not explicitly mentioned. Most WireGuard setup guides include this step.
