# Validation Summary: How to Test IPv6 Compliance of Operating Systems

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6
- Linux IPv6 networking
- SLAAC
- Duplicate Address Detection (DAD)
- DHCPv6
- IPv6 temporary/privacy addresses
- Python socket API
- Windows PowerShell networking cmdlets

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 4291: IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 3849: IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 4862: IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862.html
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415.html
- RFC 8981: Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://datatracker.ietf.org/doc/html/rfc8981
- RFC 3493: Basic Socket Interface Extensions for IPv6: https://www.ietf.org/ietf-ftp/rfc/rfc3493.txt.pdf
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.8/networking/ip-sysctl.html
- Python socket module documentation: https://docs.python.org/3/library/socket.html
- Microsoft Get-NetAdapterBinding documentation: https://learn.microsoft.com/en-us/powershell/module/netadapter/get-netadapterbinding
- Microsoft Get-NetIPAddress documentation: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress
- Microsoft Test-NetConnection documentation: https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection
- Microsoft Resolve-DnsName documentation: https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname
- Local `ip -6 address help`, `sysctl -h`, and Python `ipaddress` validation.

## Issues Found
- The metadata tag used `Window`; changed it to `Windows`.
- The Linux module check used only `lsmod | grep ipv6`, which misses kernels with IPv6 built in. Updated it to accept either a loaded module or `/proc/sys/net/ipv6`.
- The Linux disabled-state check used `net.ipv6.conf.all.disable_ipv6`; Linux documents IPv6 enablement as an interface-level setting, so the example now checks `net.ipv6.conf.eth0.disable_ipv6`.
- The SLAAC command comment said `rdisc6` simulates Router Advertisement arrival. RFC 4862 describes hosts sending Router Solicitations to obtain Router Advertisements, so the comment now says the command solicits router advertisements.
- The DAD example used `2001:db8::test`, which is not a valid IPv6 address because IPv6 hextets must be hexadecimal. Changed it to `2001:db8::10` while keeping the documentation prefix.
- The DHCPv6 comment referenced RFC 3315 alongside RFC 8415 without noting that RFC 8415 obsoletes RFC 3315. Updated the comment accordingly.
- The privacy extensions comment referenced obsolete RFC 4941. Updated it to RFC 8981.
- The Python DNS-resolution test could terminate the whole script on a resolver error. Added exception handling so it reports a FAIL result like the other socket tests.
- The Windows SLAAC command used `-IPAddress "2*"`, but Microsoft documents `Get-NetIPAddress -IPAddress` as not supporting wildcards. Replaced it with the documented `-PrefixOrigin RouterAdvertisement` filter.

## Review Notes
Examples assume `eth0` on Linux and `Ethernet` on Windows; readers may need to substitute the actual interface name. `dhclient` availability and lease-file paths vary by distribution, but the command syntax is valid where ISC dhclient is installed. The post is tagged macOS but does not include macOS-specific commands.
