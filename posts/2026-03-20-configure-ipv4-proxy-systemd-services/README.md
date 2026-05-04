# How to Configure IPv4 Proxy Settings in systemd Services on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Systemd, Proxy, IPv4, Linux, Environment Variable, Service

Description: Configure proxy environment variables for systemd services on Linux to route IPv4 HTTP and HTTPS traffic through a corporate or internal proxy server.

## Introduction

Many applications respect `http_proxy`, `https_proxy`, and `no_proxy` environment variables for proxy configuration. In systemd services, these variables must be explicitly set in the service unit because services don't inherit the user's shell environment. This guide shows how to configure proxy settings for individual services and system-wide.

## Method 1: Set Proxy in the Service Unit File

```bash
# Override a specific service to use a proxy

sudo systemctl edit docker.service
```

This opens a drop-in override editor. Add:

```ini
[Service]
Environment="http_proxy=http://proxy.corp.example.com:3128"
Environment="https_proxy=http://proxy.corp.example.com:3128"
Environment="no_proxy=localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16"
```

Save and reload:

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker.service

# Verify the environment
sudo systemctl show docker | grep -i environment
```

## Method 2: Drop-in File Directly

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d/

sudo tee /etc/systemd/system/docker.service.d/proxy.conf << 'EOF'
[Service]
Environment="http_proxy=http://proxy.corp.example.com:3128"
Environment="https_proxy=http://proxy.corp.example.com:3128"
Environment="HTTP_PROXY=http://proxy.corp.example.com:3128"
Environment="HTTPS_PROXY=http://proxy.corp.example.com:3128"
Environment="no_proxy=localhost,127.0.0.1,.local,10.0.0.0/8"
Environment="NO_PROXY=localhost,127.0.0.1,.local,10.0.0.0/8"
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
```

## Method 3: Environment File

For multiple services sharing the same proxy settings:

```bash
# Create a shared proxy environment file
sudo tee /etc/proxy.env << 'EOF'
http_proxy=http://proxy.corp.example.com:3128
https_proxy=http://proxy.corp.example.com:3128
HTTP_PROXY=http://proxy.corp.example.com:3128
HTTPS_PROXY=http://proxy.corp.example.com:3128
no_proxy=localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16,.svc.cluster.local
NO_PROXY=localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16,.svc.cluster.local
EOF

# Reference from multiple service drop-ins
sudo mkdir -p /etc/systemd/system/my-app.service.d/

sudo tee /etc/systemd/system/my-app.service.d/proxy.conf << 'EOF'
[Service]
EnvironmentFile=/etc/proxy.env
EOF

sudo systemctl daemon-reload
sudo systemctl restart my-app
```

## Method 4: System-Wide Environment (All Services)

```bash
# /etc/environment is read by PAM for login sessions, not by all systemd services
# For system-wide systemd, use environment.d

sudo tee /etc/systemd/system.conf.d/proxy.conf << 'EOF'
[Manager]
DefaultEnvironment="http_proxy=http://proxy.corp.example.com:3128" \
                   "https_proxy=http://proxy.corp.example.com:3128" \
                   "no_proxy=localhost,127.0.0.1,10.0.0.0/8"
EOF

sudo systemctl daemon-reload
```

Note: This affects all system services. Use with caution.

## Proxy with Authentication

```bash
sudo tee /etc/systemd/system/my-app.service.d/proxy.conf << 'EOF'
[Service]
Environment="http_proxy=http://username:password@proxy.corp.example.com:3128"
Environment="https_proxy=http://username:password@proxy.corp.example.com:3128"
EOF
```

For sensitive credentials, use an environment file with restricted permissions:

```bash
sudo tee /etc/my-app/proxy-creds.env << 'EOF'
http_proxy=http://username:secretpassword@proxy.corp.example.com:3128
https_proxy=http://username:secretpassword@proxy.corp.example.com:3128
EOF

sudo chmod 600 /etc/my-app/proxy-creds.env
sudo chown root:root /etc/my-app/proxy-creds.env
```

## Verifying Proxy is Used

```bash
# Check the service process can reach the internet via proxy
sudo systemctl status my-app

# Test from inside the service's environment
sudo -u service-user env http_proxy=http://proxy.corp.example.com:3128 \
  https_proxy=http://proxy.corp.example.com:3128 \
  curl -I https://example.com

# Check journal for proxy-related messages
journalctl -u my-app | grep -i proxy
```

## Docker-Specific Proxy Configuration

Docker daemon also needs proxy for image pulls:

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d/
sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf << 'EOF'
[Service]
Environment="HTTP_PROXY=http://proxy.corp.example.com:3128"
Environment="HTTPS_PROXY=http://proxy.corp.example.com:3128"
Environment="NO_PROXY=localhost,127.0.0.1,docker.internal"
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## Conclusion

Set proxy environment variables in systemd services using `[Service] Environment=` directives or `EnvironmentFile=` for shared configs. Always include both lowercase and uppercase variants (`http_proxy` and `HTTP_PROXY`) as applications differ in which they check. Use `no_proxy` to exclude internal addresses. Store credentials in protected environment files with `chmod 600`.
