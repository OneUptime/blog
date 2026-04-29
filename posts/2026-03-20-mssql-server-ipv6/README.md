# How to Configure Microsoft SQL Server for IPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SQL Server, IPv6, MSSQL, Window, Database, Networking

Description: Configure Microsoft SQL Server to listen on IPv6 addresses and accept client connections from IPv6 networks using SQL Server Configuration Manager.

---

Microsoft SQL Server supports IPv6 natively on Windows. Enabling IPv6 connections involves configuring SQL Server Network Configuration in SQL Server Configuration Manager and opening the appropriate firewall ports.

## Configuring SQL Server for IPv6

```text
SQL Server Configuration Manager:

1. Open SQL Server Configuration Manager
   (Start > SQL Server Configuration Manager)

2. Navigate to:
   SQL Server Network Configuration > Protocols for MSSQLSERVER

3. Enable TCP/IP Protocol (if not already)
   Right-click TCP/IP > Enable

4. Configure TCP/IP Properties:
   Double-click TCP/IP > IP Addresses tab

5. Scroll down to IPAll section:
   TCP Port: 1433

6. For specific IPv6 address, find the IPv6 entry:
   IP Address: 2001:db8::1
   TCP Port: 1433
   Enabled: Yes

7. Restart SQL Server service
```

## SQL Server Browser for IPv6

```powershell
# Enable SQL Server Browser service for named instances

Set-Service -Name 'SQLBrowser' -StartupType Automatic
Start-Service -Name 'SQLBrowser'

# SQL Server Browser listens on UDP 1434
# For IPv6 named instances, Browser handles discovery
```

## Windows Firewall for SQL Server IPv6

```powershell
# Allow SQL Server over IPv6 (Windows Firewall)
New-NetFirewallRule `
  -DisplayName "SQL Server IPv6" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 1433 `
  -Action Allow

# Allow SQL Server Browser
New-NetFirewallRule `
  -DisplayName "SQL Browser UDP IPv6" `
  -Direction Inbound `
  -Protocol UDP `
  -LocalPort 1434 `
  -Action Allow

# Verify rules
Get-NetFirewallRule | Where-Object DisplayName -like "*SQL*"

# Verify SQL Server is listening on IPv6
netstat -an | Select-String "1433"
# Should show [::]:1433 for IPv6 listening
```

## SQL Server Connection Strings for IPv6

```csharp
// C# - ADO.NET connection string with IPv6
// Method 1: Direct IPv6 address (bracket notation)
string connStr = "Server=tcp:[2001:db8::1],1433;" +
                 "Database=MyDatabase;" +
                 "User Id=sa;Password=SecurePass;";

// Method 2: Hostname with AAAA record (recommended)
string connStr2 = "Server=sqlserver.example.com,1433;" +
                  "Database=MyDatabase;" +
                  "User Id=sa;Password=SecurePass;";

// Method 3: Full connection string
string connStr3 = "Data Source=tcp:[2001:db8::1],1433;" +
                  "Initial Catalog=MyDatabase;" +
                  "Integrated Security=False;" +
                  "User ID=sa;Password=SecurePass;";
```

## Testing SQL Server IPv6 Connectivity

```powershell
# Test TCP connectivity to SQL Server over IPv6
Test-NetConnection -ComputerName "2001:db8::1" -Port 1433

# Connect using sqlcmd over IPv6
sqlcmd -S "[2001:db8::1],1433" -U sa -P password -Q "SELECT @@VERSION"

# Test with PowerShell
$conn = New-Object System.Data.SqlClient.SqlConnection
$conn.ConnectionString = "Server=tcp:[2001:db8::1],1433;Database=master;User Id=sa;Password=pass;"
$conn.Open()
$conn.State  # Should show "Open"
$conn.Close()

# Check SQL Server error log for IPv6 connections
Get-Content "C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\Log\ERRORLOG" |
  Where-Object { $_ -match "ipv6|::" }
```

## SQL Server on Linux (IPv6)

```bash
# Configure SQL Server on Ubuntu/RHEL for IPv6
# mssql-conf on Linux
sudo /opt/mssql/bin/mssql-conf set network.tcpport 1433

# Verify SQL Server is listening on IPv6
ss -6 -tlnp | grep 1433

# Firewall for SQL Server on Linux
sudo ip6tables -A INPUT -p tcp \
  -s 2001:db8:c0::/48 \
  --dport 1433 -j ACCEPT

sudo ip6tables-save > /etc/iptables/rules.v6

# Connect via sqlcmd on Linux over IPv6
sqlcmd -S "tcp:[2001:db8::1],1433" -U sa -P password
```

## Always On Availability Groups over IPv6

```text
For SQL Server Always On AG with IPv6:

1. Listener DNS name must have AAAA record:
   myag-listener.example.com IN AAAA 2001:db8::100

2. Availability Group Listener:
   Create Listener > IP Address > Add IPv6 address: 2001:db8::100

3. Clients connect via listener FQDN:
   Server=myag-listener.example.com,1433;
   MultiSubnetFailover=True;

4. Windows Cluster must support IPv6 IPs
```

SQL Server's IPv6 support via SQL Server Configuration Manager enables enterprise databases to accept connections from IPv6 clients, with FQDN-based connection strings using AAAA records being the recommended approach for flexible dual-stack deployments.
