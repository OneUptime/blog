# How to Install and Configure NATS Server on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, NATS, Message Broker, Pub/Sub, Microservices

Description: Learn how to install and configure NATS server on RHEL for lightweight, high-performance publish-subscribe messaging.

---

NATS is a lightweight, high-performance messaging system designed for cloud-native applications. It supports publish-subscribe, request-reply, and queue group patterns with minimal configuration.

## Installing NATS Server

```bash
# Download the NATS server binary
curl -L https://github.com/nats-io/nats-server/releases/download/v2.10.11/nats-server-v2.10.11-linux-amd64.tar.gz \
  -o /tmp/nats-server.tar.gz
tar xzf /tmp/nats-server.tar.gz -C /tmp/
sudo mv /tmp/nats-server-v2.10.11-linux-amd64/nats-server /usr/local/bin/
sudo chmod +x /usr/local/bin/nats-server

# Install the NATS CLI tool
curl -L https://github.com/nats-io/natscli/releases/download/v0.1.3/nats-0.1.3-linux-amd64.tar.gz \
  -o /tmp/nats-cli.tar.gz
tar xzf /tmp/nats-cli.tar.gz -C /tmp/
sudo mv /tmp/nats-0.1.3-linux-amd64/nats /usr/local/bin/
```

## Basic Configuration

```conf
# Save as /etc/nats/nats-server.conf

# Server name
server_name: nats-1

# Client connections
listen: 0.0.0.0:4222

# HTTP monitoring
http_port: 8222

# Logging
logfile: /var/log/nats/nats-server.log
debug: false
trace: false

# Limits
max_connections: 10000
max_payload: 1MB

# Authentication
authorization {
  default_permissions = {
    publish = ["*"]
    subscribe = ["*"]
  }
}
```

## Creating a systemd Service

```bash
# Create directories
sudo mkdir -p /etc/nats /var/log/nats
sudo useradd -r -s /sbin/nologin nats
sudo chown nats:nats /var/log/nats

cat << 'SERVICE' | sudo tee /etc/systemd/system/nats.service
[Unit]
Description=NATS Server
After=network.target

[Service]
User=nats
ExecStart=/usr/local/bin/nats-server -c /etc/nats/nats-server.conf
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable --now nats
```

## Testing Pub/Sub

```bash
# Subscribe to a subject in one terminal
nats sub "events.>"

# Publish a message in another terminal
nats pub events.user.created '{"user": "john", "action": "created"}'

# Request-reply pattern
nats reply "api.time" --command "date"
nats request "api.time" ""
```

## Monitoring

```bash
# Check server info
nats server info

# View statistics via HTTP monitoring
curl http://localhost:8222/varz
curl http://localhost:8222/connz
curl http://localhost:8222/subsz
```

## Firewall Configuration

```bash
sudo firewall-cmd --add-port=4222/tcp --permanent  # Client connections
sudo firewall-cmd --add-port=8222/tcp --permanent  # Monitoring
sudo firewall-cmd --reload
```

NATS is designed for simplicity and speed. It delivers messages at-most-once in its core mode. For persistent messaging with at-least-once or exactly-once delivery, use NATS JetStream.
