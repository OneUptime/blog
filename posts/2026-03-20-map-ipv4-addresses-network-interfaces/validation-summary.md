# Validation Summary: How to Map IPv4 Addresses to Physical Network Interfaces

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Linux networking commands (`ip`, `ifconfig`)
- Windows networking command (`ipconfig`)
- Python `socket` module
- Python `psutil` library
- IPv4 addressing and multi-homed host configuration

## Sources Consulted
- [Python socket module documentation](https://docs.python.org/3/library/socket.html)
- [Python Socket Programming HOWTO](https://docs.python.org/3.12/howto/sockets.html)
- [psutil documentation](https://psutil.readthedocs.io/)
- [Microsoft `ipconfig` command documentation](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig)
- [Linux `ip-address(8)` manual page](https://man7.org/linux/man-pages/man8/ip-address.8.html)
- [Linux `ifconfig(8)` manual page](https://man7.org/linux/man-pages/man8/ifconfig.8.html)
- Local CLI help: `ip address help`

## Issues Found
1. **Python example claimed cross-platform support while importing a Unix-only module**: The original snippet imported `fcntl`, `struct`, and `os`, even though those modules were unused, and `fcntl` is not available on Windows. I removed the unused imports and kept only `socket` and `psutil` so the example matches its stated cross-platform intent.
2. **Python example description did not match the implementation**: The docstring said the function "Uses Python's socket module for cross-platform support," but the interface enumeration is actually performed by `psutil.net_if_addrs()`, with `socket` used only for the `AF_INET` constant. I updated the docstring to correctly describe `psutil` as the cross-platform API in use.
3. **Secondary address terminology was imprecise**: The post described adding a second address with `ip addr add` as an "IP alias". The `ip-address(8)` documentation explicitly notes that multiple addresses on one device are not really treated as aliases. I changed the wording to "second IP address" and updated the takeaway to say an interface can have multiple IP addresses assigned to it.
4. **Service-binding section described IP binding as interface binding**: The example used `socket.bind(("10.0.1.10", 8080))`, which binds to a local address, not directly to a NIC device. I changed the section heading and inline comments to describe binding to a specific local IP address, which matches Python's socket documentation and the Socket Programming HOWTO.

## Review Notes
- The Linux `ip` examples are technically valid. The documented form is `ip addr show dev <ifname>`, though the shorter `ip addr show eth0` form also works in practice.
- `ifconfig` is valid as a display tool, but it is legacy on many Linux systems compared with `ip`.
- The `ip addr add` examples change the running network configuration immediately, but persistence across reboots is distro- and network-manager-specific and is outside the scope of the post.
