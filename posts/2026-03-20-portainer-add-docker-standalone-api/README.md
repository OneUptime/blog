# How to Add a Docker Standalone Environment to Portainer via API - Add

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Environment, Docker API, TLS, Remote Management

Description: Connect Portainer to a remote Docker host using the Docker API over TCP with optional TLS authentication for secure remote management.

## Introduction

When Portainer and your Docker host are on different machines, you connect them via the Docker TCP API. The Docker daemon can expose its API on port 2375 (unsecured) or 2376 (TLS-secured). This guide covers both options, with strong recommendation for TLS in all cases.

## Prerequisites

- Remote Docker host accessible from the Portainer server
- Docker daemon configured to listen on TCP

## Step 1: Enable Docker TCP API on the Remote Host

### Option A: Unsecured TCP (Development Only - Not for Production)

Edit the Docker systemd service:

```bash
# Create override for docker service

sudo mkdir -p /etc/systemd/system/docker.service.d/
sudo tee /etc/systemd/system/docker.service.d/override.conf > /dev/null << 'EOF'
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd -H fd:// -H tcp://0.0.0.0:2375
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker

# Verify
ss -tlnp | grep 2375
```

### Option B: TLS-Secured TCP (Required for Production)

Generate CA, server, and client certificates:

```bash
# Create certificate directory
sudo mkdir -p /etc/docker/certs && cd /etc/docker/certs

# 1. Generate CA key and certificate
sudo openssl genrsa -aes256 -out ca-key.pem 4096
sudo openssl req -new -x509 -days 3650 -key ca-key.pem -sha256 -out ca.pem \
  -subj "/C=US/ST=State/L=City/O=Org/CN=Docker CA"

# 2. Generate server key and CSR
sudo openssl genrsa -out server-key.pem 4096
sudo openssl req -subj "/CN=docker-host.example.com" -sha256 \
  -new -key server-key.pem -out server.csr

# 3. Sign server certificate
printf '%s\n' \
  'subjectAltName = DNS:docker-host.example.com,IP:192.168.1.50,IP:127.0.0.1' \
  'extendedKeyUsage = serverAuth' \
  | sudo tee extfile.cnf > /dev/null
sudo openssl x509 -req -days 3650 -sha256 \
  -in server.csr -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out server-cert.pem -extfile extfile.cnf

# 4. Generate client key and certificate
sudo openssl genrsa -out key.pem 4096
sudo openssl req -subj '/CN=client' -new -key key.pem -out client.csr
printf '%s\n' 'extendedKeyUsage = clientAuth' | sudo tee extfile-client.cnf > /dev/null
sudo openssl x509 -req -days 3650 -sha256 \
  -in client.csr -CA ca.pem -CAkey ca-key.pem \
  -CAcreateserial -out cert.pem -extfile extfile-client.cnf

# 5. Set permissions
sudo chmod -v 0400 ca-key.pem key.pem server-key.pem
sudo chmod -v 0444 ca.pem server-cert.pem cert.pem
```

Configure Docker with TLS:

```bash
# Create override for docker service
sudo mkdir -p /etc/systemd/system/docker.service.d/
sudo tee /etc/systemd/system/docker.service.d/override.conf > /dev/null << 'EOF'
[Service]
ExecStart=
ExecStart=/usr/bin/dockerd --tlsverify --tlscacert=/etc/docker/certs/ca.pem --tlscert=/etc/docker/certs/server-cert.pem --tlskey=/etc/docker/certs/server-key.pem -H fd:// -H tcp://0.0.0.0:2376
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker

# Verify
ss -tlnp | grep 2376
```

## Step 2: Add the Remote Environment in Portainer

### Via Web UI

1. Go to **Environments** → **Add environment**
2. Select **Docker Standalone**
3. Select **API** as the connection type
4. Enter the Docker host address: `tcp://docker-host.example.com:2376`
5. For TLS: upload the CA certificate, client certificate, and client key
6. Click **Connect**

### Via Portainer API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

# Add Docker remote environment with TLS
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/endpoints \
  -F "Name=Production Docker Host" \
  -F "URL=tcp://docker-host.example.com:2376" \
  -F "EndpointCreationType=1" \
  -F "TLS=true" \
  -F "TLSSkipVerify=false" \
  -F "TLSCACertFile=@ca.pem" \
  -F "TLSCertFile=@cert.pem" \
  -F "TLSKeyFile=@key.pem"
```

## Step 3: Firewall Configuration

```bash
# Allow port 2376 from Portainer server only
sudo ufw allow from PORTAINER_IP to any port 2376

# Or with iptables
sudo iptables -A INPUT -s PORTAINER_IP -p tcp --dport 2376 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 2376 -j DROP
```

## Verifying the Connection

```bash
# Test TLS connection manually
docker --tlsverify \
  --tlscacert=ca.pem \
  --tlscert=cert.pem \
  --tlskey=key.pem \
  -H tcp://docker-host.example.com:2376 \
  info
```

## Conclusion

Docker API-based environment connection enables Portainer to manage remote Docker hosts. Always use TLS (port 2376) in any environment beyond development - the unencrypted TCP API (port 2375) exposes Docker (and thus root access) over the network without any authentication. Store client certificates securely and rotate them regularly.
