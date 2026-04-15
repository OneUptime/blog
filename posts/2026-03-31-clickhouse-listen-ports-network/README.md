# How to Configure ClickHouse Listen Ports and Network Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Database, Configuration, Networking, Security

Description: Learn how to configure ClickHouse listen addresses, TCP/HTTP ports, and network interfaces to control access and expose the right endpoints for your environment.

---

By default ClickHouse listens on localhost and exposes several ports. In production you usually want to control which interfaces ClickHouse binds to, change the default port numbers to avoid conflicts, and disable endpoints that are not used. This guide covers all the relevant network configuration options.

## Default Port Assignments

ClickHouse uses the following ports out of the box:

```text
8123  - HTTP interface (plain text)
8443  - HTTPS interface (TLS)
9000  - Native TCP interface (clickhouse-client, drivers)
9440  - Native TCP interface with TLS
9009  - Inter-server HTTP port (replication, fetch)
9004  - MySQL compatibility protocol port
9005  - PostgreSQL compatibility protocol port
```

## Changing the Listen Address

By default ClickHouse binds to localhost on both IPv4 and IPv6. To listen on all interfaces or restrict to a specific address, set `<listen_host>` in `/etc/clickhouse-server/config.xml`. Use `::` to accept connections from everywhere on both IPv4 and IPv6:

```xml
<clickhouse>
    <!-- Only listen on the private network interface -->
    <listen_host>10.0.1.50</listen_host>

    <!-- Allow localhost connections from the same machine -->
    <listen_host>127.0.0.1</listen_host>
    <listen_host>::1</listen_host>
</clickhouse>
```

Multiple `<listen_host>` entries are allowed. ClickHouse binds to each address listed.

## Changing Port Numbers

All port settings live under the top-level `<clickhouse>` element:

```xml
<clickhouse>
    <!-- HTTP interface -->
    <http_port>8123</http_port>

    <!-- Native TCP interface -->
    <tcp_port>9000</tcp_port>

    <!-- Inter-server HTTP for replication -->
    <interserver_http_port>9009</interserver_http_port>
</clickhouse>
```

To move ClickHouse to non-standard ports (useful when sharing a server with other services):

```xml
<clickhouse>
    <http_port>18123</http_port>
    <tcp_port>19000</tcp_port>
    <interserver_http_port>19009</interserver_http_port>
</clickhouse>
```

## Disabling Unused Ports

If you do not use the HTTP interface, comment out or remove its port entry. ClickHouse will not open the socket at all:

```xml
<clickhouse>
    <!-- Disable the plain HTTP port - only native TCP is needed -->
    <!-- <http_port>8123</http_port> -->

    <!-- Keep native TCP -->
    <tcp_port>9000</tcp_port>

    <!-- Disable MySQL compat port if not needed -->
    <!-- <mysql_port>9004</mysql_port> -->
</clickhouse>
```

## Enabling TLS Ports

To enable TLS for the HTTP interface:

```xml
<clickhouse>
    <https_port>8443</https_port>

    <openSSL>
        <server>
            <certificateFile>/etc/clickhouse-server/ssl/server.crt</certificateFile>
            <privateKeyFile>/etc/clickhouse-server/ssl/server.key</privateKeyFile>
            <dhParamsFile>/etc/clickhouse-server/ssl/dhparam.pem</dhParamsFile>
            <verificationMode>none</verificationMode>
            <loadDefaultCAFile>true</loadDefaultCAFile>
            <cacheSessions>true</cacheSessions>
            <disableProtocols>sslv2,sslv3</disableProtocols>
            <preferServerCiphers>true</preferServerCiphers>
        </server>
    </openSSL>
</clickhouse>
```

For native TCP with TLS:

```xml
<clickhouse>
    <tcp_port_secure>9440</tcp_port_secure>
</clickhouse>
```

## Configuring the Interserver HTTP Host

When running a ClickHouse cluster, replicas communicate through the interserver HTTP port. You must tell each replica what hostname or IP its peers should use to reach it:

