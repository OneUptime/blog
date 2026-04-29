# Validation Summary: How to Use IPv6 Zone IDs and Scope Identifiers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 scoped addressing and zone IDs
- IPv6 link-local and multicast addressing
- Linux networking tools (`ip`, `ping`)
- OpenSSH (`ssh`, `scp`)
- `curl`
- Python `socket` and `urllib.parse`
- Windows `netsh` / WinINet IPv6 handling

## Sources Consulted
- RFC 4007, *IPv6 Scoped Address Architecture*: https://www.rfc-editor.org/rfc/rfc4007
- RFC 9844, *Entering IPv6 Zone Identifiers in User Interfaces*: https://www.rfc-editor.org/rfc/rfc9844
- Python `socket` documentation: https://docs.python.org/3.11/library/socket.html
- Microsoft Learn, `netsh interface`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Microsoft Learn, WinINet IPv6 support: https://learn.microsoft.com/en-us/windows/win32/wininet/ip-version-6-support
- OpenSSH `ssh(1)` manual: https://man.openbsd.org/ssh.1
- OpenSSH `scp(1)` manual: https://man.openbsd.org/scp.1
- curl URL syntax documentation: https://curl.se/docs/url-syntax.html

## Issues Found
- The post said zone IDs could be used on `2001:db8::1%eth0`. RFC 4007 says the `%<zone_id>` form is for non-global scoped addresses and is meaningless for global addresses, so the example was changed to scoped multicast (`ff02::1%eth0`).
- The URL section cited RFC 6874 as current. RFC 6874 was obsoleted by RFC 9844 in August 2025, so the wording was updated to describe `%25` as common tool/API syntax rather than current URI standard behavior.
- The Python URL helper concatenated `zone_id` directly even though it imported `urllib.parse`. It was updated to percent-encode the zone identifier string before assembling the host literal.
- The Linux discovery example `ip -6 addr show | grep "fe80::" | awk '{print $NF, $2}'` did not return interface names from `ip addr` output. It was replaced with `ip -o -6 addr show scope link | awk '{print $2, $4}'`, which does.
- The surrounding Linux example claimed to show link-local addresses "with their zones" but the original `ip -6 addr show | grep "scope link"` output did not include the interface on the same line. It was updated to `ip -o -6 addr show scope link` so the interface and address are shown together.
- The "No route to host" failure text for missing zone IDs was too specific to one environment. It was changed to a more accurate statement that the command will typically fail or be ambiguous when the interface is not otherwise implied.

## Review Notes
- The practical `curl` and Windows URI examples remain useful, but zone IDs inside URLs are not uniformly supported across browsers and URL parsers after RFC 9844. Tool-specific behavior is still common.
- `ssh user@fe80::1%iface` is valid as a hostname literal form, while `scp` needs brackets around literal IPv6 remote hosts because of the `host:path` syntax.
