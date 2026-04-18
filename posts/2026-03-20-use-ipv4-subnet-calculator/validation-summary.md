# Validation Summary: How to Use an IPv4 Subnet Calculator

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Jodies `ipcalc` (Debian/Ubuntu CLI)
- `sipcalc` CLI
- Python standard library `ipaddress` module (`IPv4Interface`, `IPv4Network`)
- IPv4 CIDR / VLSM concepts
- Online subnet calculators (subnet-calculator.com, cidr.xyz, mxtoolbox.com, jodies.de/ipcalc)

## Sources Consulted
- Jodies ipcalc man page (Debian): https://manpages.debian.org/bookworm/ipcalc/ipcalc.1.en.html
- Jodies ipcalc upstream: http://jodies.de/ipcalc
- sipcalc man page: https://manpages.debian.org/bookworm/sipcalc/sipcalc.1.en.html
- sipcalc upstream: https://www.routemeister.net/projects/sipcalc/
- Red Hat/nmav ipcalc (RHEL/Fedora): https://gitlab.com/ipcalc/ipcalc
- Python `ipaddress` module docs: https://docs.python.org/3/library/ipaddress.html
- RFC 4632 (CIDR) and RFC 950 (subnetting)

## Issues Found

1. **Incorrect `ipcalc --split` semantics.** The original example `ipcalc 192.168.1.0/24 --split 8` was commented as "split a /24 into /27s." Per the Jodies ipcalc man page, `-s/--split` takes a list of **host counts** (each value is rounded up to the next power of two plus network/broadcast), so `--split 8` allocates a single /28. Fixed by changing the command to `--split 30 30 30 30 30 30 30 30` (eight /27s, each holding 30 usable hosts) and clarifying that the values are host counts.

2. **Incorrect sipcalc VLSM syntax.** The original `sipcalc -s 100 -s 50 -s 20 192.168.20.0/24` does not work: sipcalc's `-s/--v4split` accepts a single prefix/mask and performs an equal-size split only (100, 50, 20 are not valid IPv4 prefixes). Fixed to `sipcalc -s 27 192.168.20.0/24` and noted that sipcalc has no true VLSM mode.

3. **Ambiguous RHEL/CentOS install line.** `sudo yum install ipcalc` on RHEL/CentOS/Fedora installs a different tool (Red Hat/nmav ipcalc) whose output and `--split` flag (takes a prefix, not host counts) differ from the Jodies version whose output is displayed in the post. Removed the RHEL line and added a short note explaining the distinction.

## Review Notes
- The Python `ipaddress` code is correct on Python 3.3+: `IPv4Interface.ip`, `network`, `network.hosts()`, `network_address`, `broadcast_address`, `netmask`, `hostmask`, `prefixlen`, and `num_addresses` are all valid public attributes/methods. Note: `net.hosts()` returns an empty iterator for /31 and /32, but the example inputs avoid those edge cases.
- The `ipcalc` sample output for `192.168.10.45/26` is mathematically correct: network 192.168.10.0, broadcast 192.168.10.63, usable hosts 1–62, wildcard 0.0.0.63, and the binary decomposition is accurate.
- External URLs listed in the online calculator table are all currently reachable resources.
- Future caveat: if a reader is on RHEL/Fedora, they should install the Jodies tool from source or EPEL, or use the RHEL `ipcalc` with its own syntax (e.g. `ipcalc --split 27 192.168.1.0/24`, note capital `-S` is not required — both work on recent nmav versions).