```xml
<clickhouse>
    <interserver_http_host>clickhouse-node-01.internal</interserver_http_host>
    <interserver_http_port>9009</interserver_http_port>
</clickhouse>
```

If this is not set, ClickHouse tries to determine the hostname automatically, which can produce incorrect addresses in container or cloud environments.

## Setting Connection Limits

```xml
<clickhouse>
    <!-- Maximum number of open TCP connections -->
    <max_connections>4096</max_connections>

    <!-- Maximum number of connections waiting in the TCP accept queue -->
    <listen_backlog>64</listen_backlog>
</clickhouse>
```

## Configuring Keep-Alive for HTTP

```xml
<clickhouse>
    <keep_alive_timeout>3</keep_alive_timeout>
</clickhouse>
```

This controls how long idle HTTP connections remain open. Increasing it can reduce connection overhead for clients that send many small queries in sequence.

## Customizing HTTP OPTIONS Response Headers

```xml
<clickhouse>
    <http_options_response>
        <header>
            <name>Access-Control-Allow-Origin</name>
            <value>*</value>
        </header>
    </http_options_response>
</clickhouse>
```

## Firewall Rules to Pair with Config Changes

After changing listen addresses and ports, update firewall rules to match. Example using `ufw`:

```bash
# Allow clickhouse native TCP from application servers only
ufw allow from 10.0.1.0/24 to any port 9000 proto tcp

# Allow HTTP interface from monitoring host
ufw allow from 10.0.2.10 to any port 8123 proto tcp

# Allow inter-server replication between ClickHouse nodes
ufw allow from 10.0.3.0/24 to any port 9009 proto tcp

# Block everything else on ClickHouse ports
ufw deny 8123
ufw deny 9000
ufw deny 9009
```

## Verifying Port Bindings

After restarting ClickHouse, confirm it is listening on the expected addresses and ports:

```bash
ss -tlnp | grep clickhouse
```

Expected output example:

```text
LISTEN  0   64   10.0.1.50:9000   0.0.0.0:*   users:(("clickhouse-ser",pid=12345,fd=22))
LISTEN  0   64   10.0.1.50:8123   0.0.0.0:*   users:(("clickhouse-ser",pid=12345,fd=21))
LISTEN  0   64   10.0.1.50:9009   0.0.0.0:*   users:(("clickhouse-ser",pid=12345,fd=23))
```

## Testing Connectivity

```bash
# Test HTTP interface
curl -s "http://10.0.1.50:8123/?query=SELECT+1"

# Test native TCP interface with clickhouse-client
clickhouse-client --host 10.0.1.50 --port 9000 --query "SELECT 1"

# Test HTTPS (skip certificate verification for self-signed certs)
curl -sk "https://10.0.1.50:8443/?query=SELECT+1"
```

## Complete Minimal Production Network Config

```xml
<clickhouse>
    <!-- Bind only to private interface and localhost -->
    <listen_host>10.0.1.50</listen_host>
    <listen_host>127.0.0.1</listen_host>

    <!-- Standard ports -->
    <http_port>8123</http_port>
    <tcp_port>9000</tcp_port>
    <interserver_http_port>9009</interserver_http_port>
    <interserver_http_host>10.0.1.50</interserver_http_host>

    <!-- Disable unused protocols -->
    <!-- <mysql_port>9004</mysql_port> -->
    <!-- <postgresql_port>9005</postgresql_port> -->

    <!-- Connection limits -->
    <max_connections>2048</max_connections>
    <keep_alive_timeout>3</keep_alive_timeout>
</clickhouse>
```

## Conclusion

ClickHouse network configuration is straightforward once you understand the port layout. Restrict `<listen_host>` to internal interfaces in production, disable any protocol ports you do not use, set `<interserver_http_host>` explicitly in replicated clusters, and back up your configuration choices with matching firewall rules. Testing with `curl` and `clickhouse-client` after each change confirms the server is accessible on the expected endpoints.
