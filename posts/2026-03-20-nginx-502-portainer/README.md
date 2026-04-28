# How to Troubleshoot 502 Bad Gateway Errors with Nginx and Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Nginx, 502 Bad Gateway, Troubleshooting, Reverse Proxy

Description: Learn how to diagnose and fix 502 Bad Gateway errors when Nginx Proxy Manager or Nginx is used as a reverse proxy in front of Portainer.

## What Causes a 502 Bad Gateway?

A 502 error means Nginx received the request but couldn't forward it to Portainer. Common causes:

1. Portainer container not running
2. Wrong forward hostname or port
3. Network connectivity issue between Nginx and Portainer
4. Portainer not listening on the expected port
5. Nginx timeout on slow Portainer responses

## Diagnostic Checklist

```bash
# Step 1: Is Portainer running?

docker ps | grep portainer
# Expected: STATUS "Up X minutes"

# Step 2: What port is Portainer listening on?
docker inspect portainer | jq '.[].NetworkSettings.Ports'
# Expected: "9000/tcp": null (not published externally is OK if on same network)

# Step 3: Is NPM/Nginx on the same network as Portainer?
docker inspect portainer | jq '.[].NetworkSettings.Networks | keys'
docker inspect nginx-proxy-manager | jq '.[].NetworkSettings.Networks | keys'
# Both must share at least one network

# Step 4: Can Nginx reach Portainer?
docker exec nginx-proxy-manager curl -s http://portainer:9000
# Expected: some HTML response from Portainer

# Step 5: Check NPM error logs
docker logs nginx-proxy-manager 2>&1 | grep -i "error\|502\|connect"
```

## Fix 1: Connect Services to the Same Network

If Nginx can't resolve the Portainer container name:

```bash
# Create a shared network
docker network create proxy

# Connect both containers
docker network connect proxy portainer
docker network connect proxy nginx-proxy-manager
```

In `docker-compose.yml`:

```yaml
services:
  npm:
    networks:
      - proxy
  portainer:
    networks:
      - proxy

networks:
  proxy:
    name: proxy
```

## Fix 2: Correct the Forward Hostname

In NPM's proxy host settings:

```text
# Wrong - using IP that may change
Forward Hostname/IP: 172.17.0.3

# Correct - use container name (DNS resolved by Docker)
Forward Hostname/IP: portainer
```

## Fix 3: Correct the Port Number

Portainer uses different ports for different configurations:

| Setup | Port |
|-------|------|
| Default HTTP | 9000 |
| Default HTTPS (with TLS flags) | 9443 |
| Edge Agent | 8000 |

In NPM, set forward port to `9000` for standard installations.

## Fix 4: Increase Nginx Timeouts

Portainer can take time to respond during high load:

In NPM's proxy host **Advanced** tab:

```nginx
# Increase all timeouts
proxy_connect_timeout 300;
proxy_send_timeout 300;
proxy_read_timeout 300;
```

## Fix 5: Handle Portainer HTTPS Backend

If Portainer runs with HTTPS internally:

```text
In NPM Proxy Host:
  Scheme: https
  Forward Port: 9443

In NPM Advanced tab:
  proxy_ssl_verify off;
```

## Verifying the Fix

```bash
# Test direct connectivity from NPM container
docker exec nginx-proxy-manager curl -v http://portainer:9000

# Check the actual Nginx error log (per-proxy-host log; replace {id} with the host ID, or use the fallback log)
docker exec nginx-proxy-manager sh -c 'tail -20 /data/logs/proxy-host-*_error.log /data/logs/fallback_error.log'

# Test from outside
curl -I https://portainer.yourdomain.com
# Expected: HTTP/2 200
```

## Common Error Messages and Causes

| Error Log Message | Cause | Fix |
|------------------|-------|-----|
| `connect() failed (111: Connection refused)` | Wrong port or container stopped | Verify port, start container |
| `connect() failed (113: No route to host)` | Network not shared | Connect to same network |
| `host not found in upstream "portainer"` | DNS resolution failed | Same network, or use IP |
| `upstream timed out (110)` | Portainer slow to respond | Increase timeout values |

## Conclusion

Most 502 errors with Nginx and Portainer come down to network isolation or wrong port/hostname configuration. The fastest diagnostic is `docker exec nginx-proxy-manager curl http://portainer:9000` - if this succeeds, the issue is in NPM's proxy host configuration; if it fails, the containers aren't on the same network.
