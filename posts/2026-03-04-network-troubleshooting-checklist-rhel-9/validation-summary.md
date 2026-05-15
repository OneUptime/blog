# Validation Summary: How to Build a Network Troubleshooting Checklist for RHEL

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9 networking
- NetworkManager and nmcli
- iproute2 commands: ip, ss
- ethtool
- DNS tools: dig, resolvectl, /etc/resolv.conf
- firewalld
- SELinux auditing and port labeling
- Bash diagnostic scripting
- curl

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring and managing networking: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/index
- Red Hat Enterprise Linux 9: Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- Red Hat Enterprise Linux 9: Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- firewalld default zone documentation: https://firewalld.org/documentation/zone/default-zone.html
- GNU Bash Reference Manual, redirections: https://www.gnu.org/software/bash/manual/html_node/Redirections.html
- curl command-line documentation: https://curl.se/docs/manpage.html
- Local command help output for iproute2 `ip route`, `ip neigh`, `ss`, NetworkManager `nmcli`, systemd `resolvectl`, BIND `dig`, and `curl`.

## Issues Found
- The Layer 4 "Test a specific port" command used `ss -tn state established dst example.com`. `ss` lists sockets; it does not initiate a connection and therefore does not test whether a remote TCP port is reachable. Replaced it with a Bash `/dev/tcp` connection attempt wrapped in `timeout`, which actually opens a TCP socket.
- The diagnostic script advertised `[target_host]`, but `ip route get "$TARGET"` only accepts an address/prefix, not an unresolved hostname. Added `getent ahostsv4` resolution for the route lookup while keeping the original target for ping output.
- Quoted shell variables in the diagnostic script's interface, route, gateway, and ping commands to avoid word-splitting issues.

## Review Notes
- `resolvectl` is accurate when `systemd-resolved` is in use, but RHEL deployments may rely on NetworkManager-managed `/etc/resolv.conf` without `systemd-resolved`.
- Temporarily stopping `firewalld` is valid as a diagnostic step, but it should be used carefully on production systems.
- The reviewed script now passes `bash -n` syntax validation.
