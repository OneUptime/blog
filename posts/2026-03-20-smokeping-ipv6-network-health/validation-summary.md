# Validation Summary: How to Monitor IPv6 Network Health with Smokeping

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- SmokePing
- SmokePing `FPing` and `FPing6` probes
- `fping`
- IPv6 ICMP probing
- Linux systemd services and journal logs
- SmokePing alert and target configuration

## Sources Consulted
- SmokePing configuration reference: https://www.smokeping.org/smokeping/doc/smokeping_config.en.html
- SmokePing `FPing6` probe documentation: https://www.smokeping.org/smokeping/probe/FPing6.en.html
- Debian SmokePing `FPing6` probe man page: https://manpages.debian.org/unstable/smokeping/Smokeping_probes_FPing6.3.en.html
- SmokePing command-line documentation: https://www.smokeping.org/smokeping/doc/smokeping.en.html
- Official `fping` man page: https://fping.org/fping.8.html
- Debian `fping6` compatibility man page: https://manpages.debian.org/testing/fping/fping6.8.en.html
- Debian SmokePing package sample configuration: https://sources.debian.org/src/smokeping/2.7.3-4.1/etc/config.dist.in
- Debian SmokePing Apache/FastCGI notes: https://sources.debian.org/src/smokeping/2.8.2%2Bds-1/debian/README.Debian
- Google Public DNS setup documentation: https://developers.google.com/speed/public-dns/docs/using
- Cloudflare 1.1.1.1 IP address documentation: https://developers.cloudflare.com/1.1.1.1/ip-addresses/
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/info/rfc3849
- Debian `journalctl` man page: https://manpages.debian.org/unstable/systemd/journalctl.1.en.html

## Issues Found
- The installation check used `fping6` directly. Debian documents `fping6` as a compatibility symlink, while current `fping` supports `-6`; updated the verification command to `fping -6 -c 3`.
- The alert definitions were not enabled for any target. Added `alerts = ipv6-loss-alert,ipv6-latency-alert` to the root target so the configured detectors are inherited by the IPv6 targets.
- The alert comments described simple thresholds, but the patterns detect transitions from good samples to bad samples. Reworded the comments to match SmokePing's alert pattern semantics.
- The General configuration omitted mandatory `cgiurl` and used `.dist` mail template paths. Added `cgiurl` and changed the template paths to the Debian/Ubuntu package paths `/etc/smokeping/smokemail` and `/etc/smokeping/tmail`.
- The example used `2001:db8::/32` for internal servers without noting that it is documentation-only. Added a comment telling readers to replace those addresses with real internal IPv6 addresses.
- The log-follow command tailed `/var/log/syslog`, which is not always present on systemd-based Debian/Ubuntu systems. Replaced it with `sudo journalctl -u smokeping -f`.
- The dashboard URL omitted the packaged CGI path. Updated the example to `http://your-server/smokeping/smokeping.cgi?target=InternalServers.WebServer01`.

## Review Notes
The remaining SmokePing probe names, `binary`, `offset`, `step`, `pings`, target `host`, alert `type`, and alert `pattern` syntax match the referenced SmokePing documentation. The Google and Cloudflare IPv6 resolver addresses are correct. I could not run `smokeping --check` locally because SmokePing is not installed in this workspace.
