# How to Set Up Traefik with Automatic Let's Encrypt TLS on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Traefik, Let's Encrypt, TLS, Reverse Proxy

Description: Learn how to install Traefik on RHEL and configure it with automatic TLS certificate provisioning from Let's Encrypt.

---

Traefik is a modern reverse proxy and load balancer that natively supports automatic TLS certificate management through Let's Encrypt. It can request and renew certificates without manual intervention.

## Installing Traefik

```bash
# Download the Traefik binary
curl -L https://github.com/traefik/traefik/releases/download/v3.0.0/traefik_v3.0.0_linux_amd64.tar.gz \
  -o /tmp/traefik.tar.gz
tar xzf /tmp/traefik.tar.gz -C /tmp/
sudo mv /tmp/traefik /usr/local/bin/
sudo chmod +x /usr/local/bin/traefik

# Verify installation
traefik version
```

## Static Configuration

```yaml
# Save as /etc/traefik/traefik.yaml
entryPoints:
  web:
    address: ":80"
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
  websecure:
    address: ":443"

certificatesResolvers:
  letsencrypt:
    acme:
      email: admin@example.com
      storage: /var/lib/traefik/acme.json
      httpChallenge:
        entryPoint: web

providers:
  file:
    directory: /etc/traefik/conf.d/
    watch: true

api:
  dashboard: true
  insecure: false
```

## Dynamic Configuration for a Service

```yaml
# Save as /etc/traefik/conf.d/myapp.yaml
http:
  routers:
    myapp:
      rule: "Host(`myapp.example.com`)"
      entryPoints:
        - websecure
      tls:
        certResolver: letsencrypt
      service: myapp

  services:
    myapp:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:3000"
```

## Running as a systemd Service

```bash
# Create required directories
sudo mkdir -p /etc/traefik/conf.d /var/lib/traefik
sudo useradd -r -s /sbin/nologin traefik
sudo chown traefik:traefik /var/lib/traefik

# Create the systemd unit
cat << 'SERVICE' | sudo tee /etc/systemd/system/traefik.service
[Unit]
Description=Traefik Proxy
After=network.target

[Service]
User=traefik
ExecStart=/usr/local/bin/traefik --configFile=/etc/traefik/traefik.yaml
Restart=always
AmbientCapabilities=CAP_NET_BIND_SERVICE

[Install]
WantedBy=multi-user.target
SERVICE

sudo systemctl daemon-reload
sudo systemctl enable --now traefik
```

## Firewall Configuration

```bash
# Open HTTP and HTTPS ports
sudo firewall-cmd --add-service=http --permanent
sudo firewall-cmd --add-service=https --permanent
sudo firewall-cmd --reload
```

Traefik will automatically request a certificate from Let's Encrypt when the first HTTPS request arrives for a configured domain. Certificates are stored in `acme.json` and renewed automatically before expiration.
