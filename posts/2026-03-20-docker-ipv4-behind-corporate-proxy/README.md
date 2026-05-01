# How to Set Up Docker IPv4 Networking Behind a Corporate Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Docker, Networking, IPv4, Proxy, Corporate, Configuration

Description: Configure Docker daemon and containers to use a corporate HTTP/HTTPS proxy for IPv4 traffic, set no-proxy exceptions for internal networks, and ensure containers can pull images and reach the...

## Introduction

On Linux hosts where Docker runs as a systemd service, Docker needs to be configured at two levels behind a corporate proxy: the Docker daemon (for pulling images) and individual containers (for runtime HTTP requests). Missing either level causes image pull failures or application connectivity issues. If the proxy inspects HTTPS traffic, install the proxy's CA certificate on the Docker host and in any containers that need HTTPS access.

## Step 1: Configure the Docker Daemon Proxy

Create a systemd override for the Docker service:

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d

sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf << 'EOF'
[Service]
Environment="HTTP_PROXY=http://proxy.corp.example.com:3128"
Environment="HTTPS_PROXY=http://proxy.corp.example.com:3128"
Environment="NO_PROXY=localhost,127.0.0.1,10.0.0.0/8,192.168.0.0/16,.corp.example.com"
EOF

sudo systemctl daemon-reload
sudo systemctl restart docker
```

## Verifying the Daemon Proxy

```bash
# Check that the systemd override was loaded by the Docker service

sudo systemctl show --property=Environment docker

# Test image pull
docker pull hello-world
```

## Step 2: Configure Proxy for Container Runtime

Set proxy configuration in `~/.docker/config.json`:

```json
{
  "proxies": {
    "default": {
      "httpProxy": "http://proxy.corp.example.com:3128",
      "httpsProxy": "http://proxy.corp.example.com:3128",
      "noProxy": "localhost,127.0.0.1,10.0.0.0/8,.corp.example.com"
    }
  }
}
```

After saving the file, Docker injects these as environment variables into new containers automatically; existing containers are unaffected.

## Step 3: Verify Proxy in a Running Container

```bash
# Check that proxy env vars are injected
docker run --rm alpine env | grep -i proxy

# Test outbound HTTP through the proxy
docker run --rm alpine wget -qO- https://httpbin.org/ip
```

## Setting Proxy Credentials

If the proxy requires authentication:

```json
{
  "proxies": {
    "default": {
      "httpProxy": "http://username:password@proxy.corp.example.com:3128",
      "httpsProxy": "http://username:password@proxy.corp.example.com:3128",
      "noProxy": "localhost,127.0.0.1,10.0.0.0/8"
    }
  }
}
```

**Security note:** Do not put credentials in Dockerfiles, and remember that proxy environment variables are stored as plain text in container configuration and can be exposed by `docker inspect` or the Docker API.

## Proxy in Docker Compose

```yaml
services:
  app:
    image: my-app:latest
    environment:
      HTTP_PROXY: "http://proxy.corp.example.com:3128"
      HTTPS_PROXY: "http://proxy.corp.example.com:3128"
      NO_PROXY: "localhost,127.0.0.1,.corp.example.com,db"
```

## Bypassing Proxy for Internal Container Communication

The `NO_PROXY` variable is critical - applications inside containers that communicate with other containers or internal services by name or IP should bypass the proxy:

```text
NO_PROXY=localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local
```

## Conclusion

Configure the Docker daemon proxy through systemd environment variables (for image pulls) and `~/.docker/config.json` (for new containers at runtime). Set comprehensive `NO_PROXY` values to exclude local and internal networks so applications inside containers do not send internal requests through the corporate proxy. If the proxy inspects HTTPS traffic, install the corporate CA on the Docker host and in containers that need HTTPS egress.
