# How to Disable HTTP and Force HTTPS-Only in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, HTTPS, Security, SSL, TLS, Configuration

Description: Configure Portainer to serve only over HTTPS by disabling the default HTTP port 9000, enforcing encrypted connections for all users and API consumers.

## Introduction

By default, Portainer listens on both port 9000 (HTTP) and port 9443 (HTTPS). In production environments, you should disable HTTP entirely to prevent unencrypted access to the Portainer interface and API. This guide covers how to disable HTTP in Portainer and enforce HTTPS-only access.

## Prerequisites

- Portainer running on Docker or Kubernetes
- A valid TLS certificate (self-signed or from a Certificate Authority)
- Port 9443 accessible to users

## Option 1: Disable HTTP via --http-disabled Flag

The `--http-disabled` flag disables the HTTP listener completely. Portainer will only respond on port 9443.

```bash
docker run -d \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /path/to/your/certs:/certs:ro \
  --name portainer \
  --restart always \
  portainer/portainer-ce:latest \
  --http-disabled \
  --sslcert /certs/portainer.crt \
  --sslkey /certs/portainer.key
```

Without providing `--sslcert` and `--sslkey`, Portainer uses a self-signed certificate on port 9443.

## Option 2: Docker Compose with HTTP Disabled

```yaml
version: "3.8"

services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: always
    ports:
      - "9443:9443"
      # Port 9000 intentionally omitted
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
      - ./certs:/certs:ro
    command: >
      --http-disabled
      --sslcert /certs/portainer.crt
      --sslkey /certs/portainer.key

volumes:
  portainer_data:
```

## Option 3: Change the HTTP Port to Avoid Exposure

If you want to keep HTTP available internally but not expose it, bind it only to localhost:

```bash
docker run -d \
  -p 127.0.0.1:9000:9000 \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  --name portainer \
  portainer/portainer-ce:latest
```

This exposes HTTPS publicly while restricting HTTP to the local machine only.

## Using a Custom HTTPS Port

To run Portainer on a non-standard HTTPS port:

```bash
docker run -d \
  -p 443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  --name portainer \
  --restart always \
  portainer/portainer-ce:latest \
  --http-disabled
```

This maps container port 9443 to host port 443, so users access Portainer at `https://portainer.example.com` without a port number.

## Providing Your Own TLS Certificate

For production, use a trusted certificate:

```bash
# Mount your certificate files

docker run -d \
  -p 9443:9443 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  -v /etc/letsencrypt/live/portainer.example.com:/certs:ro \
  --name portainer \
  --restart always \
  portainer/portainer-ce:latest \
  --http-disabled \
  --sslcert /certs/fullchain.pem \
  --sslkey /certs/privkey.pem
```

## Kubernetes Deployment with HTTPS Only

For Kubernetes, the supported way to enforce HTTPS-only access is to deploy Portainer with Helm and set `tls.force=true`:

```bash
helm repo add portainer https://portainer.github.io/k8s/
helm repo update

helm upgrade --install --create-namespace -n portainer portainer portainer/portainer \
  --set service.type=LoadBalancer \
  --set tls.force=true \
  --set image.tag=lts
```

## Verify HTTPS-Only Access

After applying the configuration, verify that HTTP is rejected:

```bash
# HTTPS should work
curl -sk https://portainer.example.com:9443/api/status | python3 -m json.tool

# HTTP should fail
curl -v http://portainer.example.com:9000/api/status
# Expected: Connection refused
```

## HSTS Header Configuration

When running behind a reverse proxy, add HTTP Strict Transport Security (HSTS) headers in the proxy layer:

```nginx
# In your Nginx configuration
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

This instructs browsers to always use HTTPS for your domain.

## Troubleshooting

**Cannot access Portainer after disabling HTTP:**
- Verify the HTTPS port is exposed: `docker ps | grep portainer`
- Test connectivity: `curl -sk https://localhost:9443/api/status`
- Check if the certificate is valid: `openssl s_client -connect localhost:9443`

**Browser certificate warning:**
- Use a trusted CA certificate or add the self-signed certificate to your browser's trust store
- Consider using Let's Encrypt via a Traefik or Certbot integration

## Conclusion

Disabling HTTP in Portainer is a straightforward security hardening step for production deployments. The `--http-disabled` flag ensures all traffic is encrypted, protecting credentials and container management commands from interception. Combine this with a valid TLS certificate and HSTS headers at your reverse proxy layer for a fully hardened Portainer deployment.
