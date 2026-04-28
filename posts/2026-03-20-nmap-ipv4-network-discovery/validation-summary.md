# Validation Summary: How to Use nmap for IPv4 Network Discovery

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- nmap (Network Mapper)
- IPv4 networking and subnet notation (CIDR)
- TCP/UDP port scanning techniques (SYN, Connect, UDP)
- Nmap Scripting Engine (NSE)
- Linux command-line tools

## Sources Consulted
- Official nmap reference guide: https://nmap.org/book/man.html
- nmap host discovery options: https://nmap.org/book/man-host-discovery.html
- nmap port scanning techniques: https://nmap.org/book/man-port-scanning-techniques.html
- nmap port specification: https://nmap.org/book/man-port-specification.html
- nmap service/version detection: https://nmap.org/book/man-version-detection.html
- nmap OS detection: https://nmap.org/book/man-os-detection.html
- nmap output options (-oA): https://nmap.org/book/man-output.html
- nmap timing templates: https://nmap.org/book/man-performance.html
- NSE documentation: https://nmap.org/book/nse.html

## Issues Found
No technical issues found.

All commands, flags, and behaviors verified against the official nmap reference guide:
- `-sn` correctly disables port scanning (ping-only/host discovery).
- `-p-` correctly scans all 65535 ports; default scans top 1000.
- `-F` correctly scans top 100 ports.
- `-sS` SYN scan requires root (raw packets); `-sT` TCP connect does not.
- `-sU` UDP scan requires root.
- The combined `-sSU -p T:22,80,443,U:53,161` syntax is the documented way to specify both TCP and UDP ports in a single scan.
- `-A` aggregates OS detection, version detection, script scanning, and traceroute (and requires root due to `-O`).
- `-oA <basename>` correctly produces three files: `.nmap`, `.xml`, and `.gnmap`.
- Timing templates `T0`–`T5` are correct (paranoid → insane).
- `--open`, `--exclude`, `-sC`, and `--script=<name>` are all valid and current.

## Review Notes
- The example output line `12 hosts are up (53 down)` is a stylized summary; real nmap output uses a slightly different format like `Nmap done: 256 IP addresses (12 hosts up) scanned in N seconds`. Since the example is clearly truncated/illustrative (note the `Starting Nmap ...`), this is not a technical error.
- On modern Linux distros, `-sS` and `-O` strictly require raw socket privileges; the post correctly uses `sudo` for these.
- The closing legal/ethical note about scanning permissions is appropriate and accurate.
