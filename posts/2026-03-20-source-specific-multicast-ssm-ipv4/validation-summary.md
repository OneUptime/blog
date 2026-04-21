# Validation Summary: How to Configure Source-Specific Multicast (SSM) on IPv4

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IPv4 multicast
- Source-Specific Multicast (SSM)
- Any-Source Multicast (ASM)
- IGMPv3
- PIM-SSM and PIM-SM
- Linux IPv4 multicast socket options
- Python `socket`
- iproute2 `ip maddr`
- SMCRoute
- FRRouting `pimd`

## Sources Consulted
- RFC 4607, Source-Specific Multicast for IP: https://www.rfc-editor.org/rfc/rfc4607.html
- RFC 4604, Using IGMPv3 and MLDv2 for Source-Specific Multicast: https://www.rfc-editor.org/rfc/rfc4604.html
- RFC 9776, Internet Group Management Protocol Version 3: https://www.rfc-editor.org/rfc/rfc9776.html
- Linux `ip(7)` manual for `IP_ADD_SOURCE_MEMBERSHIP` and `IP_MULTICAST_TTL`: https://man7.org/linux/man-pages/man7/ip.7.html
- Linux kernel IP sysctl documentation for `force_igmp_version`: https://docs.kernel.org/networking/ip-sysctl.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- iproute2 `ip-maddress(8)` manual: https://manpages.debian.org/unstable/iproute2/ip-maddress.8.en.html
- SMCRoute `smcroutectl(8)` manual: https://man.troglobit.com/man8/smcroutectl.8.html
- SMCRoute `smcrouted(8)` manual: https://man.troglobit.com/man8/smcrouted.8.html
- SMCRoute `smcroute.conf(5)` manual: https://man.troglobit.com/man5/smcroute.conf.5.html
- FRRouting PIM documentation: https://docs.frrouting.org/en/latest/pim.html
- IBM AIX `mrouted` daemon documentation: https://www.ibm.com/docs/en/aix/7.2.0?topic=m-mrouted-daemon

## Issues Found
1. **`mrouted` was listed as an SSM routing option**: `mrouted` is a DVMRP multicast routing daemon, while SSM routing requires PIM-SSM semantics or explicit static (S,G) routing. Replaced `mrouted` references with `smcroute` for static routes and a PIM-SSM-capable daemon such as FRRouting `pimd` for dynamic routing.

2. **Kernel prerequisite was too broad**: The post said Linux kernel >= 2.4, but Linux documents `IP_ADD_SOURCE_MEMBERSHIP` as available since 2.4.22 / 2.5.68. Updated the prerequisite to Linux kernel >= 2.4.22 for source-specific multicast socket options.

3. **ASM/PIM-SM wording was too absolute**: The post implied all ASM routers must use PIM-SM and an RP. Updated the wording to scope the RP statement to PIM-SM.

4. **IGMP sysctl comment overstated what `0` guarantees**: Linux documents `force_igmp_version=0` as the default with no version enforcement and v1/v2 fallback allowed. Updated the comment to describe that behavior accurately.

5. **Python receiver example defined an unused interface name**: The code set `IFACE = "eth0"` but joined with `0.0.0.0`, which means the kernel chooses the interface. Replaced it with `IFACE_ADDR` and used that value when building `ip_mreq_source`.

6. **`ip maddr` verification wording was inaccurate**: `ip maddr show` lists multicast addresses/memberships, not source-specific filters. Updated the comment and left `/proc/net/mcfilter` as the source-filter check.

7. **SMCRoute command used the legacy compatibility wrapper**: Current SMCRoute packages provide `smcrouted` plus `smcroutectl`; the route add operation is `smcroutectl add IIF SOURCE GROUP OIF`. Updated the example and added `systemctl enable --now smcroute` so the daemon is running before the control command.

## Review Notes
- The Python snippets compile under Python 3.12.3, and `socket.IP_ADD_SOURCE_MEMBERSHIP` is available in the local Python environment.
- `IP_ADD_SOURCE_MEMBERSHIP` uses the Linux `ip_mreq_source` layout `(group, interface address, source)`, which matches the corrected Python example.
- IGMPv3 is now specified by RFC 9776, which obsoletes RFC 3376 while preserving the source-filtering model used by SSM.
