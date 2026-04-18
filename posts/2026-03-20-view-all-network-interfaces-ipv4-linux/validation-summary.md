# Validation Summary: How to View All Network Interfaces and Their IPv4 Addresses on Linux

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Linux `ip` command (iproute2)
- Linux `ifconfig` command (net-tools, legacy)
- `awk` text processing
- Python 3 (`subprocess`, `re` modules)

## Sources Consulted
- `ip(8)` man page (iproute2): https://man7.org/linux/man-pages/man8/ip.8.html
- `ip-address(8)` man page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip-link(8)` man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `ifconfig(8)` man page (net-tools): https://man7.org/linux/man-pages/man8/ifconfig.8.html
- Python `subprocess` docs: https://docs.python.org/3/library/subprocess.html
- Live verification of each command on a Linux system (kernel 6.17, iproute2)

## Issues Found
No technical issues found.

All commands were verified on a Linux system:
- `ip addr show` and short form `ip a` produce correct output.
- `ip -4 addr show` and `ip -f inet addr show` both filter to IPv4 only, as claimed.
- `ip addr show dev eth0` and the short form `ip a show eth0` both work (the `dev` keyword is optional).
- `ip link show up` correctly filters to UP interfaces; `ip -4 addr show up` works as well.
- The awk one-liner `ip -4 addr show | awk '/inet / {print $NF, $2}'` was verified to produce the expected interface/address pairs (the last field on an `inet` line is the interface label).
- The Python script's regular expressions correctly parse `ip -4 addr show` output — interface header lines match `^\d+:\s+(\S+):` and inet lines match `\s+inet (\S+)`.
- `ip -s link show` statistics command and its `dev` variant are correct.
- `ifconfig -a` and `ifconfig | grep "inet "` are accurate; the note that `ifconfig` is deprecated (net-tools has been largely superseded by iproute2 on modern distros) is correct.

## Review Notes
- The awk one-liner relies on the interface label being the last field of the `inet` line. This is generally true for IPv4 addresses under `ip -4 addr show`, but note that on interfaces with address labels (e.g., `eth0:0` aliases) the last field may be the label rather than the base interface name. Not a correctness issue — just worth knowing.
- `ifconfig` is not installed by default on many modern distributions (Debian 10+, Ubuntu 18.04+, RHEL 8+, Arch). Users may need to install `net-tools` to use it. The post already notes it is deprecated, which is appropriate.
- The example output uses `eth1 10.0.0.5/30`, which is an unusually small subnet (typical for point-to-point links) but is valid.
