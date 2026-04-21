# How to Configure SSL Certificates for Portainer with Nginx Proxy Manager

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx, SSL, HTTPS, Docker, Certificate

Description: Learn how to configure SSL/TLS certificates for Portainer using Nginx Proxy Manager, enabling secure HTTPS access to your Portainer dashboard.

## Introduction

Running Portainer over plain HTTP exposes your container management interface to risk. Nginx Proxy Manager provides an easy way to add SSL/TLS termination in front of Portainer, with support for Let's Encrypt automatic certificate management.

## Prerequisites

- Docker and Docker Compose installed
- A domain name pointing to your server
- Ports 80 and 443 accessible from the internet (80 for Let's Encrypt HTTP-01 validation and 443 for HTTPS traffic)

## Docker Compose Setup

Deploy both Portainer and Nginx Proxy Manager:

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    restart: unless-stopped
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    expose:
      - "9000"
    networks:
      - proxy

  nginx-proxy-manager:
    image: jc21/nginx-proxy-manager:latest
    container_name: nginx-proxy-manager
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
      - "81:81"
    volumes:
      - npm_data:/data
      - npm_letsencrypt:/etc/letsencrypt
    networks:
      - proxy

volumes:
  portainer_data:
  npm_data:
  npm_letsencrypt:

networks:
  proxy:
    driver: bridge
```

## Starting the Stack

```bash
docker compose up -d
```

## Configuring Nginx Proxy Manager

1. Access Nginx Proxy Manager at `http://your-server:81`
2. Log in with default credentials: `admin@example.com` / `changeme`
3. Change the password immediately

## Adding a Proxy Host for Portainer

1. Click **Hosts** > **Proxy Hosts** > **Add Proxy Host**
2. Fill in:
   - **Domain Names**: `portainer.yourdomain.com`
   - **Forward Hostname / IP**: `portainer`
   - **Forward Port**: `9000`
   - Enable **Block Common Exploits**
3. Click the **SSL** tab:
   - Select **Request a new SSL Certificate**
   - Enable **Force SSL**
   - Enable **HTTP/2 Support**
   - Enter your email for Let's Encrypt
4. Click **Save**

## Verifying HTTPS Access

After the certificate is issued, access Portainer at:

```text
https://portainer.yourdomain.com
```

## Using a Custom Certificate

If you have your own certificate, upload it in Nginx Proxy Manager under **SSL Certificates** > **Add SSL Certificate** > **Custom**, then reference it in your proxy host SSL settings.

## Renewing Certificates

Let's Encrypt certificates are automatically renewed by Nginx Proxy Manager before expiry. Check renewal status under **SSL Certificates** in the UI.

## Conclusion

Combining Portainer with Nginx Proxy Manager makes it straightforward to expose Portainer over HTTPS with automatic certificate management. This protects your container management dashboard without requiring manual certificate handling.
