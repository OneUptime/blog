# Validation Summary: Why Azure SQL Private Endpoints Ignore Ping: Test TCP 1433

## Status
validated

## Post Type
Technical troubleshooting guide with PowerShell, command-line, Python, and SQL examples.

## Technologies Covered
- Azure SQL Database, Private Link, and private endpoints
- DNS, IPv4/IPv6, TCP, ICMP, TLS, and TDS
- Azure VNets, peering, VPN, ExpressRoute, NSGs, and routing
- PowerShell Resolve-DnsName and Test-NetConnection
- Sysinternals PsPing and BIND nslookup
- Python 3 socket and time modules
- Transact-SQL and SQL client authentication

## Sources Consulted
- [Azure Private Link FAQ](https://learn.microsoft.com/en-us/azure/private-link/private-link-faq): supported protocols and private endpoint network policies.
- [Azure SQL Private Link guide](https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview?view=azuresql): hostname requirements, approval, IPv6 preview, TCP probes, and private endpoint Redirect requirements.
- [Azure SQL connectivity architecture](https://learn.microsoft.com/en-us/azure/azure-sql/database/connectivity-architecture?view=azuresql): gateway connection establishment and Proxy/Redirect behavior.
- [Private endpoint connectivity troubleshooting](https://learn.microsoft.com/en-us/troubleshoot/azure/private-link/troubleshoot-private-endpoint-connectivity-failure): DNS, approval, routes, peering, and filtering diagnostics.
- [Private endpoint DNS integration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration): private zones, VNet links, and conditional forwarding.
- [Private endpoint network policies](https://learn.microsoft.com/en-us/azure/private-link/disable-private-endpoint-network-policy): NSG and route-policy applicability.
- [Resolve-DnsName](https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname?view=windowsserver2025-ps): hostname lookup syntax.
- [Test-NetConnection](https://learn.microsoft.com/en-us/powershell/module/nettcpip/test-netconnection?view=windowsserver2025-ps): parameters and detailed TCP result fields.
- [Sysinternals PsPing](https://learn.microsoft.com/en-us/sysinternals/downloads/psping): destination:port TCP probe syntax.
- [BIND nslookup manual](https://bind9.readthedocs.io/en/latest/manpages.html#nslookup-query-internet-name-servers-interactively): noninteractive hostname lookup syntax.
- [Python socket documentation](https://docs.python.org/3/library/socket.html): create_connection, address iteration, timeouts, exceptions, socket context management, and address methods.
- [Python time documentation](https://docs.python.org/3/library/time.html#time.monotonic): monotonic elapsed-time measurement.
- [DB_NAME](https://learn.microsoft.com/en-us/sql/t-sql/functions/db-name-transact-sql?view=sql-server-2016): current database name when no argument is supplied; documentation also applies to Azure SQL Database.
- [USER_NAME](https://learn.microsoft.com/en-us/sql/t-sql/functions/user-name-transact-sql?view=azuresqldb-current): current database user when no argument is supplied.
- [SYSUTCDATETIME](https://learn.microsoft.com/en-us/sql/t-sql/functions/sysutcdatetime-transact-sql?view=sql-server-ver17): UTC datetime2 value and function syntax.
- [ODBC authentication and encryption](https://learn.microsoft.com/en-us/sql/connect/odbc/using-azure-active-directory?view=sql-server-ver17): authentication, managed identities, and certificate validation.
- [RFC 9293](https://www.rfc-editor.org/rfc/rfc9293.html): TCP connection establishment and reset/refusal behavior.
- [Author profile](https://github.com/nawazdhandala): verified the post's author link resolves to the intended profile.

## Issues Found
1. DNS guidance only mentioned the final A record. Added AAAA records for IPv6, because Azure SQL private endpoints now have documented IPv6 preview support. The instruction to compare the resolved address with the intended endpoint remains unchanged.
2. The Python explanation asserted that exactly one socket is opened and closed. create_connection can try multiple resolved addresses before succeeding. Clarified that the example establishes one successful connection, may attempt other addresses first, and includes DNS resolution and earlier attempts in the elapsed measurement. The executable example is correct and was left unchanged.
3. The post stated that opening public SQL access changes the path being tested. Enabling public access alone does not change client DNS or routing. Qualified the statement: public access can mask a private-path failure when the client resolves the hostname publicly.

## Review Notes
- Confirmed that private endpoints do not support ICMP and that TCP success is distinct from an authenticated SQL session.
- Confirmed the private endpoint Redirect range is TCP 1433–65535, with the documented client outbound and endpoint inbound prerequisites. The public endpoint Redirect range must not replace it. Existing private endpoints under Default use Proxy as stated in the cited guide.
- Commands, parameters, and SQL function calls match official documentation. No deprecated API is used by the examples. Python syntax was checked locally with ast.parse.
- Python timeout=5 applies to socket attempts, not an overall deadline covering DNS and all resolved addresses. On failure, create_connection normally reports the last attempted address's exception.
- The logical-server hostname and connection-policy discussion applies to Azure SQL Database; Azure SQL Managed Instance has separate connectivity documentation.
- All links in the post were checked and point to the intended resources. Two SQL reference pages required alternate view URLs/search retrieval during review; these are review sources, not broken post links.
- Validation consists of documentation review and local Python syntax checking. No live Azure private endpoint, Windows diagnostic tools, or authenticated SQL session was exercised; the example hostname must be replaced with the reader's actual server.
