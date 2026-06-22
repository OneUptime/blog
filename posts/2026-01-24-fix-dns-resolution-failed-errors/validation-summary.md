# Validation Summary: How to Fix 'DNS Resolution Failed' Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Linux DNS resolution
- glibc resolver configuration (`/etc/resolv.conf`)
- Name Service Switch (`/etc/nsswitch.conf`)
- `dig`, `nslookup`, `host`, and `getent`
- systemd-resolved and `resolvectl`
- NetworkManager and `nmcli`
- iptables, nftables, ufw, netcat, and tcpdump
- Docker and Docker Compose DNS configuration
- dnsmasq and nscd DNS caching

## Sources Consulted
- systemd `resolved.conf(5)` manual: https://man7.org/linux/man-pages/man5/resolved.conf.5.html
- systemd `resolvectl(1)` manual: https://man7.org/linux/man-pages/man1/resolvectl.1.html
- glibc `resolv.conf(5)` manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- glibc `nsswitch.conf(5)` manual: https://man7.org/linux/man-pages/man5/nsswitch.conf.5.html
- NetworkManager configuration manual: https://networkmanager.dev/docs/api/1.44.4/NetworkManager.conf.html
- Docker `dockerd` CLI reference: https://docs.docker.com/reference/cli/dockerd/
- Docker Engine networking documentation: https://docs.docker.com/engine/network/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- dnsmasq official man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- Local command help for `dig`, `resolvectl`, `nmcli`, `docker run`, `ufw`, and `nc`.

## Issues Found
- The post said `nslookup` queries DNS servers directly. By default, `nslookup google.com` queries the system's configured resolver, so the wording was changed to avoid implying that it bypasses local resolver configuration.
- The netcat command `nc -zv 8.8.8.8 53` tests TCP connectivity, while DNS commonly uses UDP as well. The comment was narrowed to "DNS TCP port" so the command description is accurate.
- The post described `/run/systemd/resolve/resolv.conf` as the systemd-resolved stub resolver file. That path contains the upstream resolver file; the stub resolver file is `/run/systemd/resolve/stub-resolv.conf`. The comment was corrected.
- The statement that modern Linux distributions use systemd-resolved was too broad. It was changed to "Many modern Linux distributions" because resolver defaults vary by distribution and configuration.
- The command `dig @8.8.8.8 +nocache google.com` used an invalid `dig` option. It was replaced with `dig @8.8.8.8 google.com`, which correctly bypasses the local resolver/cache by querying an upstream resolver directly.

## Review Notes
The remaining examples are technically plausible, but some commands are intentionally distribution- and environment-dependent. In particular, direct edits to `/etc/resolv.conf`, making it immutable with `chattr +i`, and disabling NetworkManager DNS management can conflict with systemd-resolved, DHCP, or distribution-specific network tooling. The post presents them as scenario-specific fixes, which is acceptable for a troubleshooting guide.
