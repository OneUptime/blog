# Validation Summary: How to Troubleshoot Intermittent DNS Failures

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- DNS resolution and resolver failover
- BIND `dig`
- Bash
- Linux `/etc/resolv.conf`
- `systemd-resolved` and `resolvectl`
- `ping`/ICMP path testing
- Unbound caching resolver

## Sources Consulted
- ISC BIND 9 `dig` manual pages: https://bind9.readthedocs.io/en/v9.18.30/manpages.html
- Linux `resolv.conf(5)` manual page: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- systemd `resolvectl(1)` manual page: https://man7.org/linux/man-pages/man1/resolvectl.1.html
- RFC 7766, DNS Transport over TCP: https://www.rfc-editor.org/rfc/rfc7766.html
- Unbound official documentation and `unbound(8)` manual page: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.html
- Local `dig -h`, `resolvectl --help`, `man resolv.conf`, `man resolvectl`, and `man ping` output on Ubuntu/systemd 255

## Issues Found
- The monitoring script parsed the `dig` status from field 4, which is `QUERY,` in normal `dig` output rather than `NOERROR`. Changed the parser to extract the value after `status:` so successful lookups are not logged as failures.
- The default domain list included placeholder/internal names that may not resolve outside the author's environment. Reduced the default list to known public domains and added a comment to add real application/internal hostnames.
- The script wrote to `/var/log` without noting the required permissions. Added a concise comment to run as root or choose a writable log path.
- The `resolvectl statistics | grep queries` example was not reliable because documented `resolvectl statistics` output is resolver statistics, not a guaranteed lowercase `queries` line. Changed it to `resolvectl statistics` and added `resolvectl monitor` for live local query activity on systemd 252+.
- The packet-loss diagnosis implied ICMP loss directly equals DNS query loss. Clarified that ICMP path loss is a signal that can also affect DNS, not proof by itself.
- The failure-capture function hardcoded Google DNS for both public and internal names. Added a resolver variable and a note to replace it with the configured resolver for internal names.
- The `/etc/resolv.conf` snippet used inline comments after `nameserver` entries, while the Linux manual documents comments as lines beginning with `#` or `;`. Moved comments to their own lines and clarified secondary resolver behavior as timeout-based.
- The TCP workaround only tested `dig +tcp` and did not mention how application lookups would use TCP. Added the glibc `options use-vc` note, verified against `resolv.conf(5)`.
- The Unbound fix only started the service and did not point the host at the local cache. Updated it to enable/start Unbound and note that the host must use `nameserver 127.0.0.1`.

## Review Notes
The examples assume a Linux host with BIND `dig`, iputils `ping`, and systemd-resolved when using `resolvectl`. On systems where `/etc/resolv.conf` is managed by NetworkManager or systemd-resolved, persistent DNS changes should be made through the system's network configuration rather than by directly overwriting the file.
