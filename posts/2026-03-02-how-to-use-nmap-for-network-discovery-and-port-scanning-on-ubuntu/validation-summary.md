# Validation Summary: How to Use nmap for Network Discovery and Port Scanning on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- nmap (Network Mapper)
- Ubuntu (apt package management)
- TCP/UDP networking
- ICMP, ARP
- Nmap Scripting Engine (NSE)

## Sources Consulted
- Official Nmap reference guide: https://nmap.org/book/man.html
- Nmap host discovery documentation: https://nmap.org/book/man-host-discovery.html
- Nmap port scanning techniques: https://nmap.org/book/man-port-scanning-techniques.html
- Nmap NSE documentation: https://nmap.org/book/nse.html
- Nmap port state docs: https://nmap.org/book/man-port-scanning-basics.html
- Nmap timing/performance: https://nmap.org/book/man-performance.html
- Nmap output formats: https://nmap.org/book/man-output.html
- Ubuntu package archive for nmap

## Issues Found
No technical issues found.

## Review Notes
- The `-sn` flag was renamed from `-sP` in Nmap 5.30BETA1 (2010), and the post correctly notes this.
- SYN scan (`-sS`) is the default only when nmap has raw packet privileges (typically via sudo/root). Without root, nmap falls back to TCP connect scan (`-sT`). The post uses `sudo` in the SYN scan examples, so the "default" framing is consistent.
- `-PR` (ARP ping) is automatically used by nmap when scanning a local Ethernet network as root, but explicitly specifying it is still valid; the caveat about local subnets is accurate.
- The `-sV` output example shows "PostgreSQL DB 12.0 - 14.8" — the "DB" suffix in the product name and version ranges are both legitimate outputs from the nmap-service-probes fingerprint database.
- OS detection (`-O`) needs at least one open and one closed TCP port for reliable results — correctly stated.
- `-p-` scans ports 1-65535 (65535 ports, excluding port 0 by default) — the post's wording is accurate.
- All NSE script references (`http-title`, `http-headers`, `ssl-cert`, `smtp-open-relay`, `http-methods`, `http-default-accounts`, `ssh-hostkey`, `dns-zone-transfer`, `vuln`, `auth`, `discovery`) are real and current scripts/categories.
- Legal/ethical warning at the top is appropriate and important for a port scanning tutorial.
