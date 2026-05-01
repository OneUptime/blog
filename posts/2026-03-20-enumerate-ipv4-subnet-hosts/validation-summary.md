# Validation Summary: How to Enumerate All Host Addresses in an IPv4 Subnet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Python `ipaddress` module
- Python `concurrent.futures`
- Python `subprocess`
- IPv4
- CIDR subnetting
- Linux `ping`

## Sources Consulted
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Python `concurrent.futures` documentation: https://docs.python.org/3/library/concurrent.futures.html
- Python `subprocess` documentation: https://docs.python.org/3/library/subprocess.html
- Linux `ping(8)` manual for iputils: https://man7.org/linux/man-pages/man8/ping.8.html
- RFC 3021, Using 31-Bit Prefixes on IPv4 Point-to-Point Links: https://datatracker.ietf.org/doc/html/rfc3021

## Issues Found
- The post said `IPv4Network.hosts()` yields all addresses except network and broadcast. I narrowed that wording to the `/24` example and corrected the conclusion because Python documents special handling for `/31` and `/32`: `/31` includes both addresses and `/32` returns the single address.
- The conclusion said concurrent subnet scans run “without blocking.” I changed this to “probe many hosts in parallel” because the example uses blocking `subprocess.run()` calls inside a `ThreadPoolExecutor`.

## Review Notes
The `ping` example is correct for Linux `ping` from iputils, including `-c` and `-W`. The post does not cover portability differences for macOS or Windows.
