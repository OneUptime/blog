# How to Configure HAProxy for Zero-Downtime Deployments on IPv4

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HAProxy, Zero Downtime, Deployment, IPv4, Drain, Rolling Update

Description: Use HAProxy server drain mode, graceful reloads, and rolling update techniques to deploy new application versions on IPv4 backends without dropping connections.

## Introduction

Zero-downtime deployments require removing servers from rotation gracefully-draining existing connections before stopping them-and adding new servers while maintaining traffic flow. HAProxy provides built-in mechanisms for all of these.

## Graceful Configuration Reload

HAProxy can reload configuration without dropping active connections:

```bash
# Validate new config before applying

sudo haproxy -c -f /etc/haproxy/haproxy.cfg
# Exit status 0 means the configuration parsed successfully; add -V if you want a success message printed

# Graceful reload: new process takes over, old process finishes existing connections
sudo systemctl reload haproxy

# Or using the init script directly
sudo service haproxy reload

# Verify new process started
sudo ss -tlnp | grep haproxy
ps aux | grep haproxy | grep -v grep
```

## Server Drain Mode

The following runtime API examples assume an admin-level `stats socket` is configured at `/run/haproxy/admin.sock`.

Drain removes a server from load balancing for new traffic while allowing existing connections to complete; persistent connections may still be reused:

```bash
# Step 1: Put server into drain mode (removes it from load balancing, keeps health checks running)
echo "set server app_servers/app1 state drain" | \
  sudo socat stdio unix-connect:/run/haproxy/admin.sock

# Step 2: Wait for current sessions to drain
watch -n2 "echo 'show stat' | sudo socat stdio unix-connect:/run/haproxy/admin.sock | awk -F, '\$1 == \"app_servers\" && \$2 == \"app1\" {print \"scur=\" \$5}'"
# Wait until scur reaches 0

# Step 3: Deploy new version on app1
ssh 192.168.1.10 "sudo /opt/app/deploy.sh"

# Step 4: Bring server back into rotation
echo "set server app_servers/app1 state ready" | \
  sudo socat stdio unix-connect:/run/haproxy/admin.sock
```

## Rolling Update Script

```bash
#!/bin/bash
# /usr/local/bin/rolling-deploy.sh

HAPROXY_SOCKET="unix-connect:/run/haproxy/admin.sock"
BACKEND="app_servers"
SERVERS=("app1:192.168.1.10" "app2:192.168.1.11" "app3:192.168.1.12")
DRAIN_TIMEOUT=60   # Seconds to wait for current sessions to drain

deploy_server() {
    local server_name="$1"
    local server_ip="$2"

    echo "Draining ${server_name}..."
    echo "set server ${BACKEND}/${server_name} state drain" | \
        socat stdio "${HAPROXY_SOCKET}"

    # Wait for current sessions to drain
    local elapsed=0
    local conn
    while true; do
        conn=$(echo "show stat" | \
               socat stdio "${HAPROXY_SOCKET}" | \
               awk -F, -v b="${BACKEND}" -v s="${server_name}" '$1 == b && $2 == s {print $5}')
        [ -z "${conn}" ] && { echo "Unable to read current sessions for ${server_name}."; return 1; }
        [ "${conn}" = "0" ] && break
        [ $elapsed -ge $DRAIN_TIMEOUT ] && { echo "Drain timeout!"; return 1; }
        sleep 5; elapsed=$((elapsed + 5))
        echo "  ${server_name}: ${conn} current sessions remaining..."
    done

    echo "Deploying to ${server_ip}..."
    ssh "${server_ip}" "sudo /opt/app/deploy.sh"

    echo "Bringing ${server_name} back online..."
    echo "set server ${BACKEND}/${server_name} state ready" | \
        socat stdio "${HAPROXY_SOCKET}"

    echo "${server_name} deployment complete."
    sleep 10  # Allow health checks to confirm server is healthy
}

# Deploy to each server one at a time
for server_entry in "${SERVERS[@]}"; do
    server_name="${server_entry%%:*}"
    server_ip="${server_entry##*:}"
    deploy_server "${server_name}" "${server_ip}" || exit 1
done

echo "Rolling deployment complete!"
```

## Dynamic Server Addition

Add new servers without a config reload using the runtime API. This works on backends that use a dynamic load-balancing algorithm such as `roundrobin`, `leastconn`, `first`, or `random`, and runtime-added servers are not persisted across reloads:

```bash
# Add a new backend server at runtime and define its health-check port
echo "add server app_servers/app4 192.168.1.14:8080 check port 8080" | \
  sudo socat stdio unix-connect:/run/haproxy/admin.sock

# Take the new server out of maintenance mode
echo "enable server app_servers/app4" | \
  sudo socat stdio unix-connect:/run/haproxy/admin.sock

# Enable active health checks
echo "enable health app_servers/app4" | \
  sudo socat stdio unix-connect:/run/haproxy/admin.sock
```

## Blue-Green Deployment with Weights

Shift new load-balanced traffic from blue to green by adjusting weights:

```haproxy
backend app_servers
    server blue1 192.168.1.10:8080 check weight 100   # Blue: start at 100%
    server blue2 192.168.1.11:8080 check weight 100
    server green1 192.168.1.20:8080 check weight 0    # Green: start at 0%
    server green2 192.168.1.21:8080 check weight 0
```

```bash
# Gradually shift traffic to green
echo "set server app_servers/green1 weight 50" | sudo socat stdio unix-connect:/run/haproxy/admin.sock
echo "set server app_servers/green2 weight 50" | sudo socat stdio unix-connect:/run/haproxy/admin.sock

# After verification, shift new load-balanced traffic to green
for s in blue1 blue2; do
    echo "set server app_servers/$s weight 0" | sudo socat stdio unix-connect:/run/haproxy/admin.sock
done
for s in green1 green2; do
    echo "set server app_servers/$s weight 100" | sudo socat stdio unix-connect:/run/haproxy/admin.sock
done
```

## Conclusion

HAProxy zero-downtime deployments rely on three mechanisms: graceful reload (config changes), drain mode (single server updates), and runtime API commands (dynamic, in-memory changes without reloads). The rolling update script automates the drain-deploy-restore cycle. Blue-green deployments via weight adjustment allow fast, reversible shifts of new load-balanced traffic between deployment versions.
