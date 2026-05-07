# Validation Summary: How to Use ARP for Network Discovery and Host Enumeration

## Status
validated

## Post Type
Guide

## Technologies Covered
- ARP
- `arp-scan`
- `nmap`
- Python
- Scapy
- Linux `ip neigh`
- MAC OUI/vendor lookup

## Sources Consulted
- `arp-scan(1)` manual page: https://man.archlinux.org/man/arp-scan.1.en
- Nmap host discovery reference: https://nmap.org/book/man-host-discovery.html
- Nmap host discovery techniques: https://nmap.org/book/host-discovery-techniques.html
- Scapy usage documentation: https://scapy.readthedocs.io/en/stable/usage.html
- Scapy `sendrecv` API reference: https://scapy.readthedocs.io/en/latest/api/scapy.sendrecv.html
- RFC 826, ARP: https://www.ietf.org/rfc/rfc826
- `ip-neighbour(8)` man page: https://manpages.debian.org/bookworm/iproute2/ip-neighbour.8.en.html
- Homebrew `arp-scan` formula: https://formulae.brew.sh/formula/arp-scan
- Fedora Packages `arp-scan` package overview and EPEL availability: https://packages.fedoraproject.org/pkgs/arp-scan/arp-scan/index.html

## Issues Found
- The post said all hosts must respond to ARP on their subnet. I updated this to active IPv4 hosts on the local subnet should respond to ARP requests for their own addresses, which is more accurate and matches ARP's IPv4 local-link scope.
- The `arp-scan --retry=3` example was described as showing duplicate replies. I corrected the comment because `--retry` controls retransmission; duplicate reply display is a separate default behavior.
- The Nmap example implied `--send-eth` is how to show MAC addresses. I replaced the second example with plain `nmap -sn` and clarified that ARP is already the default on local Ethernet networks.
- The Scapy ARP sweep docstring claimed the function returned `(ip, mac)` tuples, but the code actually returns dictionaries. I updated the docstring to match the implementation.
- The passive Scapy monitor only handled ARP replies. I updated it to handle ARP requests and replies so it matches Scapy's documented monitoring pattern and passively discovers more host mappings.
- The RHEL-family install line used `yum` and omitted that `arp-scan` is commonly provided via EPEL on RHEL. I updated it to `dnf` with an EPEL note.

## Review Notes
- `arp-scan` and `nmap` were not installed in the review environment, so CLI options were verified against upstream documentation and man pages rather than local `--help` output.
- The Linux ARP cache example is consistent with the post's Linux tag because it relies on `ip neigh`.
- ARP-based discovery can be less trustworthy on networks using proxy ARP; Nmap documents this caveat for local-network discovery.
