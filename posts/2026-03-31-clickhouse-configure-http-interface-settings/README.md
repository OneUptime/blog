# How to Configure ClickHouse HTTP Interface Settings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, HTTP Interface, API Configuration, REST API, Security

Description: Learn how to configure ClickHouse's HTTP interface settings including port, compression, authentication, and query parameters for production deployments.

---

The ClickHouse HTTP interface allows clients to interact with ClickHouse over standard HTTP/HTTPS. It is the primary way web applications, BI tools like Grafana and Metabase, and REST API clients connect to ClickHouse. Properly configuring the HTTP interface is critical for security, performance, and compatibility with client tools.

## Default Configuration

By default, ClickHouse listens on port 8123 for HTTP and can be enabled on 8443 for HTTPS:

```xml
<!-- config.xml -->
<http_port>8123</http_port>
<!-- <https_port>8443</https_port> -->
```

## Basic HTTP Query

Test the HTTP interface:

```bash
curl "http://localhost:8123/?query=SELECT+1"
# Returns: 1
```

With credentials:

```bash
curl "http://localhost:8123/?user=default&password=secret&query=SELECT+version()"
```

Or using HTTP Basic Auth:

```bash
curl -u default:secret "http://localhost:8123/?query=SELECT+version()"
```

## Configuring HTTP Handlers

You can define custom HTTP handlers for specific paths:

```xml
<!-- config.xml -->
<http_handlers>
    <rule>
        <url>/ping</url>
        <methods>GET</methods>
        <handler>
            <type>static</type>
            <status>200</status>
            <content_type>text/plain; charset=UTF-8</content_type>
            <response_content>OK</response_content>
        </handler>
    </rule>
    <rule>
        <url>/query</url>
        <methods>POST</methods>
        <handler>
            <type>dynamic_query_handler</type>
            <query_param_name>query</query_param_name>
        </handler>
    </rule>
</http_handlers>
```

## Enabling Response Compression

Configure HTTP response compression to reduce bandwidth. These are user-level settings defined in a profile in `users.xml`:

```xml
<!-- users.xml -->
<profiles>
    <default>
        <enable_http_compression>1</enable_http_compression>
        <http_zlib_compression_level>3</http_zlib_compression_level>
    </default>
</profiles>
```

Clients can request compression:

```bash
curl -H "Accept-Encoding: gzip" \
    "http://localhost:8123/?query=SELECT+*+FROM+events+LIMIT+1000000" \
    | gunzip > events.csv
```

## Configuring Timeouts

```xml
<!-- config.xml -->
<keep_alive_timeout>10</keep_alive_timeout>
<http_connection_timeout>5</http_connection_timeout>
<http_send_timeout>300</http_send_timeout>
<http_receive_timeout>300</http_receive_timeout>
```

## POST Query with Body

For long queries, send the SQL in the POST body:

```bash
curl -X POST "http://localhost:8123/" \
    --data-binary @query.sql
```

Or mix URL parameters with POST body:

```bash
curl -X POST \
    "http://localhost:8123/?database=analytics" \
    --data-binary "SELECT event_type, count() FROM events GROUP BY event_type"
```

## CORS Configuration

Enable CORS for browser-based clients:

```xml
<!-- config.xml -->
<http_options_response>
    <header>
        <name>Access-Control-Allow-Origin</name>
        <value>https://dashboard.example.com</value>
    </header>
    <header>
        <name>Access-Control-Allow-Methods</name>
        <value>GET, POST</value>
    </header>
    <header>
        <name>Access-Control-Allow-Headers</name>
        <value>*</value>
    </header>
</http_options_response>
```

## Session Management

HTTP sessions maintain state between requests:

```bash
# Start a session
curl "http://localhost:8123/?session_id=my_session_123&query=SET+max_memory_usage=10G"

# Use the session in subsequent requests
curl "http://localhost:8123/?session_id=my_session_123&query=SELECT+getSetting('max_memory_usage')"
```

## Restricting HTTP Port Access

In production, restrict the HTTP port to trusted networks:

```bash
# Firewall: allow only internal network
iptables -A INPUT -p tcp --dport 8123 -s 10.0.0.0/8 -j ACCEPT
iptables -A INPUT -p tcp --dport 8123 -j DROP
```

Or use a reverse proxy (nginx) in front of ClickHouse for authentication, rate limiting, and TLS termination.

## Summary

The ClickHouse HTTP interface is versatile and easy to integrate with any HTTP client. Configure timeouts appropriate for your query workloads, enable HTTPS for production, set up CORS if browser clients connect directly, and restrict access via firewall or reverse proxy. Custom HTTP handlers allow you to create healthcheck endpoints and specialized query paths for specific application workflows.
