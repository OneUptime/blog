# How to Verify Your Podman Installation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Installation, Linux, Container, DevOps

Description: A comprehensive checklist for verifying your Podman installation, covering version checks, rootless support, networking, storage, and end-to-end container tests.

---

> A thorough verification of your Podman installation catches configuration issues before they become production problems.

After installing Podman, it is important to verify that every component is working correctly. A broken configuration can lead to container failures, networking issues, or storage problems that are harder to diagnose later. This guide provides a systematic verification checklist.

---

## Prerequisites

- A system with Podman installed
- Terminal access

## Step 1: Check the Podman Version

Start with the basics:

```bash
# Check the Podman CLI version

podman --version

# Display detailed version information including API version
podman version
```

Expected output shows client version, server version (if applicable), API version, and build information.

## Step 2: Review System Information

```bash
# Display comprehensive system information
podman info
```

Key fields to check in the output:

```bash
# Check the OCI runtime (should be crun or runc)
podman info --format '{{.Host.OCIRuntime.Name}}'

# Check the storage driver
podman info --format '{{.Store.GraphDriverName}}'

# Check the number of images and containers
podman info --format 'Images: {{.Store.ImageStore.Number}}, Containers: {{.Store.ContainerStore.Number}}'
```

## Step 3: Verify Rootless Support

Rootless containers are a key Podman feature. Verify they work:

```bash
# Check subuid and subgid mappings
cat /etc/subuid
cat /etc/subgid

# Verify your user has entries
grep -q "^$(id -un):" /etc/subuid && echo "subuid OK" || echo "subuid MISSING"
grep -q "^$(id -un):" /etc/subgid && echo "subgid OK" || echo "subgid MISSING"

# Check user namespace support
cat /proc/sys/user/max_user_namespaces

# Run a rootless test container
podman run --rm docker.io/library/alpine:latest id

# Check the user namespace mapping used by rootless Podman
podman unshare cat /proc/self/uid_map
```

The container may still show `uid=0(root)` inside the container. In rootless mode, that container root user maps to your regular unprivileged user on the host, which you can confirm from the `uid_map` output.

## Step 4: Verify the OCI Runtime

```bash
# Check which runtime is configured
podman info --format '{{.Host.OCIRuntime.Path}}'

# Verify the runtime binary exists and runs
crun --version 2>/dev/null || runc --version 2>/dev/null
```

## Step 5: Test Image Operations

```bash
# Pull an image
podman pull docker.io/library/alpine:latest

# List images
podman images

# Inspect the pulled image
podman inspect docker.io/library/alpine:latest --format '{{.Architecture}}'

# Remove the image
podman rmi docker.io/library/alpine:latest

# Verify it was removed
podman images
```

## Step 6: Test Container Lifecycle

Run through the complete container lifecycle:

```bash
# Create a container
podman create --name lifecycle-test docker.io/library/alpine:latest echo "Hello Podman"

# Start the container
podman start lifecycle-test

# Check container logs
podman logs lifecycle-test

# Inspect the container
podman inspect lifecycle-test --format '{{.State.Status}}'

# Remove the container
podman rm lifecycle-test
```

## Step 7: Verify Networking

```bash
# Test container networking with DNS resolution
podman run --rm docker.io/library/alpine:latest nslookup google.com

# Test outbound HTTP connectivity
podman run --rm docker.io/library/alpine:latest wget -qO- https://httpbin.org/ip

# Test port forwarding
podman run -d --name net-test -p 9090:80 docker.io/library/nginx:latest
sleep 2

# Verify the port is accessible
curl -s http://localhost:9090 | head -5 && echo "Port forwarding OK" || echo "Port forwarding FAILED"

# Clean up
podman stop net-test
podman rm net-test
```

Check the networking backend:

```bash
# Verify the network backend (Netavark or CNI)
podman info --format '{{.Host.NetworkBackend}}'

# List available networks
podman network ls
```

## Step 8: Verify Storage

