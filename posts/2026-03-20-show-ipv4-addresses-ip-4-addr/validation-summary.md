# Validation Summary: How to Show IPv4 Addresses Using `ip -4 addr`

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux networking
- iproute2 `ip` command
- IPv4 addressing
- Shell pipelines with `grep`, `awk`, and `cut`

## Sources Consulted
- iproute2 upstream `ip(8)` manual: https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/plain/man/man8/ip.8
- iproute2 upstream `ip-address(8)` manual: https://git.kernel.org/pub/scm/network/iproute2/iproute2.git/plain/man/man8/ip-address.8.in
- Local `iproute2` documentation and command help: `ip -V`, `ip addr help`, `man ip`, and `man ip-address`
- GNU grep manual: https://www.gnu.org/software/grep/manual/grep.html
- Local command checks for `ip -4 addr show`, `ip -4 -br addr`, `grep -oP`, `awk`, and `cut`

## Issues Found
- The section titled "List All Interfaces with IPv4 Addresses" used a pipeline that prints only IPv4 address strings, not interface names. Changed the heading to "List All IPv4 Addresses" so the prose accurately matches the command output.

## Review Notes
The `show eth0` shorthand works with iproute2, although the documented form is `show dev eth0`. The `grep -P` example is valid with GNU grep, which is common on Linux, but it is not portable to every non-GNU grep implementation.
