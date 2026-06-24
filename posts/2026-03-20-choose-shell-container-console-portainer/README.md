# How to Choose the Right Shell for Container Console in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Shell, Console, Bash

Description: Select the appropriate shell (bash, sh, or custom) for container console access in Portainer based on the container's available shells.

---

Portainer provides powerful tools for container observability including real-time statistics, live log access, and interactive console access from the browser.

## Container Stats in Portainer

Navigate to **Containers > [Container Name] > Stats** to view:
- Real-time CPU usage (%)
- Memory usage and limits
- Network I/O (bytes in/out)
- I/O usage (read/write)

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

Portainer's Console feature requires the container image to include a shell. In Portainer, choose the shell the image actually provides: `/bin/bash`, `/bin/sh`, `/bin/ash` for Alpine-based images, or use a custom command when needed.

```bash
# Open bash in a container
docker exec -it my-container bash

# If bash isn't available, try sh
docker exec -it my-container sh

# Alpine-based containers typically use ash
docker exec -it my-container /bin/ash

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
# Disable proxy buffering for Portainer live log output
location / {
    proxy_pass https://localhost:9443;
    proxy_buffering off;           # Prevent response buffering for live output
    proxy_cache off;
    
    # WebSocket support for console
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    
    proxy_read_timeout 3600;
    proxy_send_timeout 3600;
}
```

## Fix WebSocket Console Errors

```nginx
# Ensure WebSocket headers are forwarded for console access
location / {
    proxy_pass https://localhost:9443;
    proxy_ssl_verify off;
    
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    
    # Increase timeout for long console sessions
    proxy_read_timeout 3600;
}
```

---

*Monitor container health metrics and log anomalies with [OneUptime](https://oneuptime.com).*
