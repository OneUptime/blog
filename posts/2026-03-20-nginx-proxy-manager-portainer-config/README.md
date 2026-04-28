# How to Configure Nginx Proxy Manager to Forward Traffic to Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx Proxy Manager, Reverse Proxy, SSL, Docker

Description: Learn step-by-step how to configure Nginx Proxy Manager to proxy requests to Portainer, including WebSocket support, SSL termination, and authentication headers.

## Prerequisites

- Nginx Proxy Manager (NPM) running and accessible at port 81
- Portainer running on the same Docker network as NPM
- A domain name pointing to your server

## Step 1: Ensure Both Services Share a Network

NPM must be able to reach Portainer by container name:

```yaml
# docker-compose.yml

services:
  npm:
    image: jc21/nginx-proxy-manager:latest
    networks:
      - proxy

  portainer:
    image: portainer/portainer-ce:latest
    networks:
      - proxy    # Same network as NPM
    # Do NOT publish port 9000 externally - let NPM handle routing

networks:
  proxy:
    name: proxy
```

## Step 2: Add a Proxy Host for Portainer

Log into NPM at `http://server:81` and go to **Hosts → Proxy Hosts → Add Proxy Host**.

### Details Tab

```text
Domain Names:         portainer.yourdomain.com
Scheme:               http
Forward Hostname/IP:  portainer      (container name)
Forward Port:         9000
Cache Assets:         Disabled
Block Common Exploits: Enabled
Websockets Support:   Enabled       (required for Portainer console)
```

### SSL Tab

```text
SSL Certificate:      Request new SSL Certificate
Force SSL:            Enabled
HTTP/2 Support:       Enabled
Email Address:        your@email.com
I Agree checkbox:     Checked
```

Click **Save**. NPM automatically requests a Let's Encrypt certificate.

## Step 3: Verify the Configuration

```bash
# Test HTTPS access
curl -I https://portainer.yourdomain.com
# Expected: HTTP/2 200

# Test WebSocket (needed for Portainer terminal)
# Open Portainer → Containers → any container → Console
# If console works, WebSocket is configured correctly

# Check certificate
curl -vI https://portainer.yourdomain.com 2>&1 | grep -i "issuer\|expire"
```

## Step 4: Advanced Custom Location (Optional)

If you need to add custom Nginx directives:

```nginx
# Custom Nginx Configuration in NPM Advanced tab
# Increase timeouts for long-running Portainer operations
proxy_read_timeout 600;
proxy_connect_timeout 600;
proxy_send_timeout 600;

# Pass real client IP to Portainer
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
```

## Step 5: Configure Access Lists for Security

Restrict Portainer access by IP:

1. Go to **Access Lists → Add Access List**
2. Name: "Office Only"
3. Under **Allow**, add: `203.0.113.0/24` (your office IP range)
4. Under **Deny**: `0.0.0.0/0` (block everything else)
5. Apply to the Portainer proxy host under **Access List**

## Portainer-Specific Settings

| Setting | Value | Reason |
|---------|-------|--------|
| WebSockets Support | ON | Container terminal and events |
| Forward Port | 9000 | Portainer HTTP port |
| Scheme | http | NPM handles SSL termination |
| Cache Assets | OFF | Portainer is a web app, caching causes issues |

## Using Portainer HTTPS Backend

If you point NPM at Portainer's built-in HTTPS interface (enabled by default on port 9443 in Portainer CE 2.9+, with a self-signed certificate):

```text
Scheme:               https
Forward Port:         9443
SSL Certificate:      (same process)
```

Add in NPM Advanced tab:

```nginx
proxy_ssl_verify off;  # Self-signed cert on backend
```

## Conclusion

Configuring NPM to proxy Portainer is straightforward once both services are on the same Docker network. The most critical settings are WebSocket support (for Portainer's terminal feature) and the correct container name for the forward hostname. NPM then handles SSL certificate issuance, renewal, and HTTP to HTTPS redirection automatically.
