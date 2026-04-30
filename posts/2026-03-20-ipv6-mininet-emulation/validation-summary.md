# Validation Summary: How to Use Mininet for IPv6 Network Emulation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Mininet
- IPv6
- Linux networking commands (`ip`, `ping`, `sysctl`)
- Open vSwitch bridge mode
- Python

## Sources Consulted
- Mininet download and package-install guidance: https://mininet.org/download/
- Mininet walkthrough: https://mininet.org/walkthrough/
- Mininet overview: https://mininet.org/overview/
- Mininet API reference for `Mininet`: https://mininet.org/api/classmininet_1_1net_1_1Mininet.html
- Mininet `mn` launcher source: https://raw.githubusercontent.com/mininet/mininet/master/bin/mn
- Mininet network source (`addHost()`, `pingAll()`): https://raw.githubusercontent.com/mininet/mininet/master/mininet/net.py
- Mininet node source (`config()`, `setIP()`): https://raw.githubusercontent.com/mininet/mininet/master/mininet/node.py
- Mininet interface source (`Intf.setIP()`): https://raw.githubusercontent.com/mininet/mininet/master/mininet/link.py
- Linux kernel IPv6 sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Local man pages consulted for command syntax: `ping(8)`, `ip-address(8)`, `ip-route(8)`

## Issues Found
- The post used `sudo mn --ipv6 --test pingall`, but stock Mininet's `mn` launcher does not provide a `--ipv6` option. I changed this to the documented `sudo mn --switch ovsbr --test pingall`.
- The Python examples passed `ip6=` and `ip=''` to `addHost()`. Mininet's host configuration path documents `ip`, `mac`, and `defaultRoute`, and its interface `setIP()` implementation is not an IPv6 configuration API. I changed the examples to assign IPv6 addresses explicitly with `ip -6 addr add` after `net.start()`.
- The basic topology used `net.pingAll()` as an IPv6 test. Mininet's `pingAll()` implementation invokes `ping`, so it validates IPv4 reachability rather than IPv6. I replaced it with explicit `ping -6` checks.
- The examples depended on a controller-backed Open vSwitch setup for simple L2 forwarding. The official package-install guidance uses OVS bridge/standalone mode for basic connectivity tests, so I switched the examples to `OVSBridge` to remove the unnecessary controller dependency.
- The automated test suite expected a default IPv6 route and external DNS resolution to `ipv6.google.com`, but the topology shown does not configure a default gateway or external connectivity. I replaced those checks with a connected-route check and a neighbor-table check that match the local topology.
- The commands used `ping6`; current `iputils` documentation presents `ping -6` as the standard IPv6 form. I updated the examples accordingly.
- The conclusion described Mininet hosts as "container-based". Mininet's official overview and README describe process-based virtualization with Linux network namespaces, so I corrected that wording and fixed the `sysctl` command to use `-w`.

## Review Notes
- Mininet's package-install instructions on the official site may provide older distro-packaged releases; the docs still recommend the VM or source-install path when users need the latest version.
- The updated examples configure IPv6 manually because stock Mininet does not expose a first-class `--ipv6` startup flag or an IPv6-specific `pingAll()` path in the documented CLI/API.
- All three Python code blocks were recompiled for syntax validation after editing. End-to-end execution was not possible in this workspace because Mininet is not installed locally.
