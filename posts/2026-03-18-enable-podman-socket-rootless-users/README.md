# How to Enable the Podman Socket for Rootless Users

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Rootless, Socket, Security

Description: Learn how to enable and configure the Podman socket for rootless users to provide API access without requiring root privileges.

---

> Rootless Podman with socket activation gives you the security of unprivileged containers combined with the convenience of API-driven management.

Running containers without root privileges is one of Podman's strongest security features. Enabling the Podman socket for rootless users allows you to use Docker-compatible tools, REST API clients, and automation frameworks, all while maintaining the security benefits of rootless operation. This guide covers the complete setup process.

---

## Prerequisites for Rootless Operation

Verify your system supports rootless containers before enabling the socket.

```bash
# Check that your user has subordinate UID/GID mappings

grep "$(whoami)" /etc/subuid
grep "$(whoami)" /etc/subgid

# If no mappings exist, add them (requires root)
sudo usermod --add-subuids 100000-165535 --add-subgids 100000-165535 $(whoami)

# Verify Podman runs rootless
podman info --format '{{.Host.Security.Rootless}}'
# Expected output: true

# Check the user namespace support
podman unshare cat /proc/self/uid_map
```

## Enabling the Rootless Socket

Enable the socket unit for your user session.

```bash
# Enable the Podman socket for the current user
systemctl --user enable podman.socket

# Start the socket immediately
systemctl --user start podman.socket

# Verify the socket is active and listening
systemctl --user status podman.socket
```

The socket file is created at `/run/user/<UID>/podman/podman.sock`.

## Verifying the Socket Path

Confirm the socket location and accessibility.

```bash
# Display the full socket path
echo "Socket: /run/user/$(id -u)/podman/podman.sock"

# Check the socket file exists
ls -la /run/user/$(id -u)/podman/podman.sock

# Verify the XDG_RUNTIME_DIR is set correctly
echo "XDG_RUNTIME_DIR: $XDG_RUNTIME_DIR"

# The socket should be owned by your user
stat /run/user/$(id -u)/podman/podman.sock
```

## Enabling Lingering for Persistent Sockets

By default, user services stop when the user logs out. Enable lingering to keep them running.

```bash
# Enable lingering for your user
loginctl enable-linger $(whoami)

# Verify lingering is enabled
loginctl show-user $(whoami) --property=Linger
# Expected output: Linger=yes

# Now the socket will persist even after logout
# This is essential for servers and CI/CD environments

# To disable lingering later
# loginctl disable-linger $(whoami)
```

## Testing API Access

Confirm the rootless socket responds to API requests.

```bash
# Ping the Podman API
curl --unix-socket /run/user/$(id -u)/podman/podman.sock \
    http://localhost/libpod/_ping
# Expected: OK

# Get version information
curl -s --unix-socket /run/user/$(id -u)/podman/podman.sock \
    http://localhost/v4.0.0/libpod/info | jq '.host.security.rootless'
# Expected: true

# List images through the API
curl -s --unix-socket /run/user/$(id -u)/podman/podman.sock \
    http://localhost/v4.0.0/libpod/images/json | jq '.[].Names'
```

## Configuring Docker Compatibility

Set up Docker-compatible tools to use the rootless Podman socket.

```bash
# Set the DOCKER_HOST environment variable
export DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock

# Add to shell profile for persistence
cat >> ~/.bashrc << 'EOF'
# Use Podman rootless socket for Docker compatibility
if [ -S "/run/user/$(id -u)/podman/podman.sock" ]; then
    export DOCKER_HOST="unix:///run/user/$(id -u)/podman/podman.sock"
fi
EOF

# Verify Docker CLI uses the Podman socket
docker info 2>/dev/null | grep -i "server version"
docker ps
```

## Using with CI/CD Tools

Configure CI/CD tools to use the rootless socket.

```bash
# For Jenkins or other CI tools running as a specific user
# Set the environment variable in the CI configuration
# DOCKER_HOST=unix:///run/user/<CI_USER_UID>/podman/podman.sock

# For GitHub Actions self-hosted runners
cat >> ~/.env << EOF
DOCKER_HOST=unix:///run/user/$(id -u)/podman/podman.sock
EOF

# For GitLab Runner
# Edit /etc/gitlab-runner/config.toml and add:
# environment = ["DOCKER_HOST=unix:///run/user/<RUNNER_UID>/podman/podman.sock"]

# Test that the CI user can access the socket
sudo -u ci-user curl --unix-socket /run/user/$(id -u ci-user)/podman/podman.sock \
    http://localhost/libpod/_ping
```

## Securing the Rootless Socket

Apply additional security measures to the socket.

```bash
# Verify socket permissions (should be owned by your user)
ls -la /run/user/$(id -u)/podman/podman.sock

# The socket should only be accessible by the owning user
# Default permissions are usually 0700 on the parent directory

# Verify no other users can access your runtime directory
ls -la /run/user/$(id -u)/

# Check SELinux context if applicable
ls -Z /run/user/$(id -u)/podman/podman.sock 2>/dev/null
```

## Troubleshooting Rootless Socket Issues

Common issues and solutions specific to rootless operation.

```bash
# Issue: "XDG_RUNTIME_DIR not set"
# Solution: Ensure you have a proper login session managed by systemd-logind
loginctl user-status $(whoami)

# Issue: Socket file not created
# Check if the runtime directory exists
ls -la /run/user/$(id -u)/
# If missing, you may need to log in via a proper session (not just su)

# Issue: "permission denied" errors
# Verify subuid/subgid mappings
podman unshare id

# Issue: Service fails to start
journalctl --user -u podman.socket --no-pager -n 20
journalctl --user -u podman.service --no-pager -n 20

# Issue: Socket works in terminal but not in cron/systemd
# Ensure XDG_RUNTIME_DIR is set in the environment
# For systemd user units:
systemctl --user show-environment | grep XDG

# Full reset of rootless socket
systemctl --user stop podman.service podman.socket
rm -f /run/user/$(id -u)/podman/podman.sock
systemctl --user start podman.socket
```

## Monitoring Rootless Socket Activity

Track socket usage and service activation.

```bash
#!/bin/bash
# monitor-rootless-socket.sh - Monitor Podman rootless socket activity

SOCKET="/run/user/$(id -u)/podman/podman.sock"

echo "=== Rootless Socket Monitor ==="
echo "Socket: $SOCKET"
echo "Exists: $(test -S "$SOCKET" && echo 'yes' || echo 'no')"
echo "Socket Status: $(systemctl --user is-active podman.socket)"
echo "Service Status: $(systemctl --user is-active podman.service)"
echo "Lingering: $(loginctl show-user $(whoami) --property=Linger --value)"
echo ""
echo "=== Recent Activity ==="
journalctl --user -u podman.service --no-pager -n 10 --since "1 hour ago"
```

## Summary

Enabling the Podman socket for rootless users combines the security advantages of unprivileged containers with the convenience of API-driven management. The key steps are enabling the systemd socket unit, configuring lingering for persistence, and setting the DOCKER_HOST variable for tool compatibility. This setup is ideal for development environments, CI/CD pipelines, and any scenario where you need programmatic access to containers without root privileges.
