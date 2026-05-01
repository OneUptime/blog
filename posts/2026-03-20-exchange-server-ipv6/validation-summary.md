# Validation Summary: How to Configure Exchange Server for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Microsoft Exchange Server
- Exchange Management Shell
- SMTP
- IPv6
- DNS
- SPF
- IIS / WebAdministration
- Windows Server

## Sources Consulted
- Microsoft Learn: Exchange Server 2019 and SE system requirements - https://learn.microsoft.com/en-us/exchange/plan-and-deploy/system-requirements?source=recommendations&view=exchserver-2019
- Microsoft Learn: Receive connectors in Exchange Server - https://learn.microsoft.com/en-us/exchange/mail-flow/connectors/receive-connectors
- Microsoft Learn: Scenarios for custom Receive connectors in Exchange Server - https://learn.microsoft.com/en-us/exchange/mail-flow/connectors/custom-receive-connectors
- Microsoft Learn: New-ReceiveConnector (Exchange PowerShell) - https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/new-receiveconnector?view=exchange-ps
- Microsoft Learn: Set-SendConnector (Exchange PowerShell) - https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/set-sendconnector?view=exchange-ps
- Microsoft Learn: Create a Send connector to route outbound mail through a smart host - https://learn.microsoft.com/en-us/exchange/mail-flow/connectors/outbound-smart-host-routing
- Microsoft Learn: Configure protocol logging in Exchange Server - https://learn.microsoft.com/en-us/exchange/mail-flow/connectors/configure-protocol-logging
- Microsoft Learn: Protocol logging in Exchange Server - https://learn.microsoft.com/en-us/exchange/mail-flow/connectors/protocol-logging
- Microsoft Learn: Add-IPAllowListEntry (Exchange PowerShell) - https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/add-ipallowlistentry?view=exchange-ps
- Microsoft Learn: Set-IPAllowListConfig (Exchange PowerShell) - https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/set-ipallowlistconfig?view=exchange-ps
- Microsoft Learn: Set-IPBlockListProvidersConfig (Exchange PowerShell) - https://learn.microsoft.com/en-us/powershell/module/exchangepowershell/set-ipblocklistprovidersconfig?view=exchange-ps
- Microsoft Learn: New-WebBinding (WebAdministration) - https://learn.microsoft.com/en-us/powershell/module/webadministration/new-webbinding?view=windowsserver2022-ps
- Microsoft Learn: IIS Binding element - https://learn.microsoft.com/en-us/iis/configuration/system.applicationHost/sites/site/bindings/binding
- RFC 5321: Simple Mail Transfer Protocol - https://www.rfc-editor.org/rfc/rfc5321
- RFC 3596: DNS Extensions to Support IP Version 6 - https://www.rfc-editor.org/rfc/rfc3596.html
- RFC 7208: Sender Policy Framework (SPF) for Authorizing Use of Domains in Email - https://www.rfc-editor.org/rfc/rfc7208

## Issues Found
- The post said Exchange Server supports IPv6 without stating the Microsoft requirement that IPv4 must also be installed and enabled. I corrected the opening paragraph and overview to reflect the documented dual-stack requirement.
- The version list presented Exchange 2013/2016/2019 as the active set of versions for this guidance. I updated it to Exchange Server 2016/2019/SE so the post no longer presents Exchange 2013 as current guidance.
- The receive connector section implied you must explicitly enable IPv6 on the default Internet-facing connector and included an invalid `New-ReceiveConnector` example using `-Usage Internet` with `-RemoteIPRanges`. I corrected this to show that the default Frontend connector already listens on IPv4 and IPv6 on Mailbox servers, and replaced the invalid example with a valid scoped custom connector example.
- The send connector section claimed you should prefer IPv6 through OS preference or registry changes and used an invalid smart-host example (`[2001:db8::relay.example.com]`). I replaced this with documented Exchange behavior: DNS routing by default, or smart-host routing with `-DNSRoutingEnabled $false` and a valid smart-host value.
- The DNS examples used invalid IPv6 literals (`2001:db8::mail`) in the AAAA and SPF records. I replaced them with valid documentation-safe IPv6 address literals and corrected the corresponding reverse-DNS name.
- The post described IPv6 PTR as required. I corrected that to important/strongly recommended for deliverability, which is more accurate than presenting it as a protocol requirement.
- The IIS example added an HTTPS binding with `New-WebBinding` but did not address certificate binding and implied a separate IPv6-only binding was required. I replaced it with a verification-based example and noted that an existing `*:443:` binding covers all IP addresses.
- The anti-spam section used Edge-only cmdlets as if they were general Exchange configuration and included an invalid IPv6 CIDR example (`2001:db8:trusted::/48`). I marked the commands as Edge Transport-only and replaced the address with a valid IPv6 prefix.
- The testing section used malformed IPv6 host syntax in `telnet`/`swaks` examples and suggested checking the Windows Application event log for IPv6 SMTP sessions. I replaced this with a valid `nc -6` example and an Exchange protocol-log check, which is the documented place to inspect SMTP sessions.

## Review Notes
- Exchange Server supports IPv6 only in a dual-stack deployment; this post should not be interpreted as guidance for IPv6-only Exchange servers.
- Microsoft’s current Exchange Server documentation is centered on Exchange Server 2016, 2019, and Subscription Edition. Exchange 2013 still appears in some cmdlet applicability pages and older background references, but it is legacy rather than current deployment guidance.
- Direct outbound IPv6 delivery depends on normal SMTP routing conditions, including reachable AAAA records for remote hosts and appropriate DNS resolution. Exchange does not expose a simple Send connector setting that forces IPv6 for all outbound delivery.
