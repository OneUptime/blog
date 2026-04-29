# Validation Summary: How to Configure Microsoft SQL Server for IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Microsoft SQL Server (Windows and Linux)
- SQL Server Configuration Manager
- SQL Server Browser service
- IPv6 networking
- Windows Firewall (PowerShell `New-NetFirewallRule`)
- ip6tables (Linux IPv6 firewall)
- ADO.NET / `System.Data.SqlClient` connection strings (C#)
- sqlcmd
- PowerShell (`Test-NetConnection`, `Set-Service`, `Get-NetFirewallRule`)
- mssql-conf (SQL Server on Linux configuration tool)
- SQL Server Always On Availability Groups

## Sources Consulted
- Microsoft Learn — Configure a server to listen on a specific TCP port (https://learn.microsoft.com/en-us/sql/database-engine/configure-windows/configure-a-server-to-listen-on-a-specific-tcp-port)
- Microsoft Learn — Configure the Windows Firewall to allow SQL Server access (https://learn.microsoft.com/en-us/sql/sql-server/install/configure-the-windows-firewall-to-allow-sql-server-access)
- Microsoft Learn — Configure SQL Server on Linux with mssql-conf (https://learn.microsoft.com/en-us/sql/linux/sql-server-linux-configure-mssql-conf)
- Microsoft Learn — SqlConnection.ConnectionString (https://learn.microsoft.com/en-us/dotnet/api/system.data.sqlclient.sqlconnection.connectionstring)
- Microsoft Learn — sqlcmd utility (https://learn.microsoft.com/en-us/sql/tools/sqlcmd-utility)
- Microsoft Learn — Always On availability group listener (https://learn.microsoft.com/en-us/sql/database-engine/availability-groups/windows/listeners-client-connectivity-application-failover)
- RFC 4291 — IP Version 6 Addressing Architecture (hexadecimal notation requirements)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- Debian/Ubuntu `iptables-persistent` package documentation (default rules path `/etc/iptables/rules.v6`)
- PowerShell docs — `New-NetFirewallRule`, `Test-NetConnection`

## Issues Found
1. **Invalid IPv6 placeholder addresses.** The post used `2001:db8::sql-server`, `2001:db8::ag-listener`, and `2001:db8:clients::/48` as example IPv6 addresses. IPv6 addresses are restricted to hexadecimal characters (0-9, a-f) per RFC 4291; literals such as `sql-server`, `ag-listener`, and `clients` contain characters that are not valid hex (s, q, l, r, v, g, t, n, -). Any tool would reject them as malformed addresses, so they would not work even as copy-paste examples.
   - Replaced `2001:db8::sql-server` with `2001:db8::1` (server example).
   - Replaced `2001:db8::ag-listener` with `2001:db8::100` (AG listener example, kept distinct from the server).
   - Replaced `2001:db8:clients::/48` with `2001:db8:c0::/48` (valid hex prefix in the documentation range).
2. **Wrong ip6tables-save persistence path.** The post wrote rules to `/etc/ip6tables/rules.v6`. The `iptables-persistent` / `netfilter-persistent` packages on Debian/Ubuntu (the standard mechanism for persisting IPv6 rules) load from `/etc/iptables/rules.v6`. Changed the path accordingly so the saved rules will actually be reloaded on boot.

## Review Notes
- The example uses `System.Data.SqlClient`. For new .NET projects, Microsoft recommends `Microsoft.Data.SqlClient` (the actively maintained successor). The legacy namespace still works, so this is not an error, just worth noting for future updates.
- The error log path `C:\Program Files\Microsoft SQL Server\MSSQL15.MSSQLSERVER\MSSQL\Log\ERRORLOG` is specific to SQL Server 2019 (`MSSQL15`). Newer versions use `MSSQL16` (2022) / `MSSQL17` (vNext). This is fine as an example but readers on a different version will need to adjust.
- The bracket notation `tcp:[ipv6],port` in connection strings and `sqlcmd -S "[ipv6],port"` is the documented way to disambiguate the colon-separated IPv6 address from the SQL Server port suffix and is correct.
- `mssql-conf set network.tcpport 1433` only changes the TCP port — SQL Server on Linux binds to all available IPv4/IPv6 interfaces by default, so no IPv6-specific toggle is needed. The post implies this correctly.
