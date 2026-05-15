# How to Install and Configure Traefik as a Reverse Proxy on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Traefik, Proxy, Reverse Proxy, Linux

Description: Learn how to install and Configure Traefik as a Reverse Proxy on RHEL with step-by-step instructions, configuration examples, and best practices.

---

This guide covers how to Install and Configure Traefik as a Reverse Proxy on RHEL. Following these steps will help you set up a reliable configuration on RHEL.

## Prerequisites

- RHEL with a minimal or standard installation
- Root or sudo access
- A stable network connection
- A backend application that Traefik can forward traffic to

## Overview

Install and Configure Traefik as a Reverse Proxy requires careful planning and execution. This guide walks through the complete process from installation to verification.

## Step 1: Prepare the System

Update your system to ensure all packages are current:

```bash
sudo dnf update -y
```

Install the required dependencies:

```bash
sudo dnf install -y curl tar gzip firewalld
```

## Step 2: Install Required Packages

Install Traefik from the official binary release for x86_64 systems:

```bash
TRAEFIK_VERSION="3.7.1"
curl -L "https://github.com/traefik/traefik/releases/download/v${TRAEFIK_VERSION}/traefik_v${TRAEFIK_VERSION}_linux_amd64.tar.gz" -o /tmp/traefik.tar.gz
curl -L "https://github.com/traefik/traefik/releases/download/v${TRAEFIK_VERSION}/traefik_v${TRAEFIK_VERSION}_checksums.txt" -o /tmp/traefik_checksums.txt
cd /tmp
grep "traefik_v${TRAEFIK_VERSION}_linux_amd64.tar.gz" traefik_checksums.txt | sha256sum -c -
tar -xzf traefik.tar.gz traefik
sudo install -m 0755 traefik /usr/local/bin/traefik
```

Verify the installation:

```bash
traefik version
```

## Step 3: Configure the Service

Create a dedicated user and directories for Traefik:

```bash
sudo useradd --system --no-create-home --shell /sbin/nologin traefik
sudo mkdir -p /etc/traefik/dynamic /var/lib/traefik
sudo touch /var/lib/traefik/acme.json
sudo chmod 600 /var/lib/traefik/acme.json
sudo chown -R traefik:traefik /etc/traefik /var/lib/traefik
```

Create the main static configuration file:

```bash
sudo vi /etc/traefik/traefik.yml
```

Add the following configuration:

```yaml
entryPoints:
  web:
    address: ":80"
  websecure:
    address: ":443"

providers:
  file:
    directory: /etc/traefik/dynamic
    watch: true

ping: {}

log:
  level: INFO
```

Create a dynamic routing configuration for your backend application:

```bash
sudo vi /etc/traefik/dynamic/app.yml
```

Add the following configuration and replace `example.com` and `http://127.0.0.1:8080` with your domain and backend service address:

```yaml
http:
  routers:
    app:
      entryPoints:
        - web
      rule: "Host(`example.com`)"
      service: app

  services:
    app:
      loadBalancer:
        servers:
          - url: "http://127.0.0.1:8080"
```

Create a systemd unit:

```bash
sudo vi /etc/systemd/system/traefik.service
```

Add the following service definition:

```ini
[Unit]
Description=Traefik Reverse Proxy
Documentation=https://doc.traefik.io/traefik/
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=traefik
Group=traefik
ExecStart=/usr/local/bin/traefik --configFile=/etc/traefik/traefik.yml
Restart=on-failure
RestartSec=5s
AmbientCapabilities=CAP_NET_BIND_SERVICE
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
```

Reload systemd after creating the unit:

```bash
sudo systemctl daemon-reload
```

## Step 4: Start and Enable the Service

```bash
sudo systemctl enable --now traefik
sudo systemctl status traefik
```

## Step 5: Verify the Configuration

Test the setup:

```bash
traefik healthcheck
curl -H "Host: example.com" http://127.0.0.1/
```

Check the logs for any errors:

```bash
journalctl -u traefik -f
```

## Step 6: Configure Firewall Rules

If Traefik needs network access:

```bash
sudo systemctl enable --now firewalld
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

## Step 7: Performance Tuning

Monitor resource usage and adjust configuration parameters based on your workload:

```bash
systemctl show traefik --property=MemoryCurrent
top -p $(pidof traefik)
```

## Security Considerations

- Run the service with a dedicated non-root user when possible
- Enable TLS/SSL for network communication
- Restrict access with firewall rules
- Keep packages updated with `dnf update`

## Troubleshooting

Common issues and solutions:

1. **Service fails to start**: Check `journalctl -u traefik -xe` for error messages
2. **Permission denied**: Verify file ownership and SELinux contexts with `ls -laZ`
3. **Port conflicts**: Use `ss -tlnp` to identify processes using the port

## Conclusion

You have successfully configured Traefik as a reverse proxy on RHEL. Monitor the service regularly and keep it updated to maintain security and performance.
