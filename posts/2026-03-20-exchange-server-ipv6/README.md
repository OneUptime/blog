# How to Configure Exchange Server for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Exchange Server, IPv6, Email, Microsoft, SMTP, Windows Server

Description: Configure Microsoft Exchange Server to send and receive email over IPv6, including receive connectors, send connectors, and DNS configuration for IPv6 email delivery.

---

Exchange Server supports IPv6 for SMTP, as well as client access protocols, when IPv4 is also installed and enabled on the Exchange server. Proper IPv6 configuration enables Exchange to receive inbound email from IPv6 senders and deliver outbound mail to IPv6-capable recipients.

## Exchange Server IPv6 Overview

```text
Exchange IPv6 requires:
- Windows Server with IPv6 enabled
- Exchange Server 2016/2019/SE with IPv4 also enabled
- DNS: AAAA record for mail server
- DNS: MX record pointing to mail server FQDN
- Reverse DNS (PTR) for the public IPv6 sending address
- If using Edge Transport connection filtering, update IPv6 allow/block lists
```

## Configuring Receive Connectors for IPv6

```powershell
# Open Exchange Management Shell

# Check existing receive connectors and bindings
Get-ReceiveConnector | Select Name, Bindings, RemoteIPRanges

# On Mailbox servers, the default Frontend connector already listens on
# all available IPv4 and IPv6 addresses by default.
Get-ReceiveConnector "Default Frontend EXCHANGE-SERVER" `
  | Select Name, Bindings, RemoteIPRanges

# If you need a separate connector for a specific IPv6 source range
New-ReceiveConnector `
  -Name "IPv6 Scoped Receive" `
  -Server EXCHANGE-SERVER `
  -TransportRole FrontendTransport `
  -Usage Custom `
  -Bindings "[::]:25" `
  -RemoteIPRanges "2001:db8:100::/48" `
  -PermissionGroups AnonymousUsers

# Verify connector binding
Get-ReceiveConnector "IPv6 Scoped Receive" | Select Name, Bindings, RemoteIPRanges
```

## Configuring Send Connectors for IPv6

```powershell
# Check current send connector configuration
Get-SendConnector | Select Name, AddressSpaces, DNSRoutingEnabled, SmartHosts

# DNS routing is the default. Ensure the Exchange server can resolve
# external MX records and AAAA records for IPv6-capable destinations.

# Or configure a smart host. Smart host routing requires DNSRoutingEnabled $false.
Set-SendConnector "Internet Send Connector" `
  -DNSRoutingEnabled $false `
  -SmartHosts "relay.example.com"
```

## DNS Configuration for IPv6 Email

```text
# DNS records required for IPv6 email:

# A record (IPv4)
mail.example.com. IN A 203.0.113.1

# AAAA record (IPv6)
mail.example.com. IN AAAA 2001:db8::25

# MX record (points to FQDN, not IP)
example.com. IN MX 10 mail.example.com.

# PTR record for IPv6 (reverse DNS - important for deliverability)
# Contact your ISP/upstream provider for IPv6 PTR delegation
5.2.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa. IN PTR mail.example.com.

# SPF record (include IPv6)
example.com. IN TXT "v=spf1 a mx ip4:203.0.113.1 ip6:2001:db8::25 ~all"
```

## Exchange Client Access over IPv6

```powershell
# Check IIS HTTPS bindings for Exchange client access
Get-WebBinding -Name "Default Web Site" -Protocol "https" |
  Select protocol, bindingInformation

# Exchange Web Services (EWS) over IPv6
# Uses the same IIS HTTPS binding

# ActiveSync over IPv6
# Uses the same IIS HTTPS binding

# If the site is bound to *:443:, IIS listens on all IP addresses for HTTPS,
# so OWA, EWS, and ActiveSync can be reached over IPv6 through the same binding.
```

## Spam and IP Reputation for IPv6

```powershell
# Connection filtering cmdlets are available on Edge Transport servers only.
Set-IPBlockListConfig -Enabled $true
Set-IPAllowListConfig -Enabled $true

# Add trusted IPv6 range to IP Allow List
Add-IPAllowListEntry `
  -IPRange "2001:db8:100::/48" `
  -Comment "Trusted IPv6 sending range"

# Review configured allow list entries
Get-IPAllowListEntry

# Enable IP Block list providers if you use them
Set-IPBlockListProvidersConfig -Enabled $true
```

## Testing Exchange IPv6

```bash
# Test SMTP over IPv6
nc -6 2001:db8::25 25

# Verify email headers for IPv6
# Received: from [2001:db8::sender] by mail.example.com
```

```powershell
# The Default Frontend receive connector logs SMTP sessions by default.
# Check the receive protocol logs for IPv6 client addresses.
Get-ChildItem "$env:ExchangeInstallPath\TransportRoles\Logs\FrontEnd\ProtocolLog\SmtpReceive\*.log" |
  Select-String "2001:" | Select-Object -First 20
```

Exchange Server's IPv6 support relies on dual-stack Windows networking, correct Receive connector and IIS bindings, and valid DNS AAAA, MX, and SPF records. Reverse DNS for the public IPv6 sending address is strongly recommended for outbound deliverability.
