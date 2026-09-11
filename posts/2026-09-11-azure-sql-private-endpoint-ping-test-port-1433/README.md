# Why Azure SQL Private Endpoints Ignore Ping: Test TCP 1433

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure SQL, Private Endpoint, Networking, Troubleshooting, Azure

Description: Test Azure SQL private endpoint connectivity using DNS, TCP 1433, and authenticated SQL queries, and account for Redirect connection policy requirements.

---

A failed `ping` to an Azure SQL private endpoint does not prove that the endpoint is down. Private endpoints support TCP and UDP, and ICMP echo is not supported. A SQL client uses TCP, so the useful test is whether that client can resolve the intended address, establish a TCP connection, and complete an authenticated SQL session.

The [Private Link FAQ](https://learn.microsoft.com/en-us/azure/private-link/private-link-faq) documents the protocol limitation. Opening ICMP rules or repeatedly recreating an endpoint will not turn an ICMP probe into a meaningful SQL health check.

## Start from the client that actually fails

Run diagnostics on the application host, build agent, or VPN-connected workstation experiencing the problem. A portal session or a VM in a different network can have a different DNS resolver and route.

Record the logical SQL server hostname, expected private endpoint IP, database name, client source network, and time of the failure. In the Azure portal, verify that the private endpoint connection is approved and associated with the intended logical server.

An endpoint resource existing in the portal proves configuration exists. It does not prove that a particular client has a route to it. Likewise, a healthy connection from one spoke does not establish the route from another spoke or an office VPN.

## Confirm DNS before testing the port

Use the SQL server's normal hostname:

```powershell
Resolve-DnsName orders-prod.database.windows.net
```

Or on Linux and macOS:

```bash
nslookup orders-prod.database.windows.net
```

The final address should match the private endpoint network interface. A CNAME containing `privatelink` alone is insufficient: inspect the final A record (or AAAA record when using IPv6). The same name can ultimately resolve publicly when the client does not reach the private DNS zone.

If the answer is public, investigate resolver configuration, private zone links, and conditional forwarding. A TCP connection to a public address might succeed and still fail to test the private network path you intended.

Keep `orders-prod.database.windows.net` in SQL connection strings. Azure SQL requires its logical server hostname for login routing; the private-link alias and a raw IP are not substitutes.

## Probe TCP 1433 explicitly

On Windows, use:

```powershell
Test-NetConnection `
  -ComputerName orders-prod.database.windows.net `
  -Port 1433 `
  -InformationLevel Detailed
```

Focus on `RemoteAddress`, `SourceAddress`, and `TcpTestSucceeded`. A warning about ICMP or a failed ping field can coexist with a successful TCP probe. The TCP result is what matters for this stage.

If available, Sysinternals PsPing can perform a TCP test:

```text
psping.exe orders-prod.database.windows.net:1433
```

The `:1433` matters. This invocation measures TCP connection establishment, despite the tool's name. It does not execute a SQL query or validate a managed identity.

For a portable check with Python 3:

```python
import socket
import time

server = "orders-prod.database.windows.net"
started = time.monotonic()
try:
    with socket.create_connection((server, 1433), timeout=5) as connection:
        print("Connected to", connection.getpeername())
        print("Source address", connection.getsockname())
        print("TCP seconds", round(time.monotonic() - started, 3))
except OSError as error:
    print(type(error).__name__, str(error))
    raise SystemExit(1)
```

This establishes and closes one TCP connection on success, potentially trying multiple resolved addresses first. The elapsed time includes DNS resolution and any earlier connection attempts. It does not send TDS login data. A successful result proves that the TCP handshake completed from that source at that moment, with the destination shown in the output.

## Interpret a failure at the correct layer

A DNS error means no usable address was obtained. A TCP timeout commonly means packets or replies are being dropped, a route is missing, or the endpoint path is unavailable. A connection refusal means a host or network component actively rejected the connection; it is not the same result as a timeout.

When DNS resolves privately but TCP fails, inspect VPN or ExpressRoute routes, VNet peering, effective client routes, source outbound restrictions, and any network virtual appliance. Check endpoint subnet network policies before assuming that an NSG attached to the subnet is filtering private endpoint traffic in the way you expect.

Make one routing or filtering change at a time and rerun from the same client. Broadly opening public SQL access can hide the actual private-network fault if the client resolves the hostname publicly; enabling public access alone does not change a client's DNS resolution or route.

## Account for Redirect connections

TCP 1433 is the initial gateway test. It is not always the complete port requirement. Azure SQL's private endpoint documentation specifies a broader TCP range, **1433 through 65535**, for clients using supported drivers with the Redirect connection policy.

Check the server's connection policy in the Azure portal. For private endpoint Redirect, the documented prerequisites cover outbound communication from the client VNet and inbound communication to the endpoint VNet across that range. Existing private endpoints with Default policy use Proxy behavior according to the [SQL Private Link guide](https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview?view=azuresql#use-redirect-connection-policy-with-private-endpoints).

Do not copy the public-endpoint Redirect range into a private-endpoint runbook. If the broader private range cannot be allowed, evaluate Proxy policy with the application owner and measure its latency and throughput implications.

## Finish with a real SQL connection

Use SSMS or the application's supported driver with encryption and certificate validation enabled. Connect directly to the target database with the normal server hostname and intended authentication method, then execute:

```sql
SELECT DB_NAME() AS database_name,
       USER_NAME() AS database_user,
       SYSUTCDATETIME() AS observed_at_utc;
```

A login failure after a successful TCP test moves the investigation toward authentication, database selection, or permissions. A SQL connection that stalls after the initial gateway probe can require closer inspection of Redirect routing, TLS, driver behavior, or database availability.

Record the final query result and source environment in the incident notes. That is stronger evidence than a green TCP probe alone.

## Conclusion

Ignore ICMP as a health signal for Azure SQL private endpoints. Verify private DNS, test TCP 1433 from the affected client, account for connection policy, and confirm recovery with an authenticated query.

## Official Documentation

- [Private Link protocol FAQ](https://learn.microsoft.com/en-us/azure/private-link/private-link-faq)
- [Azure SQL private endpoint connectivity](https://learn.microsoft.com/en-us/azure/azure-sql/database/private-endpoint-overview?view=azuresql)
- [Azure SQL connectivity architecture](https://learn.microsoft.com/en-us/azure/azure-sql/database/connectivity-architecture?view=azuresql)
- [Troubleshoot private endpoint connectivity](https://learn.microsoft.com/en-us/troubleshoot/azure/private-link/troubleshoot-private-endpoint-connectivity-failure)
- [Private endpoint DNS integration](https://learn.microsoft.com/en-us/azure/private-link/private-endpoint-dns-integration)
