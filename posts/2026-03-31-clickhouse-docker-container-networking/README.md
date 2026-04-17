# How to Configure ClickHouse Docker Container Networking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Docker, Networking, Container, TCP, HTTP, Port

Description: Learn how to configure Docker networking for ClickHouse containers, including port mappings, custom networks, and connecting multiple services.

---

ClickHouse exposes two main network interfaces: HTTP on port 8123 and the native TCP protocol on port 9000. Properly configuring Docker networking ensures that clients, monitoring tools, and other services can connect reliably.

## ClickHouse Network Ports

| Port  | Protocol | Purpose                        |
|-------|----------|--------------------------------|
| 8123  | HTTP     | REST queries, health checks    |
| 9000  | TCP      | Native client, inter-node      |
| 9440  | TLS TCP  | Secure native connections      |
| 8443  | HTTPS    | Secure HTTP interface          |

## Basic Port Mapping

In a `docker-compose.yml`, map ports to the host:

```yaml
services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    ports:
      - "8123:8123"
      - "9000:9000"
```

To restrict binding to a specific host IP (preventing exposure on all interfaces):

```yaml
ports:
  - "127.0.0.1:8123:8123"
  - "127.0.0.1:9000:9000"
```

## Custom Docker Networks

When multiple containers need to communicate (e.g., ClickHouse with a data ingestion service), use a custom bridge network:

```yaml
version: "3.8"

services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.3
    networks:
      - analytics_net

  data_ingestor:
    image: myapp/ingestor:latest
    networks:
      - analytics_net
    environment:
      CLICKHOUSE_HOST: clickhouse
      CLICKHOUSE_PORT: 9000

networks:
  analytics_net:
    driver: bridge
```

Within the same Docker network, containers communicate using their service names as hostnames. The `data_ingestor` connects to ClickHouse using `clickhouse:9000`.

## Connecting ClickHouse to an External Network

If you want ClickHouse to join an existing Docker network created elsewhere:

```yaml
networks:
  shared_net:
    external: true
    name: my_existing_network
```

```bash
# Create the external network first
docker network create my_existing_network
```

## Configuring ClickHouse Listening Interfaces

By default, ClickHouse listens on all interfaces. To restrict this, provide a custom config:

```xml
<clickhouse>
    <listen_host>0.0.0.0</listen_host>
    <!-- Or restrict to a specific IP -->
    <!-- <listen_host>10.0.1.5</listen_host> -->

    <http_port>8123</http_port>
    <tcp_port>9000</tcp_port>
    <interserver_http_port>9009</interserver_http_port>
</clickhouse>
```

Mount this as a config override:

```yaml
volumes:
  - ./config/network.xml:/etc/clickhouse-server/config.d/network.xml
```

## Testing Connectivity

From another container on the same network:

```bash
docker run --rm --network analytics_net \
  curlimages/curl:latest \
  curl -s "http://clickhouse:8123/?query=SELECT+1"
```

Check which host ports Docker has published for the container:

```bash
docker port clickhouse
```

## Enabling TLS for Secure Connections

For production, enable TLS on the HTTPS and native TCP ports:

```xml
<clickhouse>
    <https_port>8443</https_port>
    <tcp_port_secure>9440</tcp_port_secure>
    <openSSL>
        <server>
            <certificateFile>/etc/clickhouse-server/server.crt</certificateFile>
            <privateKeyFile>/etc/clickhouse-server/server.key</privateKeyFile>
        </server>
    </openSSL>
</clickhouse>
```

## Summary

Configuring Docker networking for ClickHouse involves mapping the correct ports, creating custom bridge networks for service communication, and optionally restricting interfaces for security. Using named Docker networks ensures reliable service discovery between containers while keeping your ClickHouse instance isolated from unintended external access.
