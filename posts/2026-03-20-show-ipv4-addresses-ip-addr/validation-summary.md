# Validation Summary: How to Show All IPv4 Addresses with ip -4 addr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- iproute2 `ip` command
- IPv4 addressing
- GNU grep
- awk
- Python JSON formatting
- net-tools `ifconfig`

## Sources Consulted
- iproute2 `ip(8)` manual page: https://man7.org/linux/man-pages/man8/ip.8.html
- iproute2 `ip-address(8)` manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- Debian Reference, low-level network configuration and net-tools replacement table: https://www.debian.org/doc/manuals/debian-reference/ch05.en.html
- GNU Grep manual, `-o` and `-P` options: https://www.gnu.org/software/grep/manual/grep.html
- Local `iproute2` command help/output from `iproute2-6.1.0`: `ip -Version`, `ip addr help`, `ip -4 addr show`, `ip -4 -brief addr show`, and `ip -4 -json addr show`

## Issues Found
- The sample output for `ip -4 addr show` showed the interface name and `inet` address on the same line. Default `ip addr show` output prints an interface header line, then the IPv4 address and lifetimes on separate indented lines. Updated the sample output to match the documented and observed default format.

## Review Notes
- `ip -4` is correctly documented as an IPv4 filter; the `ip(8)` manual defines `-4` as a shortcut for `-family inet`.
- `ip -4 -brief addr show`, `ip -4 -json addr show`, scope filtering, and address extraction examples are valid for current `iproute2`.
- The `grep -oP` examples are valid with GNU grep; `-P` is a GNU/PCRE option and may not be portable to non-GNU grep implementations.
