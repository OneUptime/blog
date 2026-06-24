# How to Set Up mTLS (Mutual TLS) in Portainer Business Edition

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, mTLS, Security, Business Edition, TLS

Description: Configure mutual TLS (mTLS) in Portainer Business Edition to require client certificate authentication for the highest level of API and UI security.

---

Mutual TLS (mTLS) requires both the server and the client to present valid certificates, ensuring that only authenticated clients can connect to Portainer. Portainer Server itself does not expose a CLI flag that turns its HTTPS endpoint into mTLS-required, so we terminate mTLS at an nginx reverse proxy that sits in front of Portainer. Portainer's own mTLS flags apply to the Edge Agent ⇄ Portainer channel.

## Understanding mTLS

In standard TLS, only the server presents a certificate. In mTLS:
- Server presents its certificate to the client
- Client also presents its certificate to the server
- Both must be signed by a trusted CA

## Prerequisites

- A Certificate Authority (CA) certificate
- Server certificate signed by the CA
- Client certificates signed by the same CA
- nginx (used as the mTLS-terminating reverse proxy in front of Portainer)

## Step 1: Generate a CA and Certificates

```bash
# Create a directory for CA management

mkdir -p /opt/portainer-ca/{ca,server,client}
cd /opt/portainer-ca

# Generate CA private key and self-signed certificate
openssl genrsa -out ca/ca.key 4096
openssl req -new -x509 -days 3650 -key ca/ca.key \
  -out ca/ca.crt \
  -subj "/C=US/O=MyOrg/CN=Portainer-CA"

# Generate server certificate
openssl genrsa -out server/portainer.key 2048
openssl req -new -key server/portainer.key \
  -out server/portainer.csr \
  -subj "/C=US/O=MyOrg/CN=portainer.example.com"
openssl x509 -req -days 365 \
  -in server/portainer.csr \
  -CA ca/ca.crt \
  -CAkey ca/ca.key \
  -CAcreateserial \
  -out server/portainer.crt

# Generate a client certificate
openssl genrsa -out client/client.key 2048
openssl req -new -key client/client.key \
  -out client/client.csr \
  -subj "/C=US/O=MyOrg/CN=portainer-client"
openssl x509 -req -days 365 \
  -in client/client.csr \
  -CA ca/ca.crt \
  -CAkey ca/ca.key \
  -CAcreateserial \
  -out client/client.crt
```

## Step 2: Configure Portainer with TLS

Start Portainer with its server certificate. The current TLS flags are `--tlsverify`, `--tlscert`, and `--tlskey` (the older `--ssl`, `--sslcert`, `--sslkey` flags still work but emit deprecation warnings):

```bash
# Start Portainer with the TLS server certificate
docker run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /opt/portainer-ca:/certs:ro \
  portainer/portainer-ee:latest \
  --tlsverify \
  --tlscert /certs/server/portainer.crt \
  --tlskey /certs/server/portainer.key
```

This gets Portainer serving HTTPS on `:9443` with our cert, but it will still accept clients that do not present a certificate. The next step puts an mTLS-enforcing proxy in front of it.

## Step 3: Enforce mTLS with an nginx Reverse Proxy

Create an nginx config that requires a valid client certificate before proxying upstream to Portainer:

```nginx
# /etc/nginx/conf.d/portainer-mtls.conf
server {
    listen 443 ssl;
    server_name portainer.example.com;

    ssl_certificate     /opt/portainer-ca/server/portainer.crt;
    ssl_certificate_key /opt/portainer-ca/server/portainer.key;

    # Enforce mTLS: clients must present a cert signed by this CA
    ssl_client_certificate /opt/portainer-ca/ca/ca.crt;
    ssl_verify_client on;
    ssl_verify_depth 2;

    ssl_protocols TLSv1.2 TLSv1.3;

    location / {
        proxy_pass            https://127.0.0.1:9443;
        proxy_ssl_server_name on;
        proxy_ssl_name        portainer.example.com;
        proxy_set_header      Host              $host;
        proxy_set_header      X-Real-IP         $remote_addr;
        proxy_set_header      X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header      X-Forwarded-Proto $scheme;

        # WebSocket support for the Portainer UI console
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        "upgrade";
    }
}
```

Reload nginx after writing the config:

```bash
nginx -t && nginx -s reload
```

## Step 4: Configure the Portainer Agent with mTLS

Portainer Agent uses `--mtlscert`, `--mtlskey`, and `--mtlscacert` for mTLS to the Portainer Server (the older `--sslcert`, `--sslkey`, `--sslcacert` flags are marked deprecated in the agent source):

```bash
# Portainer Agent with mTLS configuration
docker run -d \
  -p 9001:9001 \
  --name portainer_agent \
  --restart=always \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v /var/lib/docker/volumes:/var/lib/docker/volumes \
  -v /opt/portainer-ca:/certs:ro \
  portainer/agent:latest \
  --mtlscert /certs/client/client.crt \
  --mtlskey /certs/client/client.key \
  --mtlscacert /certs/ca/ca.crt
```

## Step 5: Use Client Certificate for API Access

Send API requests through the nginx proxy with your client certificate:

```bash
# API call with client certificate authentication
curl -X GET \
  https://portainer.example.com/api/status \
  --cert /opt/portainer-ca/client/client.crt \
  --key /opt/portainer-ca/client/client.key \
  --cacert /opt/portainer-ca/ca/ca.crt

echo "mTLS connection successful"
```

## Verify mTLS is Working

```bash
# Try connecting without a client certificate (should fail)
curl -k https://portainer.example.com/api/status
# Expected: 400 No required SSL certificate was sent

# Connect with client certificate (should succeed)
curl https://portainer.example.com/api/status \
  --cert /opt/portainer-ca/client/client.crt \
  --key /opt/portainer-ca/client/client.key \
  --cacert /opt/portainer-ca/ca/ca.crt
```

---

*Combine mTLS with [OneUptime](https://oneuptime.com) monitoring for a comprehensive security and observability posture.*
