# How to Troubleshoot 502 Bad Gateway Errors in Nginx with Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx, 502 Error, Troubleshooting, Docker, Reverse Proxy

Description: Learn how to diagnose and fix 502 Bad Gateway errors when using Nginx as a reverse proxy in front of Portainer, covering common causes and solutions.

## Introduction

A 502 Bad Gateway error from Nginx means the client reached Nginx, but Nginx could not get a valid response from the upstream backend (Portainer). This guide covers the most common causes and how to resolve them.

## Step 1: Check if Portainer is Running

```bash
docker ps | grep portainer
docker inspect portainer | grep '"Status"'
```

If Portainer is stopped or restarting:

```bash
docker logs portainer --tail=50
docker start portainer
```

## Step 2: Verify Portainer is Listening

Check the port Portainer is bound to:

```bash
docker port portainer
# or, for a host-published port

ss -tlnp | grep -E ':9000|:9443'
```

## Step 3: Test Direct Connectivity to Portainer

From the host, test the published port; from a container on the same Docker network, test the Docker hostname:

```bash
curl -vk https://localhost:9443
# or, if legacy HTTP port 9000 is enabled
curl -v http://localhost:9000
# or from a container on the same Docker network
curl -v http://portainer:9000
```

If the host-port test fails, the problem is with Portainer or the published port. If the Docker-network test fails, check Docker DNS and networking before changing Nginx.

## Step 4: Check Nginx Configuration

Review the proxy_pass directive:

```nginx
location / {
    proxy_pass http://portainer:9000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Common issues:
- Wrong port or protocol (Portainer exposes HTTPS UI/API on 9443 by default; port 9000 is the legacy HTTP port and may not be published on the host unless configured)
- Wrong hostname (must match a container/service name or network alias on the same user-defined Docker network)
- Missing trailing slash inconsistency

## Step 5: Check Network Connectivity

Ensure Nginx and Portainer are on the same Docker network:

```bash
docker network ls
docker network inspect proxy
docker inspect portainer | grep Networks -A10
docker inspect nginx | grep Networks -A10
```

If they're on different networks, connect the missing container to the proxy network:

```bash
docker network connect proxy portainer
# or
docker network connect proxy nginx
```

## Step 6: Review Nginx Error Logs

```bash
docker logs nginx --tail=100
# or
docker exec nginx cat /var/log/nginx/error.log | tail -50
```

Look for messages like:
- `connect() failed (111: Connection refused)`
- `no live upstreams while connecting to upstream`
- `upstream timed out`

## Step 7: Check WebSocket Support

Portainer uses WebSockets. Add WebSocket headers to Nginx:

```nginx
location / {
    proxy_pass http://portainer:9000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400s;
}
```

## Step 8: Restart Both Services

```bash
docker restart portainer nginx
```

## Conclusion

502 errors between Nginx and Portainer usually stem from network connectivity issues, wrong ports or protocols, or upstream response problems. Missing WebSocket headers can also break Portainer features after the page loads. Systematically checking each layer - from container health to network membership to Nginx configuration - quickly identifies the root cause.
