# How to Configure Rootless Podman in CI Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, CI/CD, Rootless, Security

Description: Learn how to configure rootless Podman in CI environments for secure container builds without requiring root privileges or elevated permissions.

---

> Rootless Podman in CI means your build containers do not run with host root privileges, reducing the impact of an entire class of container escape vulnerabilities.

Rootless Podman allows you to build and run containers without root privileges, which is a significant security advantage in CI environments. However, configuring rootless Podman in CI requires attention to storage drivers, user namespaces, and kernel settings. This guide covers the practical steps for getting rootless Podman working reliably across different CI platforms.

---

## Understanding Rootless Podman Requirements

Rootless Podman uses user namespaces to map the container's root user to an unprivileged user on the host. This requires specific kernel support and configuration.

```bash
#!/bin/bash
# Check if the system supports rootless Podman

# These checks help diagnose issues in CI environments

# Check kernel version (5.12.9+ supports native rootless overlay; older kernels need fuse-overlayfs or vfs)
echo "Kernel: $(uname -r)"

# Check if user namespaces are enabled
echo "User namespaces max: $(cat /proc/sys/user/max_user_namespaces)"

# Check available subordinate UIDs for the current user
echo "Sub UIDs: $(grep "^$(id -un):" /etc/subuid 2>/dev/null || true)"
echo "Sub GIDs: $(grep "^$(id -un):" /etc/subgid 2>/dev/null || true)"

# Check if fuse-overlayfs is available (recommended overlay mount helper for many rootless setups)
which fuse-overlayfs && echo "fuse-overlayfs: available" || echo "fuse-overlayfs: not found"

# Check Podman info for rootless status
podman info --format '{{.Host.Security.Rootless}}'
```

## Configuring Rootless Storage

The storage driver is critical for rootless Podman. Configure it based on what the CI environment supports.

```bash
#!/bin/bash
# Configure rootless Podman storage for CI environments

# Create the configuration directory
mkdir -p "${HOME}/.config/containers"

# Option 1: overlay with fuse-overlayfs
# Requires the fuse-overlayfs package to be installed
if command -v fuse-overlayfs >/dev/null 2>&1; then
  cat > "${HOME}/.config/containers/storage.conf" << 'EOF'
[storage]
driver = "overlay"
runroot = "/tmp/containers-user/runroot"
graphroot = "/tmp/containers-user/storage"

[storage.options.overlay]
# Use fuse-overlayfs for rootless overlay support
mount_program = "/usr/bin/fuse-overlayfs"
EOF

# Option 2: vfs driver (works everywhere, slower but reliable)
# Use this when fuse-overlayfs is not available
else
  cat > "${HOME}/.config/containers/storage.conf" << 'EOF'
[storage]
driver = "vfs"
runroot = "/tmp/containers-user/runroot"
graphroot = "/tmp/containers-user/storage"
EOF
fi

# Verify the configuration
podman info --format 'Driver: {{.Store.GraphDriverName}}'
```

## Setting Up SubUID and SubGID Mappings

Subordinate UID/GID mappings are recommended for rootless operation and are needed for most images that contain multiple users.

```bash
#!/bin/bash
# Configure subordinate UID/GID ranges for rootless Podman
# This is typically needed on self-hosted CI runners

CURRENT_USER=$(whoami)

# Check if mappings already exist
if ! grep -q "^${CURRENT_USER}:" /etc/subuid; then
  # Add subordinate UID range (65536 UIDs starting at 100000)
  sudo usermod --add-subuids 100000-165535 "${CURRENT_USER}"
  echo "Added subuid range for ${CURRENT_USER}"
fi

if ! grep -q "^${CURRENT_USER}:" /etc/subgid; then
  # Add subordinate GID range
  sudo usermod --add-subgids 100000-165535 "${CURRENT_USER}"
  echo "Added subgid range for ${CURRENT_USER}"
fi

# Verify the mappings
echo "SubUID: $(grep "^${CURRENT_USER}:" /etc/subuid)"
echo "SubGID: $(grep "^${CURRENT_USER}:" /etc/subgid)"

# Update the user namespace mappings
podman system migrate
```

## GitHub Actions Rootless Configuration

