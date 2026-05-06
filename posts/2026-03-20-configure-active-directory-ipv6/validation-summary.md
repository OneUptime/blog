# Validation Summary: How to Configure Active Directory for IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Active Directory Domain Services (AD DS)
- IPv6 on Windows Server
- Windows DNS and DNS AAAA records
- LDAP and ADSI / System.DirectoryServices
- Kerberos on Windows
- Windows Defender Firewall with Advanced Security
- OpenLDAP `ldapsearch`

## Sources Consulted
- Microsoft Learn: Configure IPv6 for advanced users — https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/configure-ipv6-in-windows
- Microsoft Learn: New-NetIPAddress — https://learn.microsoft.com/en-us/powershell/module/nettcpip/new-netipaddress?view=windowsserver2022-ps
- Microsoft Learn: Set-DnsClientServerAddress — https://learn.microsoft.com/en-us/powershell/module/dnsclient/set-dnsclientserveraddress?view=windowsserver2016-ps
- Microsoft Learn: Resolve-DnsName — https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname?view=windowsserver2025-ps
- Microsoft Learn: Manage DNS resource records using DNS server on Windows Server — https://learn.microsoft.com/en-us/windows-server/networking/dns/manage-resource-records
- Microsoft Learn: Add-DnsServerResourceRecordAAAA — https://learn.microsoft.com/en-us/powershell/module/dnsserver/add-dnsserverresourcerecordaaaa?view=windowsserver2025-ps
- Microsoft Learn: Get-DnsServerResourceRecord — https://learn.microsoft.com/en-us/powershell/module/dnsserver/get-dnsserverresourcerecord?view=windowsserver2025-ps
- Microsoft Learn: New-ADReplicationSubnet — https://learn.microsoft.com/en-us/powershell/module/activedirectory/new-adreplicationsubnet?view=windowsserver2025-ps
- Microsoft Learn: Site definition and domain controller placement in ADDS performance tuning — https://learn.microsoft.com/en-us/windows-server/administration/performance-tuning/role/active-directory-server/site-definition-considerations
- Microsoft Learn: Test-ComputerSecureChannel — https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/test-computersecurechannel?view=powershell-5.1
- Microsoft Learn: klist — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/klist
- Microsoft Learn: LDAP signing for Active Directory Domain Services — https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/ldap-signing
- Microsoft Learn: New-NetFirewallRule — https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule?view=windowsserver2022-ps
- Microsoft Learn: Service overview and network port requirements for Windows — https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/service-overview-and-network-port-requirements
- RFC 4516: Lightweight Directory Access Protocol (LDAP): Uniform Resource Locator — https://www.rfc-editor.org/rfc/rfc4516.html
- OpenLDAP Administrator's Guide — https://www.openldap.org/doc/admin24/guide.html

## Issues Found
1. The sample IPv6 addresses were invalid because they used `corp` inside the address literal. Replaced them with valid documentation-prefix IPv6 examples under `2001:db8::/32`.

2. The `DisabledComponents` explanation was incorrect. The registry value is a bitmask, not a simple `1 = disabled, 0 = enabled` switch. Updated the explanation to match Microsoft's guidance and kept the warning not to disable IPv6 on domain controllers.

3. The DNS example suggested adding a zone-apex AAAA record that pointed the domain name itself at a domain controller. That is not an AD requirement and can be misleading. Changed the example to show host AAAA records for domain controllers instead.

4. The AD site subnet example used an invalid IPv6 literal and an inconsistent prefix. Updated it to a valid `/64` subnet that matches the sample DC address range.

5. The Linux `ldapsearch` example omitted `-x` even though it supplied a bind DN and password for a simple bind. Added `-x` to make the command consistent with OpenLDAP's documented simple-auth usage.

6. The Windows LDAP example used a raw IPv6 literal in the ADSI path. Reworked it to use the DC FQDN in a documented LDAP path form so name resolution can use the AAAA record and prefer IPv6.

7. The Kerberos test used `Test-ComputerSecureChannel`, which Microsoft documents as unsuitable for domain controllers because it returns false positives there. Replaced it with a Kerberos ticket request using `klist get`, followed by `klist` to inspect the cache.

8. The firewall example used a non-existent `-AddressFamily` parameter on `New-NetFirewallRule`. Replaced it with `-RemoteAddress Any6`, and clarified that the snippet only covers common TCP services rather than the full AD DS port set.

## Review Notes
- The post is now technically sound as a concise IPv6 enablement guide for AD DS, but the firewall section remains intentionally non-exhaustive. Microsoft documents that full domain controller communication may also require DNS, RPC endpoint mapper, SMB, Global Catalog, and dynamic RPC ports depending on the scenario.
- The LDAP test on port 389 is acceptable for connectivity validation, but hardened AD environments may reject unsigned or clear-text simple binds. The post does not cover those security-policy variations.
