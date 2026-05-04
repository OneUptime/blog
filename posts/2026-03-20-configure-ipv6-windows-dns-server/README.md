# How to Configure IPv6 on Windows DNS Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Windows Server, DNS, AAAA Records, PowerShell

Description: Learn how to configure Windows DNS Server to handle IPv6 - including making DNS listen on IPv6 addresses, adding AAAA records, and configuring reverse DNS zones for IPv6.

## Make DNS Server Listen on IPv6

```powershell
# Windows DNS Server listens on all addresses by default including IPv6

# Verify DNS is listening on IPv6 (use -All to see advanced settings)
Get-DnsServerSetting -All | Select-Object ListeningIPAddress

# If not listening on IPv6, modify the ListeningIPAddress property and pipe back
$settings = Get-DnsServerSetting -All
$settings.ListeningIPAddress = "2001:db8::10", "192.168.1.10", "127.0.0.1"
$settings | Set-DnsServerSetting

# Test DNS is responding over IPv6
nslookup google.com 2001:db8::10
```

## Add AAAA Records via PowerShell

```powershell
# Add a AAAA (IPv6 address) record
Add-DnsServerResourceRecordAAAA `
    -ZoneName "example.com" `
    -Name "www" `
    -IPv6Address "2001:db8::10"

# Add AAAA record for the zone apex
Add-DnsServerResourceRecordAAAA `
    -ZoneName "example.com" `
    -Name "@" `
    -IPv6Address "2001:db8::10"

# Verify the record
Get-DnsServerResourceRecord -ZoneName "example.com" -RRType AAAA

# Remove a AAAA record
Remove-DnsServerResourceRecord `
    -ZoneName "example.com" `
    -Name "www" `
    -RRType AAAA `
    -Confirm:$false
```

## Add AAAA Records via DNS Manager GUI

```text
Steps:
1. Open DNS Manager (dnsmgmt.msc)

2. Expand server → Forward Lookup Zones → example.com

3. Right-click → New Host (AAAA)...

4. Name: www
   IPv6 Address: 2001:db8::10

5. Click "Add Host"
```

## Configure IPv6 Reverse DNS Zone

```powershell
# Create IPv6 reverse DNS zone for 2001:db8::/32
# IPv6 reverse zones use nibble format in ip6.arpa

# For 2001:db8::/32, the zone name is:
# 8.b.d.0.1.0.0.2.ip6.arpa

Add-DnsServerPrimaryZone `
    -Name "8.b.d.0.1.0.0.2.ip6.arpa" `
    -ReplicationScope "Domain" `
    -DynamicUpdate Secure

# Add a PTR record for 2001:db8::10
# Full nibble-reversed: 0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa

Add-DnsServerResourceRecordPtr `
    -ZoneName "8.b.d.0.1.0.0.2.ip6.arpa" `
    -Name "0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0" `
    -PtrDomainName "server01.example.com."
```

## Configure DNS Forwarders for IPv6

```powershell
# Add IPv6 DNS forwarders
Add-DnsServerForwarder -IPAddress "2001:4860:4860::8888"
Add-DnsServerForwarder -IPAddress "2001:4860:4860::8844"

# View current forwarders
Get-DnsServerForwarder

# Remove a forwarder
Remove-DnsServerForwarder -IPAddress "2001:4860:4860::8888" -Confirm:$false
```

## Enable DNS Dynamic Updates for IPv6

```powershell
# Allow clients to register AAAA records dynamically
Set-DnsServerPrimaryZone `
    -Name "example.com" `
    -DynamicUpdate Secure

# Check zone update setting
Get-DnsServerZone -Name "example.com" | Select-Object ZoneName, DynamicUpdate
```

## Test IPv6 DNS Resolution

```powershell
# Test AAAA record resolution
Resolve-DnsName -Name "www.example.com" -Type AAAA -Server "2001:db8::10"

# Test reverse lookup
Resolve-DnsName -Name "0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa" `
    -Type PTR -Server "2001:db8::10"

# Test via dig (if BIND utils available)
# dig AAAA www.example.com @2001:db8::10
```

## Summary

Windows DNS Server listens on IPv6 by default. Add AAAA records with `Add-DnsServerResourceRecordAAAA` or via the **dnsmgmt.msc** GUI. For IPv6 reverse DNS, create zones in `ip6.arpa` format with `Add-DnsServerPrimaryZone` and add PTR records in nibble-reversed notation. Add IPv6 forwarders with `Add-DnsServerForwarder`. Test with `Resolve-DnsName -Type AAAA -Server <ipv6-dns-ip>`.
