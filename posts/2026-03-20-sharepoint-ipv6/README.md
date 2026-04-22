# How to Configure SharePoint for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SharePoint, IPv6, Microsoft, Enterprise, IIS, Windows Server

Description: Configure SharePoint Server to serve content to IPv6 clients, including IIS IPv6 bindings, alternate access mappings, and load balancer configuration.

---

SharePoint Server runs on IIS (Internet Information Services) on Windows Server. Enabling IPv6 access to SharePoint primarily involves configuring IIS bindings to listen on all addresses or valid IPv6 addresses and updating Alternate Access Mappings (AAM) to use DNS names with AAAA records for proper URL resolution.

## IIS IPv6 Binding for SharePoint

```powershell
# Configure IIS to listen on IPv6 for SharePoint web application

# Open IIS Manager > Sites > SharePoint Web Application

# Method 1: IIS Manager GUI
# Sites > SharePoint - 80 > Bindings > Add
# Type: HTTP
# IP Address: All Unassigned (IIS uses * for all IPv4 and IPv6 addresses)
# OR specific: 2001:db8::10
# Port: 80
# Host Name: sharepoint.example.com

# Method 2: PowerShell
Import-Module WebAdministration

# Add binding on all IP addresses, including IPv6
New-WebBinding `
  -Name "SharePoint - 80" `
  -Protocol "http" `
  -IPAddress "*" `
  -Port 80 `
  -HostHeader "sharepoint.example.com"

# Add HTTPS binding and attach the certificate
$certThumbprint = "<certificate-thumbprint>"
New-WebBinding `
  -Name "SharePoint - 443" `
  -Protocol "https" `
  -IPAddress "*" `
  -Port 443 `
  -HostHeader "sharepoint.example.com" `
  -SslFlags 1

(Get-WebBinding `
  -Name "SharePoint - 443" `
  -Protocol "https" `
  -Port 443 `
  -HostHeader "sharepoint.example.com").AddSslCertificate($certThumbprint, "My")
```

## SharePoint Central Administration over IPv6

```powershell
# Check Central Admin current bindings
Get-WebBinding -Name "SharePoint Central Administration v4"

# Add binding on all IP addresses, including IPv6
# Replace 2016 with your Central Administration port
New-WebBinding `
  -Name "SharePoint Central Administration v4" `
  -Protocol "http" `
  -IPAddress "*" `
  -Port 2016

# Verify bindings
Get-WebBinding -Name "SharePoint Central Administration v4" |
  Select-Object protocol, bindingInformation
```

## Alternate Access Mappings for IPv6

```text
Configure AAM in Central Administration:

1. Central Admin > Application Management
   > Configure Alternate Access Mappings

2. Add Internal URL:
   http://spweb01.example.com

3. Add Public URL mapping:
   Zone: Default
   URL: https://sharepoint.example.com

Note: For SharePoint IPv6, end-user URLs must use
DNS names with AAAA records. Browsing to SharePoint
by raw IPv6 literal URLs is not supported.
```

```powershell
# PowerShell for AAM configuration
Add-PSSnapin Microsoft.SharePoint.PowerShell -ErrorAction SilentlyContinue

# Add DNS-name alternate access mapping for an internal URL
$webapp = Get-SPWebApplication "https://sharepoint.example.com"
New-SPAlternateUrl `
  -WebApplication $webapp `
  -Url "http://spweb01.example.com" `
  -Zone Default `
  -Internal
```

## SharePoint and SQL Server over IPv6

```powershell
# SharePoint connects to SQL via connection string
# For IPv6 SQL, use a SQL Server instance name that resolves to IPv6
# Or use a SQL Alias configured with SQL Server Configuration Manager/cliconfg.exe

# Create SQL Alias pointing to IPv6 SQL Server
# (64-bit SQL alias on 64-bit SharePoint)
# HKLM\SOFTWARE\Microsoft\MSSQLServer\Client\ConnectTo
# Value: DBMSSOCN,sqlserver.example.com,1433

# Set-up alias via cliconfg.exe
# or via PowerShell registry manipulation
$regPath = "HKLM:\SOFTWARE\Microsoft\MSSQLServer\Client\ConnectTo"

if (-not (Test-Path $regPath)) {
  New-Item -Path $regPath -Force | Out-Null
}

New-ItemProperty -Path $regPath `
  -Name "SHAREPOINTDB" `
  -PropertyType String `
  -Value "DBMSSOCN,sqlserver.example.com,1433" `
  -Force
```

## Windows Firewall for SharePoint IPv6

```powershell
# Allow SharePoint HTTP/HTTPS over IPv6
New-NetFirewallRule `
  -DisplayName "SharePoint HTTP IPv6" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 80 `
  -Action Allow

New-NetFirewallRule `
  -DisplayName "SharePoint HTTPS IPv6" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 443 `
  -Action Allow

# Allow Central Administration
New-NetFirewallRule `
  -DisplayName "SharePoint CA IPv6" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 2016 `
  -Action Allow
```

## Verifying IPv6 Access to SharePoint

```powershell
# Test connectivity to SharePoint and confirm RemoteAddress is IPv6
Test-NetConnection -ComputerName "sharepoint.example.com" `
  -Port 80 `
  -InformationLevel Detailed

# Verify IIS is listening on IPv6
netstat -an | Select-String ":80"
# Look for [::]:80

# Test HTTP access by using the DNS name, not a raw IPv6 literal URL
Invoke-WebRequest -Uri "http://sharepoint.example.com"

# Check IIS access logs for IPv6 connections
Get-Content "C:\inetpub\logs\LogFiles\W3SVC1\*.log" |
  Select-String "2001:" | Select-Object -Last 10
```

SharePoint's IPv6 accessibility is achieved through Windows and IIS listening on IPv6 and through FQDN-based access via AAAA DNS records. SharePoint supports IPv6 environments, but end-user SharePoint URLs must use DNS names; raw IPv6 literal URLs are not supported for browsing.
