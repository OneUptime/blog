# How to Configure RabbitMQ TLS/SSL Listeners on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RabbitMQ, TLS, SSL, IPv4, Encryption, AMQPS, Messaging

Description: Enable TLS/SSL on RabbitMQ AMQP listeners for encrypted IPv4 connections, configure certificates, and connect clients using AMQPS on port 5671.

## Introduction

RabbitMQ AMQP without TLS sends messages in plaintext. AMQPS (AMQP with TLS) on port 5671 encrypts all traffic. This is essential for production deployments where RabbitMQ is accessed over untrusted networks.

## Generating Certificates

```bash
# CA certificate

openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key -out ca.crt \
  -subj "/CN=RabbitMQ CA" \
  -addext "basicConstraints = critical,CA:TRUE" \
  -addext "keyUsage = critical,keyCertSign,cRLSign"

# Server certificate
openssl genrsa -out server.key 2048
cat > server.ext <<'EOF'
basicConstraints = CA:FALSE
keyUsage = digitalSignature,keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName = IP:10.0.0.5
EOF
openssl req -new -key server.key -out server.csr \
  -subj "/CN=10.0.0.5"
openssl x509 -req -days 3650 -in server.csr \
  -CA ca.crt -CAkey ca.key -CAcreateserial -out server.crt \
  -extfile server.ext
rm server.ext

# Copy to RabbitMQ config directory
sudo cp ca.crt server.crt server.key /etc/rabbitmq/
sudo chown rabbitmq:rabbitmq /etc/rabbitmq/{ca.crt,server.crt,server.key}
sudo chmod 600 /etc/rabbitmq/server.key
```

## TLS Configuration

```bash
# /etc/rabbitmq/rabbitmq.conf

# Plain AMQP (can keep for internal connections)
listeners.tcp.1 = 127.0.0.1:5672

# AMQPS listener on specific IPv4
listeners.ssl.1 = 10.0.0.5:5671

# TLS/SSL settings
ssl_options.cacertfile = /etc/rabbitmq/ca.crt
ssl_options.certfile   = /etc/rabbitmq/server.crt
ssl_options.keyfile    = /etc/rabbitmq/server.key
ssl_options.verify     = verify_peer
ssl_options.fail_if_no_peer_cert = false    # Set to true for mutual TLS

# TLS version restrictions
ssl_options.versions.1 = tlsv1.2
ssl_options.versions.2 = tlsv1.3

# Strong ciphers for TLSv1.2 and TLSv1.3
ssl_options.ciphers.1 = ECDHE-RSA-AES128-GCM-SHA256
ssl_options.ciphers.2 = ECDHE-RSA-AES256-GCM-SHA384
ssl_options.ciphers.3 = TLS_AES_128_GCM_SHA256
ssl_options.ciphers.4 = TLS_AES_256_GCM_SHA384
ssl_options.ciphers.5 = TLS_CHACHA20_POLY1305_SHA256
```

```bash
sudo systemctl restart rabbitmq-server

# Verify TLS listener
sudo rabbitmq-diagnostics listeners
# Should include an amqp/ssl listener on 10.0.0.5:5671
```

## Firewall for AMQPS

```bash
# Allow AMQPS from app servers
sudo ufw allow from 10.0.0.0/24 to any port 5671
sudo ufw deny 5671

# If you expose plain AMQP on another interface:
# sudo ufw deny from 0.0.0.0/0 to any port 5672
```

## Connecting Clients with TLS

```bash
# Python (pika):
import pika
import ssl

ssl_context = ssl.create_default_context(cafile="/etc/rabbitmq/ca.crt")
ssl_options = pika.SSLOptions(ssl_context, "10.0.0.5")
params = pika.ConnectionParameters(
    host="10.0.0.5",
    port=5671,
    ssl_options=ssl_options,
    credentials=pika.PlainCredentials("appuser", "apppass")
)
conn = pika.BlockingConnection(params)

# Node.js (amqplib):
const amqp = require('amqplib');
const fs = require('fs');

async function main() {
  const conn = await amqp.connect('amqps://appuser:apppass@10.0.0.5:5671', {
    ca: [fs.readFileSync('/etc/rabbitmq/ca.crt')]
  });
}

main().catch(console.error);
```

## Verifying TLS

```bash
# Test TLS handshake
openssl s_client -connect 10.0.0.5:5671 \
  -CAfile /etc/rabbitmq/ca.crt -verify_ip 10.0.0.5

# Check TLS certificates configured in RabbitMQ
sudo rabbitmq-diagnostics certificates

# View TLS connections
sudo rabbitmqctl list_connections ssl ssl_protocol ssl_cipher peer_host user
```

## Conclusion

Enable RabbitMQ AMQPS by adding `listeners.ssl.1 = ip:5671` and configuring `ssl_options.*` in `rabbitmq.conf`. Restrict TLS versions to 1.2 and 1.3, and use strong cipher suites. Clients connect on port 5671 using `amqps://` with the CA certificate for server verification. For internal traffic, keep plain AMQP on localhost and require AMQPS for all remote connections.
