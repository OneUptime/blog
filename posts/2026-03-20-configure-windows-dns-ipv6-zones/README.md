# How to Configure Windows DNS Server for IPv6 Zones

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Windows DNS, IPv6, AAAA, Active Directory, PowerShell, DNS Server

Description: Configure Windows Server DNS to serve AAAA records, create IPv6 reverse lookup zones, and manage DNS records via PowerShell for IPv6 infrastructure.

## Introduction

Windows Server DNS supports IPv6 fully - it can listen on IPv6, serve AAAA records, host ip6.arpa reverse zones, and integrate with Active Directory. PowerShell provides scripted management of all these features.

## Step 1: Enable IPv6 Listening

```powershell
# Check current listening addresses

Get-DnsServer | Select -ExpandProperty ServerSetting | 
    Select ListeningIPAddress

# Add IPv6 address to listening list
Set-DnsServerSetting -ListeningIPAddress @("0.0.0.0", "::")

# Verify the DNS Server service is listening on IPv6
netstat -an | Select-String ":53"
```

## Step 2: Create an IPv6-Capable Forward Zone

```powershell
# Create primary forward zone
Add-DnsServerPrimaryZone `
    -Name "example.com" `
    -ZoneFile "example.com.dns" `
    -DynamicUpdate None

# Add SOA (auto-created)
# Add NS records
Add-DnsServerResourceRecord `
    -ZoneName "example.com" `
    -Name "@" `
    -NS `
    -NameServer "ns1.example.com."
```

## Step 3: Add AAAA Records

```powershell
# Add AAAA (IPv6 host) records
Add-DnsServerResourceRecord `
    -ZoneName "example.com" `
    -Name "www" `
    -AAAA `
    -IPv6Address "2001:db8::10" `
    -TimeToLive (New-TimeSpan -Seconds 3600)

Add-DnsServerResourceRecord `
    -ZoneName "example.com" `
    -Name "mail" `
    -AAAA `
    -IPv6Address "2001:db8::20"

Add-DnsServerResourceRecord `
    -ZoneName "example.com" `
    -Name "@" `
    -AAAA `
    -IPv6Address "2001:db8::10"

# List AAAA records
Get-DnsServerResourceRecord `
    -ZoneName "example.com" `
    -RRType AAAA
```

## Step 4: Create IPv6 Reverse Lookup Zone

```powershell
# Create ip6.arpa reverse zone for 2001:db8::/32
# (auto-generates the zone name 8.b.d.0.1.0.0.2.ip6.arpa)
Add-DnsServerPrimaryZone `
    -NetworkId "2001:db8::/32" `
    -ZoneFile "2001.db8.ip6.arpa.dns"

# Or create a more specific /64 reverse zone manually
Add-DnsServerPrimaryZone `
    -Name "0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa" `
    -ZoneFile "rev.2001.db8.dns"

# Add PTR record for 2001:db8::10 → www.example.com
Add-DnsServerResourceRecord `
    -ZoneName "0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa" `
    -Name "0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0" `
    -PTR `
    -PtrDomainName "www.example.com."
```

## Step 5: Configure Forwarders with IPv6

```powershell
# Add IPv6 forwarders
Add-DnsServerForwarder `
    -IPAddress "2606:4700:4700::1111", "2606:4700:4700::1001", "8.8.8.8"

# Verify
Get-DnsServerForwarder
```

## Step 6: Conditional Forwarding

```powershell
# Forward internal domain to IPv6 internal DNS
Add-DnsServerConditionalForwarderZone `
    -Name "internal.example.com" `
    -MasterServers "2001:db8:1::53"
```

## Step 7: Test

```powershell
# Test AAAA resolution
Resolve-DnsName -Name "www.example.com" -Type AAAA -Server "::1"

# Test PTR
Resolve-DnsName -Name "0.1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa" `
    -Type PTR -Server "::1"

# nslookup
nslookup -type=AAAA www.example.com ::1
```

## Bulk Record Import

```powershell
# Import AAAA records from CSV
$records = Import-Csv "aaaa-records.csv"
# CSV: Name,IPv6Address,TTL
foreach ($r in $records) {
    Add-DnsServerResourceRecord `
        -ZoneName "example.com" `
        -Name $r.Name `
        -AAAA `
        -IPv6Address $r.IPv6Address `
        -TimeToLive (New-TimeSpan -Seconds ([int]$r.TTL))
}
```

## Conclusion

Windows Server DNS supports IPv6 through PowerShell cmdlets and the GUI. Set listening addresses to `::`, create ip6.arpa reverse zones, and add AAAA records with `Add-DnsServerResourceRecord -AAAA`. Use OneUptime to verify DNS record propagation and monitor Windows DNS server health.
