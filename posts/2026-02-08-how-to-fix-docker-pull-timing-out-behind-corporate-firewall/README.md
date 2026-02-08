# How to Fix Docker Pull Timing Out Behind Corporate Firewall

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, pull, timeout, corporate firewall, proxy, registry, troubleshooting, networking

Description: Fix Docker pull timeouts behind corporate firewalls by configuring proxy settings, registry mirrors, and firewall exceptions for Docker traffic.

---

You run `docker pull nginx` and it just hangs. No progress bars, no error messages, just a frozen terminal. Or maybe you get a timeout error after waiting several minutes. Behind a corporate firewall, Docker pull operations frequently fail because the firewall blocks the traffic Docker needs to reach external registries. Unlike a browser that automatically routes through the company proxy, Docker needs explicit configuration to do the same.

Here is how to get Docker pulls working behind corporate firewalls and proxies.

## Understanding What Docker Pull Needs

When Docker pulls an image, it contacts several endpoints:

- `registry-1.docker.io` - Docker Hub registry
- `auth.docker.io` - Authentication service
- `production.cloudflare.docker.com` - CDN for image layers
- Various CDN endpoints for image blobs

All of these need to be reachable over HTTPS (port 443). If your corporate firewall blocks outbound HTTPS to unknown hosts, or requires traffic to go through a proxy, pulls will time out.

Test basic connectivity:

```bash
# Test if you can reach Docker Hub
curl -v https://registry-1.docker.io/v2/ 2>&1 | head -20

# Test with your corporate proxy
curl -v --proxy http://proxy.company.com:8080 https://registry-1.docker.io/v2/ 2>&1 | head -20

# Test DNS resolution
nslookup registry-1.docker.io
```

## Fix 1: Configure Docker Daemon Proxy Settings

The Docker daemon itself needs proxy configuration to pull images. This is separate from your shell's proxy environment variables.

Create or edit the Docker daemon's systemd environment file:

```bash
# Create the systemd drop-in directory for Docker
sudo mkdir -p /etc/systemd/system/docker.service.d
```

Create a proxy configuration file:

```bash
# Create the proxy configuration for Docker daemon
sudo nano /etc/systemd/system/docker.service.d/http-proxy.conf
```

```ini
# /etc/systemd/system/docker.service.d/http-proxy.conf
[Service]
Environment="HTTP_PROXY=http://proxy.company.com:8080"
Environment="HTTPS_PROXY=http://proxy.company.com:8080"
Environment="NO_PROXY=localhost,127.0.0.1,.company.com,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16"
```

Apply the changes:

```bash
# Reload systemd and restart Docker
sudo systemctl daemon-reload
sudo systemctl restart docker

# Verify the proxy settings took effect
sudo systemctl show docker --property Environment
```

Alternatively, configure the proxy in `/etc/docker/daemon.json`:

```json
{
    "proxies": {
        "http-proxy": "http://proxy.company.com:8080",
        "https-proxy": "http://proxy.company.com:8080",
        "no-proxy": "localhost,127.0.0.1,.company.com"
    }
}
```

## Fix 2: Configure Docker Client Proxy

The Docker client also needs proxy configuration for operations like `docker login` and `docker search`. This is configured per user:

```bash
# Create or edit the Docker client config
mkdir -p ~/.docker
nano ~/.docker/config.json
```

```json
{
    "proxies": {
        "default": {
            "httpProxy": "http://proxy.company.com:8080",
            "httpsProxy": "http://proxy.company.com:8080",
            "noProxy": "localhost,127.0.0.1,.company.com"
        }
    }
}
```

This configuration is also passed to containers as environment variables during `docker build` operations.

## Fix 3: Handle Corporate SSL/TLS Inspection

Many corporate firewalls perform SSL/TLS inspection (man-in-the-middle) using a custom CA certificate. Docker will reject these certificates unless you add the corporate CA to Docker's trust store.

Symptoms of SSL inspection interference:

```
Error response from daemon: Get https://registry-1.docker.io/v2/: x509: certificate signed by unknown authority
```

Get your corporate CA certificate (usually from IT) and install it:

```bash
# On Ubuntu/Debian, add the corporate CA certificate
sudo cp company-ca.crt /usr/local/share/ca-certificates/company-ca.crt
sudo update-ca-certificates

# Restart Docker to pick up the new certificates
sudo systemctl restart docker
```

On CentOS/RHEL:

```bash
# On CentOS/RHEL
sudo cp company-ca.crt /etc/pki/ca-trust/source/anchors/company-ca.crt
sudo update-ca-trust
sudo systemctl restart docker
```

If the certificate is in PEM format, you might need to convert it:

```bash
# Convert DER to PEM if needed
openssl x509 -inform DER -in company-ca.der -out company-ca.crt
```

## Fix 4: Use a Registry Mirror

