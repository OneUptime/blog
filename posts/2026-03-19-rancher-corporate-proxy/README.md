# How to Install Rancher Behind a Corporate Proxy

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Proxy, Docker, Kubernetes, Installation

Description: A detailed guide to installing and configuring Rancher behind a corporate HTTP/HTTPS proxy, including Docker proxy setup and Rancher proxy configuration.

Many enterprise environments route all internet traffic through a corporate proxy server. Installing Rancher in such environments requires additional configuration to ensure that Docker, Rancher, and the Kubernetes components it manages can all communicate through the proxy. This guide covers every step needed to deploy Rancher behind a corporate proxy.

## Prerequisites

Before you begin, ensure you have:

- A Linux server that meets Rancher's current installation requirements
- Root or sudo access
- Docker installed (see our OS-specific Rancher installation guides)
- Your corporate proxy address and port (e.g., `http://proxy.corp.example.com:3128`)
- Proxy credentials if authentication is required
- A list of internal domains and IP ranges that should bypass the proxy

## Step 1: Configure System-Wide Proxy Settings

Set up proxy environment variables for the system:

```bash
sudo tee /etc/environment <<EOF
http_proxy=http://proxy.corp.example.com:3128
https_proxy=http://proxy.corp.example.com:3128
no_proxy=localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.corp.example.com,.svc,.cluster.local
HTTP_PROXY=http://proxy.corp.example.com:3128
HTTPS_PROXY=http://proxy.corp.example.com:3128
NO_PROXY=localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.corp.example.com,.svc,.cluster.local
EOF
```

If your proxy requires authentication:

```bash
sudo tee /etc/environment <<EOF
http_proxy=http://username:password@proxy.corp.example.com:3128
https_proxy=http://username:password@proxy.corp.example.com:3128
no_proxy=localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.corp.example.com
HTTP_PROXY=http://username:password@proxy.corp.example.com:3128
HTTPS_PROXY=http://username:password@proxy.corp.example.com:3128
NO_PROXY=localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.corp.example.com
EOF
```

Log out and back in, or start a new shell session, so applications pick up the updated environment variables.

## Step 2: Configure Docker to Use the Proxy

Docker requires its own proxy configuration through systemd:

```bash
sudo mkdir -p /etc/systemd/system/docker.service.d

sudo tee /etc/systemd/system/docker.service.d/http-proxy.conf <<EOF
[Service]
Environment="HTTP_PROXY=http://proxy.corp.example.com:3128"
Environment="HTTPS_PROXY=http://proxy.corp.example.com:3128"
Environment="NO_PROXY=localhost,127.0.0.1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.corp.example.com"
EOF
```

Reload systemd and restart Docker:

```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

Verify Docker can pull images through the proxy:

```bash
docker pull hello-world
docker run hello-world
```

## Step 3: Import Corporate CA Certificates

Many corporate proxies perform TLS inspection, which requires importing the corporate CA certificate. Without this, Docker and Rancher will fail to verify SSL certificates.

Copy your corporate CA certificate to the system trust store:

```bash
# For Ubuntu/Debian

sudo cp corporate-ca.crt /usr/local/share/ca-certificates/corporate-ca.crt
sudo update-ca-certificates

# For RHEL/CentOS/Rocky/AlmaLinux
sudo cp corporate-ca.crt /etc/pki/ca-trust/source/anchors/corporate-ca.crt
sudo update-ca-trust

# For openSUSE/SLES
sudo cp corporate-ca.crt /etc/pki/trust/anchors/corporate-ca.crt
sudo update-ca-certificates
```

On Linux, Docker uses the host system's CA trust store. After updating the trust store, restart Docker:

```bash
sudo systemctl restart docker
```

## Step 4: Create Persistent Storage

```bash
sudo mkdir -p /opt/rancher
```

## Step 5: Run Rancher with Proxy Settings

Deploy Rancher with the proxy environment variables passed to the container:

```bash
docker run -d \
  --name rancher \
  --restart=unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -v /opt/rancher:/var/lib/rancher \
  --privileged \
  -e HTTP_PROXY=http://proxy.corp.example.com:3128 \
  -e HTTPS_PROXY=http://proxy.corp.example.com:3128 \
  -e NO_PROXY="localhost,127.0.0.1,0.0.0.0,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local,cattle-system.svc" \
  -e http_proxy=http://proxy.corp.example.com:3128 \
  -e https_proxy=http://proxy.corp.example.com:3128 \
  -e no_proxy="localhost,127.0.0.1,0.0.0.0,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local,cattle-system.svc" \
  rancher/rancher:latest
