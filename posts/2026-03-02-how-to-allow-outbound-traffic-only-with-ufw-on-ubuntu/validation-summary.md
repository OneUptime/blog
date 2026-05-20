# Validation Summary: How to Allow Outbound Traffic Only with UFW on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- UFW
- Linux netfilter / iptables
- TCP connection tracking
- Docker firewall interactions
- Firewall logging and network troubleshooting commands

## Sources Consulted
- Ubuntu `ufw(8)` manpage: https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html
- Ubuntu Server firewall documentation: https://ubuntu.com/server/docs/how-to/security/firewalls/
- Local UFW help and installed rule templates: `ufw --help`, `man ufw`, `/usr/share/ufw/before.rules`
- Docker packet filtering and firewall documentation: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Cloudflare IP ranges: https://www.cloudflare.com/ips/
- AWS CloudFront edge server IP range documentation: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/LocationsOfEdgeServers.html
- AWS CloudFront IP range list: https://d7uri8nf7uskq.cloudfront.net/tools/list-cloudfront-ips

## Issues Found
- The sample `ufw status verbose` output showed destination-specific outbound rules under the `From` column. UFW reports outbound destinations in the `To` column, so the PostgreSQL and message broker examples were corrected.
- The Scenario 2 configuration included `sudo ufw allow out on eth0 to any port 0:65535 proto tcp` as an established-traffic rule. Port `0` is invalid in UFW ranges, and the rule would broadly allow new outbound TCP traffic rather than only established traffic. The command was removed.
- The established-connection explanation implied that denying outgoing traffic can block inbound ACK/data responses for outbound-initiated connections. UFW's default before rules allow `RELATED,ESTABLISHED` traffic with conntrack, so the explanation and sample rules were corrected.
- The CI/CD example used DNS hostnames such as `security.ubuntu.com` and `archive.ubuntu.com` as UFW rule destinations. UFW destination rules require addresses, not hostnames, so the example was changed to allow HTTP/HTTPS generally or maintain explicit mirror IP ranges.
- The Cloudflare example used `104.16.0.0/12`, which Cloudflare removed from its official IPv4 list in favor of narrower ranges. The example was updated to `104.16.0.0/13`.

## Review Notes
Docker and UFW interaction remains version- and configuration-sensitive. The post's warning is accurate, and Docker's official documentation confirms that published container traffic can bypass UFW because Docker diverts packets before UFW's `INPUT` and `OUTPUT` chains.
