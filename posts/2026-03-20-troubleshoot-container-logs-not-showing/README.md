# How to Troubleshoot Container Logs Not Showing in Portainer - Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Log, Troubleshooting, Debugging

Description: Fix issues where Docker container logs are empty or not displaying correctly in the Portainer log viewer.

---

Portainer provides powerful tools for container observability including real-time statistics, log streaming, and interactive console access from the browser.

## Container Stats in Portainer

Navigate to **Containers > [Container Name] > Stats** to view:
- Real-time CPU usage (%)
- Memory usage and limits
- Network I/O (bytes in/out)
- Disk I/O (read/write)

## Viewing Logs

```bash
# Access container logs via Docker CLI

docker logs my-container

# Follow logs in real time
docker logs -f my-container

# Show last 100 lines
docker logs --tail 100 my-container

# Show logs since a specific time
docker logs --since 2h my-container

# Show logs with timestamps
docker logs -t my-container

# Save logs to a file
docker logs my-container > /tmp/my-container.log 2>&1
```

## Container Console Access

```bash
# Open bash in a container
docker exec -it my-container bash

# If bash isn't available, try sh
docker exec -it my-container sh

# Run as a specific user
docker exec -it --user www-data my-container bash
docker exec -it --user 1000 my-container sh

# Run as root even if container user is non-root
docker exec -it --user root my-container bash
```

## View Running Processes

```bash
# View processes running inside a container
docker top my-container

# With custom ps format
docker top my-container aux
```

## Fix Nginx Reverse Proxy Log Buffering

```nginx
# Add this in the http context so $connection_upgrade is available
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

# Disable proxy buffering for Portainer log streaming
location / {
    proxy_pass https://localhost:9443;
    proxy_buffering off;           # Critical for log streaming
    proxy_cache off;
    proxy_ignore_headers X-Accel-Buffering;  # Prevent upstream headers from changing buffering
    
    # WebSocket support for console
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}
```

## Fix WebSocket Console Errors

```nginx
# Add this in the http context so $connection_upgrade is available
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

# Ensure WebSocket headers are forwarded for console access
location / {
    proxy_pass https://localhost:9443;
    proxy_ssl_verify off;
    
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    
    # Increase timeout for long console sessions
    proxy_read_timeout 3600;
}
```

---

*Monitor container health metrics and log anomalies with [OneUptime](https://oneuptime.com).*
