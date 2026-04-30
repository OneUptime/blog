# Validation Summary: How to Fix Incorrect Subnet Mask Configuration Errors

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 subnet masks and CIDR
- Linux `iproute2`
- Netplan
- NetworkManager `nmcli`
- Windows PowerShell `NetTCPIP`
- Windows `netsh`
- Cisco IOS
- Python `ipaddress`
- `nmap`

## Sources Consulted
- Linux `ip-address(8)` manual page
- Linux `ip-route(8)` manual page
- Linux `ip-neighbour(8)` manual page
- `nmcli connection modify --help`
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/0.106/netplan-yaml/
- NetworkManager `nmcli` reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nmcli.html
- Microsoft Learn, `New-NetIPAddress`: https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress?view=windowsserver2025-ps
- Microsoft Learn, `Remove-NetIPAddress`: https://learn.microsoft.com/en-us/powershell/module/nettcpip/remove-netipaddress?view=windowsserver2025-ps
- Microsoft Learn, `netsh interface`: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Cisco IOS command reference, `ip address`: https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/ip_address.htm
- Cisco IOS command reference, `show interfaces`: https://www.cisco.com/E-Learning/bulk/public/tac/cim/cib/using_cisco_ios_software/cmdrefs/show_interfaces.htm

## Issues Found
- The opening example used `192.168.1.10/24` and `192.168.1.20/16`, but those two hosts would both still treat each other as local. I changed the example to `192.168.1.10/25` and `192.168.1.200/24` so the asymmetric routing explanation is actually correct.
- The Step 1 `nmap` comment implied that `nmap -sn` compares subnet masks. It does not; it only discovers live hosts. I corrected the comment to match what the command actually does.
- The Linux neighbor-check example used legacy `arp`. I replaced it with `ip neigh`, which is the current `iproute2` tool for neighbor and ARP table inspection.
- The Linux temporary fix deleted and re-added the address, then unconditionally re-added the default route. That can fail if the route already exists and is not necessary just to correct the prefix length. I removed the unnecessary route step and kept the explicit `ip addr del` / `ip addr add` sequence.
- The NetworkManager example did not set `ipv4.method manual`, which is the documented form for a static IPv4 profile. I updated the command accordingly.
- The PowerShell inspection example could include unrelated IPv6 addresses. I restricted it to `-AddressFamily IPv4` so the output matches the subnet-mask troubleshooting context.
- The `netsh` example used an older syntax form. I updated it to the current documented `netsh interface ipv4 set address ... source=static ...` format.
- The Cisco `show interfaces` comment used CIDR-style `/24` output, but Cisco documents that command as showing the IP address and subnet mask separately. I corrected the sample output comment.
- The Python audit example listed a `/16` mismatch that no longer matched the corrected scenario. I updated the sample device data to reflect the fixed `/25` mismatch example.

## Review Notes
- Interface names such as `eth0`, `"Ethernet"`, and `GigabitEthernet0/0` are environment-specific; readers still need to substitute the actual interface name used on their systems.
- The Cisco IOS commands are syntactically correct, but exact output and interface naming vary across IOS and IOS XE platforms.
