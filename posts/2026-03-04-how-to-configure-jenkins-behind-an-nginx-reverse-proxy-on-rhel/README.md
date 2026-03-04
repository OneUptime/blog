# How to Configure Jenkins Behind an Nginx Reverse Proxy on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, Jenkins, Nginx, Reverse Proxy, CI/CD

Description: Learn how to configure Jenkins behind an Nginx reverse proxy on RHEL with TLS termination and proper WebSocket support.

---

Running Jenkins behind an Nginx reverse proxy provides TLS termination, better security, and the ability to serve Jenkins on standard HTTPS port 443. This guide covers the complete setup.

## Prerequisites

Jenkins and Nginx must be installed:

```bash
# Install Nginx
sudo dnf install -y nginx

# Install Jenkins (add the Jenkins repo first)
sudo wget -O /etc/yum.repos.d/jenkins.repo \
  https://pkg.jenkins.io/redhat-stable/jenkins.repo
sudo rpm --import https://pkg.jenkins.io/redhat-stable/jenkins.io-2023.key
sudo dnf install -y jenkins java-17-openjdk

# Start Jenkins
sudo systemctl enable --now jenkins

# Jenkins runs on port 8080 by default
```

## Configuring Jenkins for Reverse Proxy

Edit the Jenkins configuration to listen only on localhost:

```bash
# Edit /etc/sysconfig/jenkins or use systemd override
sudo mkdir -p /etc/systemd/system/jenkins.service.d
cat << 'OVERRIDE' | sudo tee /etc/systemd/system/jenkins.service.d/override.conf
[Service]
Environment="JENKINS_LISTEN_ADDRESS=127.0.0.1"
Environment="JENKINS_PORT=8080"
OVERRIDE

sudo systemctl daemon-reload
sudo systemctl restart jenkins
```

## Configuring Nginx as Reverse Proxy

```nginx
# /etc/nginx/conf.d/jenkins.conf
upstream jenkins {
    keepalive 32;
    server 127.0.0.1:8080;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name jenkins.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name jenkins.example.com;

    # TLS certificates
    ssl_certificate /etc/nginx/ssl/jenkins.crt;
    ssl_certificate_key /etc/nginx/ssl/jenkins.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Increase maximum upload size for Jenkins artifacts
    client_max_body_size 100m;

    location / {
        proxy_pass http://jenkins;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Port $server_port;

        # Required for Jenkins CLI and WebSocket agents
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        # Timeouts
        proxy_connect_timeout 90;
        proxy_send_timeout 90;
        proxy_read_timeout 90;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # WebSocket support for Jenkins agents
    location /wsagents {
        proxy_pass http://jenkins;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Setting Up TLS Certificates

```bash
# Create self-signed certificates for testing
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/jenkins.key \
  -out /etc/nginx/ssl/jenkins.crt \
  -subj "/CN=jenkins.example.com"
```

## Starting and Testing

```bash
# Test Nginx configuration
sudo nginx -t

# Start Nginx
sudo systemctl enable --now nginx

# Open firewall ports
sudo firewall-cmd --add-service=http --permanent
sudo firewall-cmd --add-service=https --permanent
sudo firewall-cmd --reload
```

## Configuring Jenkins URL

After accessing Jenkins through the proxy, update the Jenkins URL:

1. Go to Manage Jenkins > System
2. Set Jenkins URL to `https://jenkins.example.com/`
3. Save the configuration

## Verifying the Setup

```bash
# Test the proxy
curl -I https://jenkins.example.com

# Check for the X-Jenkins header
curl -sI https://jenkins.example.com | grep X-Jenkins
```

The `proxy_request_buffering off` directive is important for large file uploads. The WebSocket configuration for `/wsagents` enables Jenkins inbound agents to connect through the proxy.
