# Validation Summary: How to Set Up Floating/Virtual IPs on Ubuntu

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- Ubuntu networking
- Netplan
- iproute2 `ip` command
- Keepalived and VRRP
- ARP and gratuitous ARP with `arping`
- systemd service units
- DigitalOcean Floating/Reserved IP API
- AWS Elastic IP and EC2 Instance Metadata Service
- Google Cloud alias IP ranges
- HAProxy
- Nginx
- Linux sysctl networking settings

## Sources Consulted
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan `try` command documentation: https://netplan.readthedocs.io/en/latest/netplan-try/
- iproute2 `ip-address(8)` manual: https://man7.org/linux/man-pages/man8/ip-address.8.html
- iputils `arping(8)` manual: https://man7.org/linux/man-pages/man8/arping.8.html
- Keepalived configuration manual: https://manpages.debian.org/unstable/keepalived/keepalived.conf.5.en.html
- DigitalOcean Floating IP Actions API: https://docs.digitalocean.com/reference/api/reference/floating-ip-actions/
- AWS CLI `ec2 associate-address`: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-address.html
- AWS EC2 instance metadata documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html
- Google Cloud `gcloud compute instances network-interfaces update`: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instances/network-interfaces/update
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- systemd service unit documentation: https://www.freedesktop.org/software/systemd/man/systemd.service.html
- HAProxy configuration documentation: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/

## Issues Found
- Corrected the Netplan `try` description. It applies changes temporarily with rollback/confirmation; it is not a dry run.
- Corrected a Netplan comment that implied `optional: true` enables ARP filtering. It only marks the interface optional for boot/configuration timing.
- Removed invalid `ip addr add ... secondary` syntax. `secondary` is valid as a show/flush selector, while additional IPv4 addresses in the same prefix are shown as secondary by the kernel.
- Shortened Keepalived `auth_pass` values to eight characters or fewer because Keepalived only uses the first eight characters.
- Added `no_virtual_ipaddress` to the cloud-aware Keepalived example that intentionally has no local VIP managed by Keepalived.
- Changed a misleading ARP neighbor command comment from forcing a refresh to marking an existing neighbor entry reachable.
- Removed the version-sensitive Nginx `listen ... http2` usage from the HTTPS example.
- Fixed troubleshooting commands that wrote to `/etc/systemd/system` and `/etc/sysctl.conf` without `sudo`, and added `systemctl daemon-reload` after creating a unit file.

## Review Notes
DigitalOcean now generally presents these addresses as Reserved IPs, while the API documentation still includes Floating IP action endpoints for compatibility. Several examples are intentionally simplified and would still need environment-specific values, firewall rules, IAM/API credentials, and production secret handling before use.
