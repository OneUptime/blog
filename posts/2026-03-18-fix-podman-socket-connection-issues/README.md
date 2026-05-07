# How to Fix Podman Socket Connection Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, API, Socket, Docker Compatibility

Description: A complete guide to fixing Podman socket connection issues, including setting up the Podman API socket, enabling the systemd service, and making Docker-compatible tools work with Podman.

---

> Podman socket connection issues prevent Docker-compatible tools from communicating with Podman. This guide covers how to set up, enable, and troubleshoot the Podman API socket for both rootful and rootless modes.

Unlike Docker, Podman is daemonless by design. It does not run a background service by default. However, many tools, libraries, and scripts expect a Docker-compatible API socket to communicate with the container runtime. Podman provides a REST API that is compatible with the Docker API, but it needs to be explicitly enabled. This guide explains how to set it up and fix common connection issues.

---

## Understanding the Podman Socket

The Podman socket provides a REST API endpoint that mimics the Docker API. Tools like Docker Compose, Portainer, Testcontainers, and various CI/CD systems use this socket to manage containers.

The socket file locations are:

- Rootful: `/run/podman/podman.sock`
- Rootless: `/run/user/<UID>/podman/podman.sock` or `$XDG_RUNTIME_DIR/podman/podman.sock`

The Docker-compatible symlink is typically expected at:

- `/var/run/docker.sock` (rootful)

## Common Issues and Fixes

### 1. Socket Service Not Running

The most common issue is that the Podman socket service is simply not started. Podman does not enable it by default.

For rootless Podman (most common setup):

```bash
# Enable and start the socket service for your user

systemctl --user enable podman.socket
systemctl --user start podman.socket

# Verify it is running
systemctl --user status podman.socket
```

For rootful Podman:

```bash
# Enable and start the socket service system-wide
sudo systemctl enable podman.socket
sudo systemctl start podman.socket

# Verify it is running
sudo systemctl status podman.socket
```

Test that the socket is working:

```bash
# Rootless
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock http://localhost/_ping

# Rootful
sudo curl --unix-socket /run/podman/podman.sock http://localhost/_ping
```

You should get a `OK` response.

### 2. DOCKER_HOST Environment Variable Not Set

Many tools look for the `DOCKER_HOST` environment variable to find the socket. If it is not set or points to the wrong location, connections will fail:

```bash
# Check current value
echo $DOCKER_HOST

# Set it for rootless Podman
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock

# Set it for rootful Podman
export DOCKER_HOST=unix:///run/podman/podman.sock
```

Make it permanent by adding it to your shell profile:

```bash
# For rootless (add to ~/.bashrc or ~/.zshrc)
echo 'export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock' >> ~/.bashrc
source ~/.bashrc
```

### 3. Socket File Does Not Exist

If the socket file is missing, the systemd service may have failed or never been installed:

```bash
# Check if the socket unit file exists
systemctl --user list-unit-files | grep podman

# If podman.socket is not listed, check Podman installation
podman --version

# Reinstall Podman if needed (Fedora/RHEL)
sudo dnf reinstall podman

# Reinstall (Ubuntu/Debian)
sudo apt install --reinstall podman
```

If the unit file exists but the socket is still not created:

```bash
# Check for errors in the socket service
systemctl --user status podman.socket
journalctl --user -u podman.socket

# Reset failed state and retry
systemctl --user reset-failed podman.socket
systemctl --user start podman.socket
```

### 4. Docker Compatibility Symlink

Some tools are hardcoded to look for `/var/run/docker.sock`. You can create a symlink or use `podman-docker` to provide compatibility:

Install the `podman-docker` package:

```bash
# Fedora / RHEL / CentOS
sudo dnf install podman-docker

# Ubuntu / Debian
sudo apt install podman-docker
```

This package creates a `docker` command alias for `podman` and can set up the socket symlink.

Alternatively, create the symlink manually:

```bash
# For rootful Podman
sudo ln -s /run/podman/podman.sock /var/run/docker.sock
```