If direct access to Docker Hub is not possible, set up or use a registry mirror (sometimes called a pull-through cache). Many organizations run an internal Artifactory, Nexus, or Harbor instance as a Docker registry mirror.

Configure Docker to use the mirror:

```json
{
    "registry-mirrors": ["https://docker-mirror.company.com"],
    "proxies": {
        "http-proxy": "http://proxy.company.com:8080",
        "https-proxy": "http://proxy.company.com:8080",
        "no-proxy": "localhost,127.0.0.1,.company.com,docker-mirror.company.com"
    }
}
```

Save this to `/etc/docker/daemon.json` and restart Docker.

Test that the mirror works:

```bash
# Pull through the mirror
docker pull nginx:latest

# Check which registry the image came from
docker inspect nginx:latest | grep -i registry
```

If your company does not have a registry mirror, you can set up a simple one:

```yaml
# docker-compose.yml for a basic registry mirror
services:
  registry-mirror:
    image: registry:2
    ports:
      - "5000:5000"
    environment:
      - REGISTRY_PROXY_REMOTEURL=https://registry-1.docker.io
      - HTTP_PROXY=http://proxy.company.com:8080
      - HTTPS_PROXY=http://proxy.company.com:8080
    volumes:
      - mirror-data:/var/lib/registry

volumes:
  mirror-data:
```

## Fix 5: Request Firewall Exceptions

Sometimes the cleanest solution is asking your IT team to whitelist the required endpoints. Provide them with this list:

```
# Required endpoints for Docker Hub access
registry-1.docker.io:443          # Docker Hub registry API
auth.docker.io:443                # Docker Hub authentication
production.cloudflare.docker.com:443  # Image layer CDN
docker.io:443                     # Docker Hub website
index.docker.io:443               # Docker Hub index

# For GitHub Container Registry (ghcr.io)
ghcr.io:443
*.pkg.github.com:443

# For Google Container Registry
gcr.io:443
*.gcr.io:443

# For Amazon ECR
*.dkr.ecr.*.amazonaws.com:443
```

## Fix 6: Proxy Authentication (NTLM/Kerberos)

Corporate proxies often require authentication. Docker supports basic proxy authentication:

```ini
# In the systemd override file
[Service]
Environment="HTTPS_PROXY=http://username:password@proxy.company.com:8080"
```

For NTLM authentication (common in Windows-based corporate environments), Docker cannot handle it natively. Use a local proxy like cntlm:

```bash
# Install cntlm (NTLM proxy relay)
sudo apt-get install cntlm

# Configure cntlm with your corporate credentials
sudo nano /etc/cntlm.conf
```

```ini
# /etc/cntlm.conf
Username    your-username
Domain      COMPANY
Proxy       proxy.company.com:8080
Listen      3128
```

```bash
# Generate the password hash
cntlm -H -d COMPANY -u your-username

# Start cntlm
sudo systemctl start cntlm
sudo systemctl enable cntlm
```

Then point Docker at the local cntlm proxy:

```ini
# Docker daemon proxy pointing to local cntlm
[Service]
Environment="HTTP_PROXY=http://localhost:3128"
Environment="HTTPS_PROXY=http://localhost:3128"
```

## Fix 7: Increase Timeout Settings

If the proxy works but transfers are slow, increase Docker's timeout:

```json
{
    "max-download-attempts": 5,
    "registry-mirrors": ["https://docker-mirror.company.com"]
}
```

For specific slow pulls, use the `--timeout` flag (available in some Docker versions) or pull individual layers:

```bash
# Pull with explicit platform to avoid pulling unnecessary architectures
docker pull --platform linux/amd64 nginx:latest
```

## Debugging Proxy Issues

When pulls still fail after configuration, debug step by step:

```bash
# 1. Verify Docker sees the proxy configuration
docker info | grep -i proxy

# 2. Test the proxy with curl
curl -x http://proxy.company.com:8080 https://registry-1.docker.io/v2/

# 3. Check Docker daemon logs for connection errors
sudo journalctl -u docker --since "5 minutes ago" | grep -i "proxy\|timeout\|connect"

# 4. Test with a small image to minimize transfer time
docker pull alpine:latest

# 5. Run Docker in debug mode for verbose logging
# Edit /etc/docker/daemon.json
{
    "debug": true
}
# Then restart and check logs
sudo systemctl restart docker
sudo journalctl -u docker -f
```

## Summary

Docker pull timeouts behind corporate firewalls come down to three things: proxy configuration, SSL certificate trust, and firewall rules. Configure the proxy at the Docker daemon level using either systemd drop-in files or `daemon.json`. If your firewall does SSL inspection, add the corporate CA certificate to the system trust store. For organizations with strict egress rules, use an internal registry mirror to avoid reaching out to the public internet at all. Always add your internal domains and private IP ranges to the `NO_PROXY` setting so internal traffic does not go through the proxy unnecessarily.
