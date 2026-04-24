# How to Troubleshoot Podman Socket Connection Issues in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Podman, Troubleshooting, Docker Socket, Debugging

Description: Diagnose and fix Podman socket connection failures in Portainer, covering socket permissions, service status, API compatibility issues, and rootless vs rootful configuration differences.

## Introduction

Connecting Portainer to a Podman socket can fail for several reasons: the socket service is not running, file permissions prevent access, the socket path is wrong, or SELinux is blocking access. This guide covers systematic troubleshooting steps for Portainer's legacy local Podman socket connection, which Portainer currently officially supports in rootful mode.

## Common Error Messages

- `Cannot connect to the Docker daemon at unix:///var/run/docker.sock`
- `error during connect: Get "http://...": dial unix /var/run/docker.sock: no such file`
- `permission denied while trying to connect to the Docker daemon socket`
- `Error response from daemon: client version ... is too new. Maximum supported API version is ...`

## Step 1: Verify the Podman Socket Service Status

```bash
# Check rootful socket status

sudo systemctl status podman.socket

# Check rootless socket status (run as the relevant user)
systemctl --user status podman.socket

# If the socket service is not running, enable and start it
sudo systemctl enable --now podman.socket         # rootful
systemctl --user enable --now podman.socket       # rootless

# Check if the socket file exists
ls -la /run/podman/podman.sock                    # rootful
ls -la /run/user/$(id -u)/podman/podman.sock      # rootless
```

## Step 2: Test the Podman API Directly

```bash
# Test rootful socket with Podman's documented Docker-compatible API
curl -s --unix-socket /run/podman/podman.sock \
  http://d/v1.40/version | jq .

# Test rootless socket (rootless Podman is not officially supported by Portainer)
curl -s --unix-socket /run/user/$(id -u)/podman/podman.sock \
  http://d/v1.40/version | jq .

# List containers to verify basic API functionality
curl -s --unix-socket /run/podman/podman.sock \
  http://d/v1.40/containers/json | jq '.[].Names'
```

## Step 3: Check Socket File Permissions

```bash
# Check the socket file ownership and permissions
ls -la /run/podman/podman.sock
# Example output:
# srw-rw---- 1 root root 0 Mar 20 10:00 /run/podman/podman.sock

# The user running the Portainer Server container must be able to access the socket
# Inspect the socket unit if you are using a custom override
sudo systemctl cat podman.socket

# Avoid changing ownership or mode on the live socket file directly:
# systemd recreates it when podman.socket restarts

# Verify Portainer container can access the socket
podman exec portainer ls -la /var/run/docker.sock
```

## Step 4: Verify Socket Mount in Portainer Container

Socket-based Podman connections are only supported when the Portainer Server itself is running on Podman locally, not when Portainer Server is running on Docker.

```bash
# Check how Portainer is mounted
podman inspect portainer | jq '.[0].Mounts'

# The output should show the Podman socket mapped to Docker socket path:
# {
#   "Source": "/run/podman/podman.sock",
#   "Destination": "/var/run/docker.sock",
#   "Mode": "rw"
# }

# If it's missing or wrong, recreate the container with correct mount:
podman stop portainer
podman rm portainer

podman run -d \
  -p 8000:8000 \
  -p 9443:9443 \
  --name portainer \
  --restart=always \
  --privileged \
  -v /run/podman/podman.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts
```

## Step 5: Resolve API Version Mismatches

```bash
# Check what API version Podman reports
curl -s --unix-socket /run/podman/podman.sock \
  http://d/v1.40/version | jq '.ApiVersion'

# Check Podman version
podman version

# Podman documents a Docker-compatible v1.40 API
# Portainer's current official Podman support is Podman 5 on CentOS Stream 9 in rootful mode
# Upgrade Podman if version is too old:
sudo dnf update podman    # RHEL/Fedora
sudo apt update && sudo apt upgrade podman  # Ubuntu/Debian

# Test the Docker-compatible endpoints:
# /v1.40/containers/json
# /v1.40/images/json
# /v1.40/info
for endpoint in containers/json images/json info; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    --unix-socket /run/podman/podman.sock "http://d/v1.40/$endpoint")
  echo "$endpoint: HTTP $STATUS"
done
```

## Step 6: Handle SELinux Blocking the Socket

```bash
# Check if SELinux is denying socket access
sudo ausearch -m AVC -ts recent | grep podman

# View SELinux denials in audit log
sudo grep "avc:  denied" /var/log/audit/audit.log | grep podman | tail -5

# If denials exist, apply a fix:

# Option A: Disable SELinux labeling for the Portainer container
podman run -d \
  --name portainer \
  --restart=always \
  --privileged \
  --security-opt label=disable \
  -p 8000:8000 \
  -p 9443:9443 \
  -v /run/podman/podman.sock:/var/run/docker.sock \
  -v portainer_data:/data \
  portainer/portainer-ce:lts

# Option B: Generate and install a custom policy
sudo ausearch -m AVC -ts recent | audit2allow -M portainer-podman
sudo semodule -i portainer-podman.pp
```

## Step 7: Debug Rootless Podman Lingering Issues

Portainer with rootless Podman may work, but it is not officially supported.

```bash
# For rootless Podman: ensure the user session persists
sudo loginctl enable-linger your-username

# Verify linger is enabled
loginctl show-user your-username | grep Linger

# Check if the systemd user session has the socket
sudo -iu your-username systemctl --user status podman.socket

# The DBUS_SESSION_BUS_ADDRESS must be set for user services
# Check environment in the context where Portainer runs
sudo -iu your-username systemctl --user show-environment | grep -E "XDG_RUNTIME_DIR|DBUS"
```

## Step 8: Check for Port or Firewall Blocking (Remote Podman)

```bash
# Socket connections are local-only.
# If you are using Podman over TCP, Podman recommends SSH forwarding or mutual TLS.
PORT=8080  # Example only; use the port configured for podman system service

# Verify Podman is listening on the expected port
ss -tlnp | grep ":$PORT"

# Test connectivity from Portainer host
# Use https:// plus the appropriate TLS options here if you enabled TLS
curl http://podman-host:$PORT/v1.40/version

# Check firewall rules
sudo firewall-cmd --list-all | grep "$PORT"       # firewalld
sudo iptables -L -n | grep "$PORT"                # iptables
sudo ufw status | grep "$PORT"                    # ufw

# Open the configured port if blocked
sudo firewall-cmd --add-port=$PORT/tcp --permanent
sudo firewall-cmd --reload
```

## Step 9: View Portainer and Podman Logs for Errors

```bash
# Portainer container logs
podman logs portainer --tail 50

# Look for specific errors
podman logs portainer 2>&1 | grep -i "error\|cannot connect\|socket\|podman"

# Podman system service logs
sudo journalctl -u podman.socket -n 50
sudo journalctl -u podman.service -n 50

# Rootless logs
journalctl --user -u podman.socket -n 50
```

## Conclusion

Podman socket connection issues in Portainer typically fall into four categories: the socket service is not running, the socket path or mount is wrong, permissions or SELinux are blocking access, or the Portainer and Podman combination is outside the supported matrix. Start by verifying the socket exists and the service is active, then confirm Portainer is running on Podman with the socket mounted at `/var/run/docker.sock`, and finally test Podman's Docker-compatible v1.40 API directly with curl before restarting Portainer. Direct Podman socket connections are a legacy local-only option, and rootless Podman may work but is not officially supported by Portainer.