```

The `NO_PROXY` setting is critical. It must include:

- `localhost` and `127.0.0.1` for local communication
- Your internal network ranges (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- Kubernetes service domains (`.svc`, `.cluster.local`)
- The Rancher namespace DNS suffix (`cattle-system.svc`)
- Any internal domains your clusters need to reach

## Step 6: Mount Corporate CA into the Rancher Container

If your proxy performs TLS inspection, recreate the Rancher container with a mounted CA certificate directory and `SSL_CERT_DIR` so Rancher can trust outbound TLS connections:

```bash
docker rm -f rancher

docker run -d \
  --name rancher \
  --restart=unless-stopped \
  -p 80:80 \
  -p 443:443 \
  -v /opt/rancher:/var/lib/rancher \
  -v /path/to/corporate-ca-directory:/container/certs:ro \
  --privileged \
  -e HTTP_PROXY=http://proxy.corp.example.com:3128 \
  -e HTTPS_PROXY=http://proxy.corp.example.com:3128 \
  -e NO_PROXY="localhost,127.0.0.1,0.0.0.0,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,cattle-system.svc,.svc,.cluster.local" \
  -e SSL_CERT_DIR=/container/certs \
  rancher/rancher:latest
```

## Step 7: Get the Bootstrap Password

```bash
docker logs rancher 2>&1 | grep "Bootstrap Password:"
```

## Step 8: Access the Rancher UI

Navigate to `https://<your-server-ip>` and complete the initial setup.

## Step 9: Configure Downstream Clusters for Proxy

When creating downstream Kubernetes clusters from Rancher behind a proxy, you need to configure proxy settings for the cluster nodes as well. In the Rancher UI, when creating a custom cluster:

1. Go to Cluster Management and click Create
2. Under Advanced Options, add the following Agent Environment Variables:

```plaintext
HTTP_PROXY=http://proxy.corp.example.com:3128
HTTPS_PROXY=http://proxy.corp.example.com:3128
NO_PROXY=localhost,127.0.0.1,0.0.0.0,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,.svc,.cluster.local
```

For private nodes, set the same proxy environment variables on the nodes themselves in addition to configuring them in the Rancher UI.

## Configuring Helm-Based Installation Behind a Proxy

If you are installing Rancher using Helm on a Kubernetes cluster behind a proxy, pass the proxy settings as Helm values:

```bash
helm upgrade --install rancher rancher-stable/rancher \
  --namespace cattle-system \
  --create-namespace \
  --set hostname=rancher.corp.example.com \
  --set bootstrapPassword=yourSecurePassword \
  --set proxy="http://proxy.corp.example.com:3128" \
  --set noProxy="127.0.0.0/8\,10.0.0.0/8\,cattle-system.svc\,172.16.0.0/12\,192.168.0.0/16\,.svc\,.cluster.local"
```

If your proxy performs TLS inspection, add `--set additionalTrustedCAs=true` to the Helm command and create the additional CA secret after the deployment is created:

```bash
kubectl -n cattle-system create secret generic tls-ca-additional \
  --from-file=ca-additional.pem=./ca-additional.pem
```

## Troubleshooting

Common proxy-related issues:

```bash
# Test proxy connectivity
curl -x http://proxy.corp.example.com:3128 https://hub.docker.com

# Check Docker proxy config
sudo systemctl show docker --property Environment

# Check Rancher container env vars
docker inspect rancher | grep -A 20 "Env"

# Check for certificate errors
docker logs rancher 2>&1 | grep -i "certificate\|tls\|x509"

# Verify no_proxy settings
docker exec rancher env | grep -i proxy
```

If you see x509 certificate errors, the corporate CA certificate is likely not properly installed or mounted.

## Conclusion

You have successfully installed Rancher behind a corporate proxy. The key to a successful proxy deployment is ensuring that proxy settings are configured at every layer: the host operating system, Docker daemon, the Rancher container, and any downstream clusters. Pay special attention to the NO_PROXY settings to avoid routing internal Kubernetes traffic through the proxy, which would break cluster communication.
