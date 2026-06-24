# How to Configure mTLS for Portainer Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, mTLS, Mutual-tls, Security, Business-edition, Certificate

Description: A guide to configuring mutual TLS (mTLS) authentication for Portainer Business Edition to enforce client certificate authentication.

## Overview

Mutual TLS (mTLS) requires both the server and the client to present certificates, providing stronger authentication than username/password alone. Portainer Business Edition supports separate mTLS certificates for Edge Agent communication, and Portainer can also connect to Docker endpoints secured with TLS client certificates. This guide focuses on configuring a Docker endpoint that requires Portainer to present a client certificate.

## Prerequisites

- Portainer Business Edition
- A Certificate Authority (CA) for issuing client and server certificates
- OpenSSL for certificate generation

## Understanding mTLS in Portainer Context

Portainer uses TLS in three contexts:
1. **Web UI/API TLS**: Portainer server certificate for browser/API connections (`--sslcert` and `--sslkey`)
2. **Edge Agent mTLS**: Portainer Business Edition can use separate mTLS certificates for Edge Agent communication (`--mtlscacert`, `--mtlscert`, and `--mtlskey`)
3. **Docker Endpoint TLS**: Portainer connects to Docker daemons using a client certificate and validates the Docker daemon certificate

## Step 1: Create a Certificate Authority

```bash
mkdir -p /opt/mtls-ca/{certs,keys,requests}

# Generate CA key

openssl genrsa -out /opt/mtls-ca/keys/ca.key 4096

# Generate CA certificate
openssl req -new -x509 -days 3650 \
  -key /opt/mtls-ca/keys/ca.key \
  -out /opt/mtls-ca/certs/ca.crt \
  -subj "/C=US/ST=CA/O=MyOrg/CN=PortainerCA"
```

## Step 2: Generate Server Certificate (Docker Daemon)

Replace `docker-host.example.com` and `192.0.2.10` with the DNS name and IP address clients will use to reach the Docker host.

```bash
# Server key
openssl genrsa -out /opt/mtls-ca/keys/docker-server.key 2048

# Server CSR
openssl req -new \
  -key /opt/mtls-ca/keys/docker-server.key \
  -out /opt/mtls-ca/requests/docker-server.csr \
  -subj "/CN=docker-host.example.com"

# Extensions for the Docker daemon certificate
cat > /opt/mtls-ca/requests/docker-server-ext.cnf << 'EOF'
subjectAltName=DNS:docker-host.example.com,IP:192.0.2.10
extendedKeyUsage=serverAuth
EOF

# Sign server cert with CA
openssl x509 -req -days 365 \
  -in /opt/mtls-ca/requests/docker-server.csr \
  -CA /opt/mtls-ca/certs/ca.crt \
  -CAkey /opt/mtls-ca/keys/ca.key \
  -CAcreateserial \
  -out /opt/mtls-ca/certs/docker-server.crt \
  -extfile /opt/mtls-ca/requests/docker-server-ext.cnf
```

## Step 3: Generate Client Certificate (Portainer)

```bash
# Client key
openssl genrsa -out /opt/mtls-ca/keys/portainer-client.key 2048

# Client CSR
openssl req -new \
  -key /opt/mtls-ca/keys/portainer-client.key \
  -out /opt/mtls-ca/requests/portainer-client.csr \
  -subj "/CN=portainer-client/O=MyOrg"

# Extensions for client authentication
cat > /opt/mtls-ca/requests/portainer-client-ext.cnf << 'EOF'
extendedKeyUsage=clientAuth
EOF

# Sign client cert
openssl x509 -req -days 365 \
  -in /opt/mtls-ca/requests/portainer-client.csr \
  -CA /opt/mtls-ca/certs/ca.crt \
  -CAkey /opt/mtls-ca/keys/ca.key \
  -CAcreateserial \
  -out /opt/mtls-ca/certs/portainer-client.crt \
  -extfile /opt/mtls-ca/requests/portainer-client-ext.cnf
```

## Step 4: Configure Docker Daemon for TLS

On each Docker host that Portainer will connect to:

If your `dockerd` service already sets `-H` flags via systemd, remove that duplicate host configuration before using `hosts` in `daemon.json` or Docker will fail to start.

```bash
# Configure Docker daemon to require TLS client certs
sudo mkdir -p /etc/docker/tls

# Copy CA cert and server certs
sudo cp /opt/mtls-ca/certs/ca.crt /etc/docker/tls/
sudo cp /opt/mtls-ca/certs/docker-server.crt /etc/docker/tls/
sudo cp /opt/mtls-ca/keys/docker-server.key /etc/docker/tls/

# Configure Docker daemon
sudo tee /etc/docker/daemon.json << 'EOF'
{
  "tls": true,
  "tlscacert": "/etc/docker/tls/ca.crt",
  "tlscert": "/etc/docker/tls/docker-server.crt",
  "tlskey": "/etc/docker/tls/docker-server.key",
  "tlsverify": true,
  "hosts": ["tcp://0.0.0.0:2376", "unix:///var/run/docker.sock"]
}
EOF

sudo systemctl restart docker
```

## Step 5: Add TLS Docker Endpoint to Portainer

Via Portainer UI:
1. Navigate to **Environments** → **Add environment**
2. Select **Docker Standalone** and click **Start Wizard**
3. Under **More options**, select **API**
4. Enter the Docker host URL: `tcp://docker-host.example.com:2376`
5. Enable **TLS**
6. Upload:
   - **TLS CA certificate**: `ca.crt`
   - **TLS certificate**: `portainer-client.crt`
   - **TLS key**: `portainer-client.key`
7. Click **Connect**

Via API:
```bash
curl -X POST \
  "https://portainer.example.com:9443/api/endpoints" \
  -H "Authorization: Bearer ${JWT}" \
  -F "Name=tls-docker-host" \
  -F "EndpointCreationType=1" \
  -F "URL=tcp://docker-host.example.com:2376" \
  -F "TLS=true" \
  -F "TLSCACertFile=@/opt/mtls-ca/certs/ca.crt" \
  -F "TLSCertFile=@/opt/mtls-ca/certs/portainer-client.crt" \
  -F "TLSKeyFile=@/opt/mtls-ca/keys/portainer-client.key"
```

## Verify mTLS Connection

```bash
# Test Docker TLS connection manually
docker --tlsverify \
  --tlscacert=/opt/mtls-ca/certs/ca.crt \
  --tlscert=/opt/mtls-ca/certs/portainer-client.crt \
  --tlskey=/opt/mtls-ca/keys/portainer-client.key \
  -H tcp://docker-host.example.com:2376 \
  version

# Check that connection without client cert fails
docker --tlsverify \
  --tlscacert=/opt/mtls-ca/certs/ca.crt \
  -H tcp://docker-host.example.com:2376 \
  version
# Expected: the TLS handshake fails because the daemon requires a client certificate
```

## Conclusion

mTLS between Portainer and Docker endpoints provides strong authentication - only Portainer with the correct client certificate can manage the Docker daemon. This prevents unauthorized access even if an attacker has network access to port 2376. Always keep CA keys secure, rotate certificates before expiry, and revoke compromised certificates by reissuing and distributing updated CRLs or OCSP.