```bash
# Check the storage driver
podman info --format '{{.Store.GraphDriverName}}'

# Check the storage root location
podman info --format '{{.Store.GraphRoot}}'

# Verify storage is writable by running a container that writes data
podman run --rm docker.io/library/alpine:latest sh -c "echo 'storage works' > /tmp/test && cat /tmp/test"
```

Test volume mounts:

```bash
# Create a test directory
mkdir -p /tmp/podman-verify-test
echo "volume mount test" > /tmp/podman-verify-test/data.txt

# Test volume mounting
podman run --rm -v /tmp/podman-verify-test:/data:Z \
  docker.io/library/alpine:latest cat /data/data.txt

# Clean up
rm -rf /tmp/podman-verify-test
```

## Step 9: Verify the Podman Socket (Docker Compatibility)

```bash
# Check if the Podman socket is active
systemctl --user status podman.socket 2>/dev/null

# Start the socket if it is not already active
systemctl --user start podman.socket

# Test the Docker-compatible API through the socket
curl -s --unix-socket $XDG_RUNTIME_DIR/podman/podman.sock \
  http://localhost/v1.40/info | head -c 200

echo ""
echo "Socket test complete"
```

## Step 10: Run the Built-in Health Check

Podman includes built-in storage consistency checks:

```bash
# Check image and container storage consistency
podman system check 2>/dev/null || echo "system check not available in this version"

# Show Podman disk usage
podman system df

# View detailed disk usage, including reclaimable space
podman system df -v
```

## Comprehensive Verification Script

Save this as a script for quick verification:

```bash
#!/bin/bash
# podman-verify.sh - Comprehensive Podman verification script

echo "=== Podman Verification ==="
echo ""

echo "1. Version:"
podman --version
echo ""

echo "2. OCI Runtime:"
podman info --format '{{.Host.OCIRuntime.Name}} ({{.Host.OCIRuntime.Path}})'
echo ""

echo "3. Storage Driver:"
podman info --format '{{.Store.GraphDriverName}}'
echo ""

echo "4. Network Backend:"
podman info --format '{{.Host.NetworkBackend}}'
echo ""

echo "5. Rootless Check:"
if grep -q "^$(id -un):" /etc/subuid 2>/dev/null; then
  echo "  subuid: OK"
else
  echo "  subuid: MISSING"
fi
if grep -q "^$(id -un):" /etc/subgid 2>/dev/null; then
  echo "  subgid: OK"
else
  echo "  subgid: MISSING"
fi
echo ""

echo "6. Container Run Test:"
podman run --rm docker.io/library/alpine:latest echo "Container run: OK" 2>/dev/null || echo "Container run: FAILED"
echo ""

echo "7. Network Test:"
podman run --rm docker.io/library/alpine:latest wget -qO- --timeout=5 https://httpbin.org/ip 2>/dev/null && echo "Network: OK" || echo "Network: FAILED"
echo ""

echo "=== Verification Complete ==="
```

Run it:

```bash
# Make the script executable and run it
chmod +x podman-verify.sh
./podman-verify.sh
```

## Troubleshooting Common Issues

If the runtime is not found:

```bash
# Install crun (recommended) or runc
sudo dnf install -y crun    # Fedora/CentOS
sudo apt install -y crun     # Debian/Ubuntu
```

If rootless mode fails:

```bash
# Reset Podman storage
podman system reset

# Reconfigure subuid/subgid
sudo usermod --add-subuids 100000-165535 $(whoami)
sudo usermod --add-subgids 100000-165535 $(whoami)
```

If networking tests fail:

```bash
# Reinstall slirp4netns
sudo dnf install -y slirp4netns  # Fedora
sudo apt install -y slirp4netns  # Debian
```

## Summary

Verifying your Podman installation systematically catches issues early. Test the version, runtime, rootless support, networking, storage, and the Docker compatibility socket. The verification script provided can be integrated into your provisioning workflow to automatically validate Podman on new systems.
