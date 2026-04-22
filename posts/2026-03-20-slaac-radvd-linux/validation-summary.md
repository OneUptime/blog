# Validation Summary: How to Configure radvd on Linux for SLAAC

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- radvd
- Linux IPv6 sysctl settings
- IPv6 Router Advertisements
- SLAAC
- RDNSS and DNSSL
- tcpdump
- rdisc6
- systemd

## Sources Consulted
- radvd upstream `radvd.conf(5)` man page: https://github.com/radvd-project/radvd/blob/master/radvd.conf.5.man
- Debian `radvd.conf(5)` man page: https://manpages.debian.org/testing/radvd/radvd.conf.5.en.html
- Debian `radvd(8)` man page: https://manpages.debian.org/testing/radvd/radvd.8.en.html
- Debian `radvdump(8)` man page: https://manpages.debian.org/testing/radvdump/radvdump.8.en.html
- Debian `rdisc6(8)` man page: https://manpages.debian.org/testing/ndisc6/rdisc6.8.en.html
- Debian `tcpdump(8)` man page: https://manpages.debian.org/testing/tcpdump/tcpdump.8.en.html
- Linux kernel IPv6 sysctl documentation: https://docs.kernel.org/6.8/networking/ip-sysctl.html
- RFC 4861, Neighbor Discovery for IPv6: https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8106, IPv6 RA Options for DNS Configuration: https://datatracker.ietf.org/doc/html/rfc8106

## Issues Found
- The configuration examples wrote directly to `/etc/radvd.conf` with `cat > /etc/radvd.conf`, which fails for a normal sudo-based shell session. Changed each example to `sudo tee /etc/radvd.conf > /dev/null << 'EOF'`.
- The full configuration said `IgnoreIfMissing` prevents failure when an interface is absent but set it to `off`. Changed it to `IgnoreIfMissing on`.
- The `MinRtrAdvInterval` default comment used `200` as the default minimum. Updated it to radvd's documented `0.33 * MaxRtrAdvInterval`.
- The `radvd --configtest` example omitted `sudo` and documented the wrong success output. Updated the command and expected output to match radvd 2.19 behavior.
- The `radvdump` wording implied it dumps outbound advertisements on all interfaces. Updated it to say it dumps incoming RA content visible to the host, matching `radvdump(8)`.
- The `systemctl status` example claimed to check statistics. Changed it to verify that radvd is running.
- Added a clarification that `2001:db8::/64` is an example prefix and should be replaced with the user's routed/delegated LAN prefix.

## Review Notes
- Verified the minimal, full, and multi-interface radvd configuration snippets with Ubuntu noble's radvd 2.19 `--configtest`; all parsed successfully.
- The examples still use `2001:db8::/32` documentation addresses, which is appropriate for examples but not routable in production.
- The RDNSS and DNSSL lifetime values are syntactically valid. For lossy networks, RFC 8106 and newer radvd defaults favor longer DNS option lifetimes.
