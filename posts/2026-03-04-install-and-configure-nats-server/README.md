# How to Install and Configure NATS Server on RHEL 9

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, NATS, Message Broker, Linux

Description: Learn how to install and Configure NATS Server on RHEL 9 with step-by-step instructions, configuration examples, and best practices.

---

NATS is a lightweight, high-performance messaging system designed for cloud-native applications. It supports publish-subscribe, request-reply, and queue group patterns with minimal configuration and extremely low latency.

## Prerequisites

- RHEL 9
- Root or sudo access

## Step 1: Install NATS Server

```bash
NATS_SERVER_VERSION=v2.14.0
curl -LO "https://github.com/nats-io/nats-server/releases/download/${NATS_SERVER_VERSION}/nats-server-${NATS_SERVER_VERSION}-linux-amd64.tar.gz"
tar -xzf "nats-server-${NATS_SERVER_VERSION}-linux-amd64.tar.gz"
sudo install -m 0755 "nats-server-${NATS_SERVER_VERSION}-linux-amd64/nats-server" /usr/local/bin/nats-server
nats-server --version
```

## Step 2: Create Configuration

```bash
sudo mkdir -p /etc/nats
sudo vi /etc/nats/nats-server.conf
```

```bash
port: 4222
http_port: 8222

max_payload: 1MB
max_connections: 65536

authorization {
    users = [
        {user: "app", password: "secret123"}
    ]
}

log_file: "/var/log/nats/nats-server.log"
logfile_size_limit: 100MB
logfile_max_num: 5
```

## Step 3: Create systemd Service

```bash
sudo useradd -r -s /sbin/nologin nats
sudo mkdir -p /var/log/nats
sudo chown nats:nats /var/log/nats

sudo vi /etc/systemd/system/nats.service
```

```ini
[Unit]
Description=NATS Server
After=network.target

[Service]
ExecStart=/usr/local/bin/nats-server -c /etc/nats/nats-server.conf
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
User=nats
Group=nats
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now nats
```

## Step 4: Install NATS CLI

```bash
sudo dnf install -y unzip

NATS_CLI_VERSION=0.4.0
curl -LO "https://github.com/nats-io/natscli/releases/download/v${NATS_CLI_VERSION}/nats-${NATS_CLI_VERSION}-linux-amd64.zip"
unzip "nats-${NATS_CLI_VERSION}-linux-amd64.zip"
sudo install -m 0755 "nats-${NATS_CLI_VERSION}-linux-amd64/nats" /usr/local/bin/nats
```

## Step 5: Test Publish/Subscribe

In one terminal, subscribe:

```bash
nats sub "test.>" --server nats://app:secret123@localhost:4222
```

In another, publish:

```bash
nats pub test.hello "Hello NATS" --server nats://app:secret123@localhost:4222
```

## Step 6: Monitor

Access the monitoring endpoint at `http://localhost:8222/`.

```bash
curl http://localhost:8222/varz
```

## Conclusion

NATS provides an ultra-fast messaging system on RHEL 9 with minimal configuration overhead. Its simplicity and performance make it ideal for microservice communication, IoT messaging, and real-time data distribution.
