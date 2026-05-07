# Validation Summary: How to Use arp-scan to Discover Hosts on a Local Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- `arp-scan`
- ARP
- IPv4 LAN host discovery
- Linux shell scripting
- `awk`, `sort`, `diff`, and `comm`

## Sources Consulted
- Upstream `arp-scan` repository and documentation: https://github.com/royhills/arp-scan
- Upstream `arp-scan` user guide wiki: https://github.com/royhills/arp-scan/wiki/arp-scan-User-Guide
- Debian man page for `arp-scan(1)`: https://manpages.debian.org/trixie/arp-scan/arp-scan.1.en.html
- Fedora package page for `arp-scan` availability, including EPEL 8/9 builds: https://packages.fedoraproject.org/pkgs/arp-scan/arp-scan/
- RFC 826, Address Resolution Protocol: https://datatracker.ietf.org/doc/html/rfc826
- RFC 5227, IPv4 Address Conflict Detection: https://datatracker.ietf.org/doc/rfc5227/

## Issues Found
- The RPM-based install command used `yum install arp-scan` without noting repository requirements. I changed it to `dnf install` and clarified that the example assumes EPEL on RHEL/CentOS Stream, which matches current package distribution.
- The duplicate-IP section was incorrect. `sort | uniq -D` only finds identical full lines, and the original `awk 'seen[$1]++'` would also flag repeated responses from the same host. I replaced it with a `--plain --format` pipeline that reports only IPs claimed by more than one unique MAC address.
- The baseline comparison section sorted full default `arp-scan` output, which includes changing headers and footers and would produce false diffs. I changed both commands to use `--plain --format` and `sort -u` so only stable host data is compared.
- The scheduled discovery script assumed `/var/lib/network-audit` already existed and would fail on first run. I added `mkdir -p "$(dirname "$KNOWN")"` and switched the scan pipeline to `--plain --format` output for more reliable parsing.
- The `--arpspa` example description said it was “for VLAN testing,” which is not what the option does. I changed the explanation to describe it accurately as setting the source IP in the ARP packet.
- The description and closing sentence were too absolute about discovery coverage and reliability. I narrowed them to active IPv4 hosts on the local segment and softened the closing claim so it matches upstream documentation more closely.

## Review Notes
- `arp-scan` is for local-link IPv4 discovery; ARP traffic does not traverse routers, so subnet examples only make sense for networks reachable on the local interface.
- The workspace did not have `arp-scan` installed, so command verification was done against upstream documentation, the published man page, and relevant RFCs rather than by executing the tool locally.
