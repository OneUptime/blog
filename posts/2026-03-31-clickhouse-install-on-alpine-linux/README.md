# How to Install ClickHouse on Alpine Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Alpine Linux, Container, Installation, musl

Description: Install ClickHouse on Alpine Linux for container and edge deployments, using the official binary or custom Docker images based on Alpine.

---

Alpine Linux is popular for container images due to its minimal size. While ClickHouse is not in Alpine's package repositories, you can run it on Alpine using the official binary or by building a custom Alpine-based Docker image.

## Using the Official Binary on Alpine

ClickHouse provides statically-linked binaries that work on Alpine's musl libc:

```bash
# Install dependencies
apk add --no-cache curl bash gcompat libgcc libstdc++

# Download ClickHouse binary
# The install script auto-detects musl libc and downloads the appropriate musl build
curl -fsSL https://clickhouse.com/ | sh
mv clickhouse /usr/local/bin/
chmod +x /usr/local/bin/clickhouse
```

## Creating the ClickHouse User and Directories

```bash
addgroup -S clickhouse
adduser -S -G clickhouse -h /var/lib/clickhouse clickhouse

mkdir -p /var/lib/clickhouse /var/log/clickhouse-server /etc/clickhouse-server
chown -R clickhouse:clickhouse /var/lib/clickhouse /var/log/clickhouse-server
```

## OpenRC Service (Alpine's Init System)

Alpine uses OpenRC instead of systemd:

```bash
cat > /etc/init.d/clickhouse-server << 'EOF'
#!/sbin/openrc-run

name="ClickHouse Server"
description="ClickHouse analytical database server"

command="/usr/local/bin/clickhouse"
command_args="server --config-file=/etc/clickhouse-server/config.xml"
command_user="clickhouse:clickhouse"
pidfile="/run/clickhouse-server.pid"
command_background=yes

depend() {
    need net
}
EOF
chmod +x /etc/init.d/clickhouse-server
rc-update add clickhouse-server default
rc-service clickhouse-server start
```

## Minimal Configuration

```xml
<clickhouse>
  <logger>
    <level>warning</level>
    <log>/var/log/clickhouse-server/clickhouse-server.log</log>
    <errorlog>/var/log/clickhouse-server/clickhouse-server.err.log</errorlog>
  </logger>
  <http_port>8123</http_port>
  <tcp_port>9000</tcp_port>
  <path>/var/lib/clickhouse/</path>
</clickhouse>
```

## Custom Alpine-Based Docker Image

For container deployments, build a lean image:

```dockerfile
FROM alpine:3.19

RUN apk add --no-cache curl bash gcompat libgcc libstdc++ && \
    curl -fsSL https://clickhouse.com/ | sh && \
    mv clickhouse /usr/local/bin/ && \
    addgroup -S clickhouse && \
    adduser -S -G clickhouse -h /var/lib/clickhouse clickhouse && \
    mkdir -p /var/lib/clickhouse /var/log/clickhouse-server /etc/clickhouse-server && \
    chown -R clickhouse:clickhouse /var/lib/clickhouse /var/log/clickhouse-server

COPY config.xml /etc/clickhouse-server/config.xml

USER clickhouse
EXPOSE 8123 9000
CMD ["clickhouse", "server", "--config-file=/etc/clickhouse-server/config.xml"]
```

## Testing the Installation

```bash
clickhouse client --query "SELECT 1"
clickhouse client --query "SELECT version()"
```

## Limitations on Alpine

- Alpine uses musl libc which may affect some ClickHouse features relying on glibc optimizations
- JIT compilation may behave differently
- For production workloads, consider Ubuntu or Debian-based containers for better compatibility

## Summary

Running ClickHouse on Alpine Linux uses the statically-linked official binary, OpenRC for service management (instead of systemd), and a minimal configuration file. Alpine-based ClickHouse images are useful for edge deployments where image size matters, though Ubuntu or Debian containers are preferred for production workloads.