Configure rootless Podman specifically for GitHub Actions runners.

```yaml
# .github/workflows/rootless.yml
name: Rootless Podman Build

on: [push]

jobs:
  rootless-build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Verify rootless Podman is working
      - name: Verify rootless mode
        run: |
          # GitHub Actions runners have Podman pre-installed
          podman info --format 'Rootless: {{.Host.Security.Rootless}}'
          podman info --format 'Driver: {{.Store.GraphDriverName}}'

          # Show current user (should not be root)
          echo "Running as: $(whoami) (UID: $(id -u))"

      # Build image in rootless mode
      - name: Build image (rootless)
        run: |
          podman build \
            --tag myapp:rootless-test \
            .

      # Run tests in rootless mode
      - name: Run tests (rootless)
        run: |
          podman run --rm \
            --userns keep-id \
            myapp:rootless-test npm test
```

## GitLab CI Rootless Configuration

Set up rootless Podman in GitLab CI with the proper container image.

```yaml
# .gitlab-ci.yml with rootless Podman
image:
  name: quay.io/podman/stable:latest
  docker:
    user: podman

variables:
  # Use vfs for reliability in container-based CI
  STORAGE_DRIVER: vfs

stages:
  - build
  - test

build:
  stage: build
  before_script:
    # Configure rootless storage
    - mkdir -p ~/.config/containers
    - |
      cat > ~/.config/containers/storage.conf << 'EOF'
      [storage]
      driver = "vfs"
      runroot = "/tmp/podman-run"
      graphroot = "/tmp/podman-storage"
      EOF
    # Verify rootless mode
    - podman info --format 'Rootless: {{.Host.Security.Rootless}}'

  script:
    - podman build -t myapp:test .
    - podman run --rm myapp:test npm test
```

## Troubleshooting Common Rootless Issues

Handle the most common rootless Podman issues in CI.

```bash
#!/bin/bash
# Troubleshooting script for rootless Podman in CI

echo "=== Rootless Podman Diagnostics ==="

# Issue 1: "cannot clone: Operation not permitted"
# Fix: Enable user namespaces
if [ "$(cat /proc/sys/user/max_user_namespaces)" = "0" ]; then
  echo "ISSUE: User namespaces disabled"
  echo "FIX: sudo sysctl -w user.max_user_namespaces=28633"
fi

# Issue 2: "no space left on device" with overlay
# Fix: Use a tmpdir with more space or switch to vfs
df -h /tmp
echo "Tip: Set graphroot to a partition with sufficient space"

# Issue 3: "ERRO[0000] cannot find UID/GID"
# Fix: Ensure subuid/subgid mappings exist
if ! grep -q "$(whoami)" /etc/subuid 2>/dev/null; then
  echo "ISSUE: No subuid mapping for $(whoami)"
  echo "FIX: sudo usermod --add-subuids 100000-165535 $(whoami)"
fi

# Issue 4: XDG_RUNTIME_DIR not set
if [ -z "${XDG_RUNTIME_DIR}" ]; then
  echo "ISSUE: XDG_RUNTIME_DIR not set"
  export XDG_RUNTIME_DIR="/tmp/runtime-$(id -u)"
  mkdir -p "${XDG_RUNTIME_DIR}"
  echo "FIX: export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR}"
fi

# Issue 5: Slow builds with vfs
echo "Storage driver: $(podman info --format '{{.Store.GraphDriverName}}')"
echo "Tip: Install fuse-overlayfs for better rootless performance"

# Reset Podman state if things are broken
# podman system reset --force

echo "=== Diagnostics Complete ==="
```

## Summary

Rootless Podman in CI provides a significant security improvement by ensuring that container operations do not require host root privileges. The key configuration points are the storage driver (overlay with fuse-overlayfs for many rootless setups, vfs for compatibility), subordinate UID/GID mappings, and user namespace support in the kernel. GitHub Actions runners work with rootless Podman out of the box, while self-hosted runners and other CI platforms may require some initial setup. When troubleshooting, check user namespace support, subuid/subgid mappings, XDG_RUNTIME_DIR, and storage driver compatibility. The small upfront configuration effort pays off with a more secure CI environment.