For rootless Podman, you cannot create a system-wide symlink. Instead, set the `DOCKER_HOST` variable as shown above.

### 5. Lingering Sessions for Rootless Users

The rootless Podman socket runs under your user session. If your user session is not set to linger, the socket will stop when you log out:

```bash
# Enable lingering for your user
sudo loginctl enable-linger $(whoami)

# Verify
loginctl show-user $(whoami) --property=Linger
# Should show: Linger=yes
```

Without lingering, the socket service stops when you disconnect from SSH or log out, causing connection failures for any background processes that depend on it.

### 6. Podman Machine Socket (macOS and Windows)

On macOS and Windows, Podman runs inside a virtual machine. The socket must be forwarded from the VM to the host:

```bash
# Check if the machine is running
podman machine list

# Start the machine if needed
podman machine start

# The socket should be automatically forwarded
# Check the socket path
podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'
```

If the socket is not working on macOS:

```bash
# Check the socket location
ls -la /var/run/docker.sock 2>/dev/null
podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}'

# Set DOCKER_HOST to the correct socket
export DOCKER_HOST="unix://$(podman machine inspect --format '{{.ConnectionInfo.PodmanSocket.Path}}')"
```

If the machine is running but the socket is not forwarded, restart the machine:

```bash
podman machine stop
podman machine start
```

### 7. Firewall Blocking the TCP Socket

If you are using the Podman API over TCP (remote connections), firewalls can block the connection:

```bash
# Start Podman API on a TCP port
podman system service --time=0 tcp:0.0.0.0:8080 &

# Open the firewall port (firewalld)
sudo firewall-cmd --add-port=8080/tcp --permanent
sudo firewall-cmd --reload

# Open the firewall port (ufw)
sudo ufw allow 8080/tcp
```

Set the remote host in `DOCKER_HOST`:

```bash
export DOCKER_HOST=tcp://remote-host:8080
```

Note: Running the Podman API over TCP without TLS is insecure. For production use, configure TLS authentication:

```bash
podman system service --time=0 \
  --tls-key=/path/to/server-key.pem \
  --tls-cert=/path/to/server-cert.pem \
  --tls-client-ca=/path/to/ca.pem \
  tcp:0.0.0.0:8080
```

### 8. Using Podman with Testcontainers

Testcontainers is a popular testing library that expects a Docker socket. Configure it to work with Podman:

```bash
# Set environment variables
export DOCKER_HOST=unix://$XDG_RUNTIME_DIR/podman/podman.sock
export TESTCONTAINERS_RYUK_DISABLED=true
```

The `TESTCONTAINERS_RYUK_DISABLED=true` variable is important for rootless Podman because Ryuk needs privileges that are not available in some rootless environments.

For Java-based Testcontainers, create a `~/.testcontainers.properties` file:

```properties
docker.client.strategy=org.testcontainers.dockerclient.EnvironmentAndSystemPropertyClientProviderStrategy
docker.host=unix\:///run/user/1000/podman/podman.sock
testcontainers.reuse.enable=true
```

## Verifying the Socket Works

Run through these checks to confirm everything is set up correctly:

```bash
# Check socket file exists
ls -la $XDG_RUNTIME_DIR/podman/podman.sock

# Check systemd service is active
systemctl --user is-active podman.socket

# Test API endpoint
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v4.0.0/libpod/info 2>/dev/null | python3 -m json.tool | head -20

# Test Docker-compatible API endpoint
curl --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v1.40/info 2>/dev/null | python3 -m json.tool | head -20

# Test with podman directly
podman --remote info
```

## Conclusion

Podman socket connection issues almost always come down to the socket service not being enabled, the `DOCKER_HOST` variable not being set, or user session lingering not being configured. Start by enabling `podman.socket` via systemd, set the `DOCKER_HOST` environment variable, and enable user lingering for rootless setups. On macOS and Windows, ensure the Podman machine is running and the socket is forwarded correctly. With these steps, Docker-compatible tools will work seamlessly with Podman.
