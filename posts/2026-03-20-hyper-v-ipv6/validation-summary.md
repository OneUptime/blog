# Validation Summary: How to Configure IPv6 in Hyper-V

## Status
validated

## Post Type
Guide

## Technologies Covered
- Hyper-V
- IPv6
- Windows Server
- PowerShell
- Windows Firewall
- DHCPv6
- Hyper-V Live Migration

## Sources Consulted
- Microsoft Learn: New-VMSwitch (Hyper-V) https://learn.microsoft.com/en-us/powershell/module/hyper-v/new-vmswitch?view=windowsserver2022-ps
- Microsoft Learn: Set-VMSwitch (Hyper-V) https://learn.microsoft.com/en-us/powershell/module/hyper-v/set-vmswitch?view=windowsserver2025-ps
- Microsoft Learn: New-NetIPAddress (NetTCPIP) https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress?view=windowsserver2022-ps
- Microsoft Learn: Set-DnsClientServerAddress (DnsClient) https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress?view=windowsserver2025-ps
- Microsoft Learn: Add-VMMigrationNetwork (Hyper-V) https://learn.microsoft.com/en-us/powershell/module/hyper-v/add-vmmigrationnetwork?view=windowsserver2025-ps
- Microsoft Learn: Set up hosts for live migration without Failover Clustering https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/deploy/set-up-hosts-for-live-migration-without-failover-clustering
- Microsoft Learn: Get-VMNetworkAdapter command doesn't report IP addresses https://learn.microsoft.com/en-us/troubleshoot/windows-server/virtualization/get-vmnetworkadapter-doesnt-report-ip-addresses
- Microsoft Learn: Add-DhcpServerv6Scope (DhcpServer) https://learn.microsoft.com/en-us/powershell/module/dhcpserver/add-dhcpserverv6scope?view=windowsserver2025-ps
- Microsoft Learn: Set-DhcpServerv6OptionValue (DhcpServer) https://learn.microsoft.com/en-us/powershell/module/dhcpserver/set-dhcpserverv6optionvalue?view=windowsserver2025-ps
- Microsoft Learn: New-NetFirewallRule (NetSecurity) https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule?view=windowsserver2022-ps
- Microsoft Learn: Test-NetConnection (NetTCPIP) https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2025-ps
- Microsoft Learn: Hyper-V Features and Terminology Overview https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/features-terminology

## Issues Found
- The host-management example configured IPv6 on `Ethernet` after creating an external switch with `-AllowManagementOS $true`. I changed it to `vEthernet (ExternalSwitch)` because Hyper-V creates a management OS virtual network adapter on the switch.
- The host IPv6 listing comment claimed to show adapters and addresses, but the command only returned address objects. I updated it to select `InterfaceAlias`, `IPAddress`, and `PrefixLength`.
- The VM static-address example could return multiple adapters from `Get-NetAdapter`, which can break `New-NetIPAddress`. I limited it to the first `Up` adapter for a runnable example.
- The Live Migration example used an invalid parameter (`-Cidr`) for `Add-VMMigrationNetwork`. I corrected it to the documented `-Subnet` parameter.
- The Live Migration example used an invalid IPv6 literal (`2001:db8:vmotion::/48`). I replaced it with a valid documentation subnet.
- The `Move-VM` example targeted a raw IPv6 address. I changed it to a hostname/FQDN-style example so it aligns better with documented Hyper-V live-migration setup and authentication practices.
- The MAC spoofing note referred specifically to "nested IPv6 NDP," which was too narrow. I revised it to nested virtualization networking, which matches Microsoft guidance.
- The VM IP reporting note attributed address visibility broadly to guest integration services. I corrected it to the specific Key-Value Pair Exchange integration service that `Get-VMNetworkAdapter` depends on for reported guest IPs.
- The DHCPv6 scope examples used invalid IPv6 prefixes containing non-hex text (`vms`). I replaced them with valid documentation prefixes.
- The DHCPv6 option example used `-ScopeId`, which is not the documented parameter for `Set-DhcpServerv6OptionValue`. I changed it to `-Prefix` and used the built-in `-DnsServer` parameter.
- The firewall examples used `New-NetFirewallRule -AddressFamily IPv6`, which is not a supported parameter. I replaced it with the supported IPv6 address filter keyword `Any6`.
- The connectivity test used port 443 to represent generic host reachability. I changed it to a plain `Test-NetConnection` ICMP-style reachability check.
- The introduction overstated Hyper-V virtual switches as bridging physical NICs to VMs in all cases. I corrected the explanation to cover VM-to-VM, VM-to-host, and external connectivity accurately.
- The conclusion repeated two incorrect claims: `-AddressFamily IPv6` for firewall rules and a vague integration-services dependency for IP reporting. I corrected both.

## Review Notes
- The examples use documentation-only prefixes such as `2001:db8::/32`; they are valid for examples but must be replaced with real routed prefixes in production.
- Live Migration configuration can require additional authentication setup depending on whether the environment uses CredSSP or Kerberos. Microsoft documents those prerequisites separately in the live-migration setup guide.
