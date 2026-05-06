# How to Configure AAAA Records in Windows DNS Server

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DNS, Windows Server, AAAA Records, Active Directory

Description: A guide to adding IPv6 AAAA records in Windows Server DNS using both the DNS Manager GUI and PowerShell, for dual-stack enterprise environments.

## Prerequisites

- Windows Server 2012 R2 or later with DNS Server role installed
- Administrator privileges
- IPv6 addresses assigned to your servers

## Method 1: Using DNS Manager GUI

The DNS Manager snap-in provides a graphical interface for adding AAAA records:

1. Open **Server Manager** → **Tools** → **DNS**
2. Expand the server name → **Forward Lookup Zones**
3. Right-click the zone (e.g., `corp.example.com`)
4. Select **New Host (A or AAAA)...**
5. Enter:
   - **Name**: `www` (for www.corp.example.com)
   - **IP address**: `2001:db8::1` (IPv6 address)
   - Check **Create associated pointer (PTR) record** if desired
6. Click **Add Host**

The DNS Manager automatically creates a AAAA record when you enter an IPv6 address.

## Method 2: Using PowerShell (Recommended for Automation)

PowerShell provides full DNS record management via the `DnsServer` module:

```powershell
# Add a single AAAA record

# Replace ZoneName, Name, and IPv6Address with your values
Add-DnsServerResourceRecordAAAA `
    -ZoneName "corp.example.com" `
    -Name "www" `
    -IPv6Address "2001:db8::1" `
    -TimeToLive ([TimeSpan]::FromHours(1))

# Add AAAA for the zone apex (. = zone root)
Add-DnsServerResourceRecordAAAA `
    -ZoneName "corp.example.com" `
    -Name "." `
    -IPv6Address "2001:db8::1" `
    -TimeToLive ([TimeSpan]::FromHours(1))

# Add multiple AAAA records for the same hostname (round-robin)
Add-DnsServerResourceRecordAAAA -ZoneName "corp.example.com" -Name "www" `
    -IPv6Address "2001:db8::2" -TimeToLive ([TimeSpan]::FromHours(1))
Add-DnsServerResourceRecordAAAA -ZoneName "corp.example.com" -Name "www" `
    -IPv6Address "2001:db8::3" -TimeToLive ([TimeSpan]::FromHours(1))
```

## Bulk-Adding AAAA Records from CSV

For adding many records at once, use a CSV file with PowerShell:

```powershell
# Create a CSV file: C:\dns-records.csv
# Name,IPv6Address
# www,2001:db8::1
# mail,2001:db8::100
# api,2001:db8::200
# ns1,2001:db8::10

# Import and add all AAAA records from the CSV
Import-Csv -Path "C:\dns-records.csv" | ForEach-Object {
    Add-DnsServerResourceRecordAAAA `
        -ZoneName "corp.example.com" `
        -Name $_.Name `
        -IPv6Address $_.IPv6Address `
        -TimeToLive ([TimeSpan]::FromHours(1))
    Write-Host "Added AAAA: $($_.Name) -> $($_.IPv6Address)"
}
```

## Listing Existing AAAA Records

```powershell
# List all AAAA records in a zone
Get-DnsServerResourceRecord -ZoneName "corp.example.com" -RRType AAAA

# List both A and AAAA for a specific hostname
Get-DnsServerResourceRecord -ZoneName "corp.example.com" -Name "www"

# Export all AAAA records to CSV
Get-DnsServerResourceRecord -ZoneName "corp.example.com" -RRType AAAA |
    Select-Object HostName, @{N="IPv6Address";E={$_.RecordData.IPv6Address}}, TimeToLive |
    Export-Csv -Path "C:\aaaa-export.csv" -NoTypeInformation
```

## Removing AAAA Records

```powershell
# Remove a specific AAAA record by IPv6 address
Remove-DnsServerResourceRecord `
    -ZoneName "corp.example.com" `
    -Name "www" `
    -RRType AAAA `
    -RecordData "2001:db8::1"

# Remove all AAAA records for a hostname
Get-DnsServerResourceRecord -ZoneName "corp.example.com" -Name "www" -RRType AAAA |
    Remove-DnsServerResourceRecord -ZoneName "corp.example.com" -Force
```

## Verifying AAAA Records with DNS Tools

```powershell
# Test resolution from PowerShell
Resolve-DnsName -Name "www.corp.example.com" -Type AAAA

# Resolve both A and AAAA
Resolve-DnsName -Name "www.corp.example.com"
```

```cmd
REM From Command Prompt using nslookup
nslookup -type=AAAA www.corp.example.com

REM Using nslookup interactively
nslookup
> set type=AAAA
> www.corp.example.com
```

## Active Directory-Integrated Zones

For AD-integrated zones, AAAA records replicate automatically through AD replication to other domain controllers running DNS according to the zone's replication scope. After adding records, they propagate without manual zone transfers:

```powershell
# Check replication status
repadmin /replsummary

# Force immediate replication from a specific domain controller
# Replace DC01 with the domain controller name to start the sync from
repadmin /syncall DC01 /A /d /e
```

## Summary

Windows DNS Server supports AAAA records through the DNS Manager GUI (enter an IPv6 address in the "New Host" dialog) and via PowerShell using `Add-DnsServerResourceRecordAAAA`. PowerShell is preferred for bulk operations and automation. In AD-integrated zones, AAAA records replicate automatically through AD replication to other domain controllers running DNS according to the zone's replication scope.
