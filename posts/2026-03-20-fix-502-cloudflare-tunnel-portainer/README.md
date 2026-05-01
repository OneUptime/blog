# How to Resolve 502 Bad Gateway with Cloudflare Tunnel and Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cloudflare, Portainer, Docker, 502 Error, Tunnel, Networking, Troubleshooting

Description: Learn how to diagnose and fix 502 Bad Gateway errors when exposing Portainer through a Cloudflare Tunnel, including common misconfigurations and their solutions.

---

Cloudflare Tunnel provides a secure way to expose Portainer (and other services) to the internet without opening inbound firewall ports. However, a 502 Bad Gateway error typically indicates a misconfiguration between the Cloudflare connector and your Portainer instance. This guide walks through the most common causes and fixes.

---

## Understanding the 502 Error in This Context

When using Cloudflare Tunnel with Portainer:

```text
Browser → Cloudflare Edge → cloudflared (tunnel connector) → Portainer container
```

A 502 means cloudflared successfully connected to Cloudflare, but failed to reach Portainer locally. The problem is almost always in the last hop.

---

## Step 1: Verify Portainer is Running

```bash
# Check if Portainer container is running

docker ps | grep portainer

# Check Portainer logs
docker logs portainer

# Verify Portainer is listening on the correct port
docker inspect portainer | grep -i port
curl -k https://localhost:9443  # Default HTTPS
curl http://localhost:9000      # HTTP if you explicitly enabled it
```

---

## Step 2: Check Your Cloudflare Tunnel Configuration

The most common cause of 502 is a wrong service URL in the tunnel config.

### Correct tunnel config for Portainer (HTTPS on 9443):

```yaml
# ~/.cloudflared/config.yml
tunnel: your-tunnel-id
credentials-file: /root/.cloudflared/your-tunnel-id.json

ingress:
  - hostname: portainer.example.com
    service: https://localhost:9443
    originRequest:
      noTLSVerify: true  # Needed if Portainer is still using its default self-signed cert
  - service: http_status:404
```

### Correct tunnel config for Portainer (HTTP on 9000, if enabled):

```yaml
ingress:
  - hostname: portainer.example.com
    service: http://localhost:9000
  - service: http_status:404
```

---

## Step 3: TLS Verification - A Common Fix

Portainer uses a self-signed certificate on port 9443 by default. If you keep that default certificate, `cloudflared` will reject it unless you either trust the certificate with `caPool` or disable verification:

```yaml
# config.yml
ingress:
  - hostname: portainer.example.com
    service: https://localhost:9443
    originRequest:
      noTLSVerify: true   # <- Quick workaround for the default self-signed cert
```

Without `noTLSVerify: true` or a configured `caPool`, cloudflared can reject the self-signed cert and return 502.

---

## Step 4: Check Docker Network Configuration

If cloudflared and Portainer are in different Docker networks, they can't communicate:

```bash
# Check what network Portainer is on
docker inspect portainer | grep -i network

# If cloudflared is in a different network, connect them
docker network connect portainer_network cloudflared

# Or, if Portainer is published on the host, use host networking for cloudflared
docker run -d \
  --name cloudflared \
  --network host \
  -v ~/.cloudflared:/home/nonroot/.cloudflared \
  cloudflare/cloudflared:latest tunnel --no-autoupdate run your-tunnel-id
```

---

## Step 5: Fix the Service URL (Port Mismatch)

Portainer and related components use different ports depending on how you configured them:

| Installation | Port | Protocol |
|-------------|------|----------|
| Standard Docker | 9443 | HTTPS |
| HTTP enabled for legacy compatibility | 9000 | HTTP |
| Portainer Agent | 9001 | HTTPS |
| Docker Compose | Varies | Depends |

```bash
# Find Portainer's actual port
docker port portainer
# 8000/tcp -> 0.0.0.0:8000
# 9000/tcp -> 0.0.0.0:9000
# 9443/tcp -> 0.0.0.0:9443
```

---

## Step 6: Restart the Tunnel

After fixing the config, restart cloudflared:

```bash
# If running as a service
sudo systemctl restart cloudflared

# If running as Docker container
docker restart cloudflared

# Check cloudflared logs
docker logs cloudflared --tail 50
sudo journalctl -u cloudflared -n 50
```

---

## Step 7: Validate with curl

Test the connection directly from the cloudflared host:

```bash
# Test HTTPS connection with self-signed cert
curl -k -v https://localhost:9443

# Test HTTP
curl -v http://localhost:9000

# Expected: HTTP 200 or redirect to login
```

---

## Complete Working docker-compose.yml

```yaml
services:
  portainer:
    image: portainer/portainer-ce:latest
    ports:
      - "9443:9443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - portainer_data:/data
    restart: unless-stopped

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --config /etc/cloudflared/config.yml run YOUR-TUNNEL-ID
    volumes:
      - ./cloudflared:/etc/cloudflared
    depends_on:
      - portainer
    restart: unless-stopped

volumes:
  portainer_data:
```

```yaml
# cloudflared/config.yml
tunnel: YOUR-TUNNEL-ID
credentials-file: /etc/cloudflared/YOUR-TUNNEL-ID.json

ingress:
  - hostname: portainer.example.com
    service: https://portainer:9443
    originRequest:
      noTLSVerify: true
  - service: http_status:404
```

---

## Best Practices

1. **Only set `noTLSVerify: true`** if Portainer is using its default self-signed certificate
2. **Use service names** (e.g., `portainer:9443`) instead of `localhost` in Docker Compose setups
3. **Check logs first** - cloudflared logs show the exact rejection reason
4. **Use HTTP 9000 only if you enabled it** for legacy or internal-only setups
5. **Secure with Cloudflare Access** - add authentication in front of the tunnel for production

---

## Conclusion

502 errors with Cloudflare Tunnel + Portainer are almost always caused by TLS trust issues, a wrong port, or Docker network isolation. Fix the service URL, trust Portainer's certificate (or temporarily use `noTLSVerify: true` with the default self-signed cert), and restart cloudflared.

---

*Monitor your Portainer and container infrastructure with [OneUptime](https://oneuptime.com).*
