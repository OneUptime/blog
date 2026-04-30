# Validation Summary: How to Set Up HAProxy with Keepalived for High Availability on IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HAProxy
- Keepalived
- VRRP
- Linux networking sysctl
- systemd

## Sources Consulted
- Keepalived man page: https://www.keepalived.org/manpage.html
- HAProxy Configuration Manual 3.2: https://docs.haproxy.org/3.2/configuration.html
- HAProxy health checks tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/reliability/health-checks/
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.1/networking/ip-sysctl.html
- HAProxy Enterprise documentation PDF: https://www.haproxy.com/documentation/pdfs/haproxy-enterprise.pdf

## Issues Found
- The backup-node Keepalived example was incomplete as written because it referenced `track_script chk_haproxy` without including the `vrrp_script` definition in that snippet. I expanded the backup example to a complete working configuration so the tracking reference is valid.
- The original `weight -10` only lowered the master's priority from 100 to 90, which matched the backup's priority and made failover non-deterministic. I changed it to `weight -20` and updated the explanation so the backup at priority 90 clearly wins when HAProxy is down.
- The original `auth_pass MySecretPass` exceeded the 8-character value Keepalived documents for `auth_type PASS`. I replaced it with the 8-character `Secret01` example.
- The non-local IP binding section implied that `net.ipv4.ip_nonlocal_bind = 1` was required for the exact HAProxy config shown, but the sample used `bind 0.0.0.0:80`, which already listens on all local IPv4 addresses. I corrected the text to make that sysctl step conditional on binding HAProxy directly to the VIP.

## Review Notes
- Keepalived documents `authentication { auth_type PASS ... }` as non-compliant with the VRRPv2 specification and recommends avoiding it where possible, though the sample remains valid syntax and commonly works in practice.
- The sample interface name `ens3` and the IP addresses are environment-specific examples and still need to be replaced with values from the reader's own network.
