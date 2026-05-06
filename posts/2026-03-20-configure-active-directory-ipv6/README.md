# How to Configure Active Directory for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Active Directory, IPv6, Windows Server, DNS, LDAP, Kerberos, Domain Controller

Description: Configure Active Directory Domain Services to support IPv6 for LDAP queries, Kerberos authentication, DNS registration, and domain controller communication.

---

Active Directory natively supports IPv6 starting with Windows Server 2008. Enabling full IPv6 support requires configuring DNS registration, ensuring domain controllers communicate over IPv6, and updating client configurations.

## Verifying IPv6 Support on Domain Controllers

```powershell
# Check current IPv6 configuration on Domain Controller

Get-NetIPAddress -AddressFamily IPv6

# Verify IPv6 is enabled on the network adapter
Get-NetAdapterBinding -ComponentID ms_tcpip6

# Check whether DisabledComponents is configured
Get-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Services\Tcpip6\Parameters" `
  -Name DisabledComponents -ErrorAction SilentlyContinue
# DisabledComponents is a bitmask; 0xFF (255) disables IPv6 - do NOT do this on a DC
```

## Configuring Static IPv6 Address on Domain Controller

```powershell
# Set a static IPv6 address on the Domain Controller
New-NetIPAddress -InterfaceAlias "Ethernet" `
  -IPAddress "2001:db8:100:10::10" `
  -PrefixLength 64 `
  -DefaultGateway "2001:db8:100:10::1"

# Configure IPv6 DNS servers
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" `
  -ServerAddresses ("2001:db8:100:10::10", "2001:db8:100:10::11")

# Verify the configuration
Get-NetIPAddress -InterfaceAlias "Ethernet"
```

## Registering IPv6 DNS Records

Active Directory domain controllers should register AAAA records:

```powershell
# Force DNS re-registration including IPv6 AAAA records
ipconfig /registerdns

# Verify AAAA records are registered
Resolve-DnsName -Name "dc1.corp.example.com" -Type AAAA

# Check _msdcs records (important for AD functionality over IPv6)
Resolve-DnsName -Name "_ldap._tcp.dc._msdcs.corp.example.com" -Type SRV

# View all DNS records for the domain controller
Get-DnsServerResourceRecord -ZoneName "corp.example.com" `
  -Name "dc1" -RRType "AAAA"
```

## Configuring DNS to Return IPv6 Addresses

```powershell
# Add AAAA record for domain controller manually if needed
Add-DnsServerResourceRecordAAAA -ZoneName "corp.example.com" `
  -Name "dc1" `
  -IPv6Address "2001:db8:100:10::10"

# Add AAAA record for another domain controller manually if needed
Add-DnsServerResourceRecordAAAA -ZoneName "corp.example.com" `
  -Name "dc2" `
  -IPv6Address "2001:db8:100:10::11"

# Verify records
Get-DnsServerResourceRecord -ZoneName "corp.example.com" -RRType AAAA
```

## Configuring Active Directory Sites for IPv6

AD Sites and Services uses subnets for site assignment, including IPv6:

```powershell
# Create an IPv6 subnet in AD Sites and Services
New-ADReplicationSubnet -Name "2001:db8:100:10::/64" `
  -Site "Default-First-Site-Name" `
  -Location "HQ"

# View all subnets
Get-ADReplicationSubnet -Filter *
```

## Testing LDAP over IPv6

```bash
# From a Linux client, test LDAP over IPv6
ldapsearch -x -H ldap://[2001:db8:100:10::10]:389 \
  -D "cn=Administrator,cn=Users,dc=corp,dc=example,dc=com" \
  -w "YourPassword" \
  -b "dc=corp,dc=example,dc=com" \
  "(objectClass=user)" samAccountName
```

```powershell
# From Windows, test LDAP over IPv6 using the DC FQDN
$searcher = New-Object System.DirectoryServices.DirectorySearcher
$searcher.SearchRoot = New-Object System.DirectoryServices.DirectoryEntry(
    "LDAP://dc1.corp.example.com/DC=corp,DC=example,DC=com"
)
$searcher.FindAll()
```

## Configuring Kerberos for IPv6

Kerberos in AD uses DNS to locate KDCs. Ensure AAAA records exist and are resolvable:

```powershell
# Test Kerberos over IPv6
# First, confirm the DC's AAAA record is accessible
nslookup -type=AAAA dc1.corp.example.com

# Request a Kerberos service ticket for the DC
klist get host/dc1.corp.example.com

# View cached tickets
klist
```

## Firewall Rules for Common AD Services over IPv6

```powershell
# Create example Windows Firewall rules for common TCP services over IPv6
# Full AD DS connectivity also requires additional ports such as DNS, RPC, SMB, Global Catalog, and dynamic RPC
# LDAP (TCP)
New-NetFirewallRule -DisplayName "AD LDAP IPv6" `
  -Direction Inbound -Protocol TCP -LocalPort 389 `
  -RemoteAddress Any6 -Action Allow

# LDAPS (TCP)
New-NetFirewallRule -DisplayName "AD LDAPS IPv6" `
  -Direction Inbound -Protocol TCP -LocalPort 636 `
  -RemoteAddress Any6 -Action Allow

# Kerberos (TCP)
New-NetFirewallRule -DisplayName "AD Kerberos IPv6" `
  -Direction Inbound -Protocol TCP -LocalPort 88 `
  -RemoteAddress Any6 -Action Allow
```

Active Directory's native IPv6 support makes it straightforward to deploy in dual-stack environments - the key steps are assigning static IPv6 addresses, registering AAAA DNS records, and defining IPv6 subnets in AD Sites and Services.
