# How to Run Podman Inside Podman (Nested Containers)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Nested Containers, Rootless, DevOps, CI/CD

Description: A practical guide to running Podman inside Podman containers for CI/CD pipelines, development environments, and testing, including rootless and rootful configurations.

---

> Running Podman inside Podman enables powerful use cases like CI/CD build agents, isolated development environments, and container testing frameworks. Podman's rootless architecture makes nested containers more accessible than ever.

Nested container execution is a common requirement for CI/CD pipelines where build agents need to create containers, for development environments that mirror production, and for testing container-based workflows. Unlike Docker, Podman can run in rootless mode inside containers, making nested operation both practical and secure.

---

## Why Nested Podman?

There are several scenarios where running Podman inside a container is valuable:

- CI/CD pipelines that build and test container images
- Development environments that need container access
- Testing container orchestration tools
- Multi-tenant build systems with isolation
- Container-based training and sandbox environments

## Basic Setup: Rootless Podman in Podman

The simplest approach uses rootless Podman inside a Podman container:

```bash
podman run --rm -it \
  --security-opt label=disable \
  --user podman \
  --device /dev/fuse \
  quay.io/podman/stable \
  podman run --rm docker.io/library/alpine echo "Hello from nested Podman"
```

Let us break down the flags:

- `--security-opt label=disable` disables SELinux label separation
- `--user podman` runs as the podman user inside the container
- `--device /dev/fuse` provides FUSE device access for overlay filesystem

## Creating a Custom Nested Podman Image

Build a custom image optimized for nested Podman:

```dockerfile
FROM quay.io/podman/stable

# Install additional tools

RUN dnf install -y \
    git \
    make \
    python3 \
    python3-pip \
    && dnf clean all

# Configure storage for nested operation
RUN mkdir -p /home/podman/.config/containers && \
    echo '[storage]' > /home/podman/.config/containers/storage.conf && \
    echo 'driver = "overlay"' >> /home/podman/.config/containers/storage.conf && \
    echo '[storage.options.overlay]' >> /home/podman/.config/containers/storage.conf && \
    echo 'mount_program = "/usr/bin/fuse-overlayfs"' >> /home/podman/.config/containers/storage.conf

# Configure registries
RUN echo 'unqualified-search-registries = ["docker.io"]' > \
    /home/podman/.config/containers/registries.conf

USER podman
WORKDIR /home/podman
```

Build and run it:

```bash
podman build -t nested-podman -f Containerfile .

podman run --rm -it \
  --security-opt label=disable \
  --device /dev/fuse \
  nested-podman \
  podman info
```

## Running with Privileged Mode

For full functionality, including building images, you may need privileged mode:

```bash
podman run --rm -it \
  --privileged \
  quay.io/podman/stable \
  bash
```

Inside the container:

```bash
podman pull docker.io/library/nginx:latest
podman run -d --name web nginx:latest
podman ps
podman logs web
podman stop web
podman rm web
```

Note that `--privileged` grants extensive capabilities. Use it only in trusted environments.

## Rootless Nested Podman with fuse-overlayfs

For rootless operation without privileged mode, fuse-overlayfs is essential:

```bash
podman run --rm -it \
  --security-opt label=disable \
  --device /dev/fuse \
  --user podman \
  quay.io/podman/stable \
  bash -c '
    # Verify fuse-overlayfs is available
    fuse-overlayfs --version

    # Pull and run a container
    podman pull docker.io/library/alpine:latest
    podman run --rm alpine cat /etc/os-release
  '
```

## CI/CD Pipeline with Nested Podman

Create a build agent that uses Podman for container operations:

```python
#!/usr/bin/env python3
"""CI/CD build script using nested Podman."""

import subprocess
import sys
import os

def run_cmd(cmd, check=True):
    """Run a command and return the result."""
    print(f"+ {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr, file=sys.stderr)
    if check and result.returncode != 0:
        sys.exit(result.returncode)
    return result

def build_and_test(image_name, dockerfile_path="."):
    """Build a container image and run tests."""
    # Build the image
    print("=== Building Image ===")
    run_cmd(f"podman build -t {image_name} {dockerfile_path}")

    # Run tests inside the built image
    print("\n=== Running Tests ===")
    result = run_cmd(
        f"podman run --rm {image_name} python3 -m pytest tests/ -v",
        check=False
    )

    if result.returncode == 0:
        print("\n=== Tests Passed ===")
        # Tag for release
        run_cmd(f"podman tag {image_name} {image_name}:tested")
        return True
    else:
        print("\n=== Tests Failed ===")
        return False

def cleanup():
    """Clean up build artifacts."""
    run_cmd("podman system prune -f", check=False)

if __name__ == "__main__":
    image = os.environ.get("IMAGE_NAME", "myapp")
    success = build_and_test(image)
    cleanup()
    sys.exit(0 if success else 1)
```

Launch this as a nested Podman job:

```bash
podman run --rm \
  --security-opt label=disable \
  --device /dev/fuse \
  --user podman \
  -v ./project:/home/podman/project:Z \
  nested-podman \
  python3 /home/podman/project/build.py
```

## Volume Sharing Between Host and Nested Podman

Share build artifacts between layers:

```bash
# Create a shared volume
podman volume create build-cache

# Run nested Podman with the shared volume
podman run --rm -it \
  --security-opt label=disable \
  --device /dev/fuse \
  --user podman \
  -v build-cache:/home/podman/.local/share/containers:Z,U \
  quay.io/podman/stable \
  bash -c '
    podman pull docker.io/library/golang:1.21
    echo "Image cached in shared volume"
  '
```

## Nested Podman with Systemd

For long-running nested Podman environments with systemd:

```bash
podman run -d \
  --name podman-host \
  --privileged \
  --systemd=true \
  quay.io/podman/stable \
  /sbin/init
```

Then exec into it:

```bash
podman exec -it podman-host bash -c '
  systemctl enable --now podman.socket
  podman run --rm alpine echo "Nested with systemd"
'
```

## Performance Considerations

Nested containers add overhead. Here are tips for optimizing performance:

```bash
# Use tmpfs for the inner Podman storage to improve I/O
podman run --rm -it \
  --security-opt label=disable \
  --device /dev/fuse \
  --user podman \
  --tmpfs /home/podman/.local/share/containers:rw,size=4g \
  quay.io/podman/stable \
  podman run --rm alpine echo "Fast nested execution"
```

### Pre-pulling Images

Avoid pulling images repeatedly by using a persistent storage volume:

```bash
# First run: pull images
podman run --rm \
  --security-opt label=disable \
  --device /dev/fuse \
  --user podman \
  -v podman-storage:/home/podman/.local/share/containers:Z,U \
  quay.io/podman/stable \
  podman pull docker.io/library/python:3.11-slim

# Subsequent runs: images are already available
podman run --rm \
  --security-opt label=disable \
  --device /dev/fuse \
  --user podman \
  -v podman-storage:/home/podman/.local/share/containers:Z,U \
  quay.io/podman/stable \
  podman run --rm python:3.11-slim python3 -c "print('cached image')"
```

## Troubleshooting

### Storage Driver Issues

If you encounter overlay mount errors:

```bash
# Check current storage driver
podman run --rm \
  --security-opt label=disable \
  --device /dev/fuse \
  --user podman \
  quay.io/podman/stable \
  podman info --format '{{.Store.GraphDriverName}}'
```

If overlay fails, fall back to vfs (slower but more compatible):

```bash
podman run --rm -it \
  --security-opt label=disable \
  --user podman \
  -e STORAGE_DRIVER=vfs \
  quay.io/podman/stable \
  podman run --rm alpine echo "Using vfs driver"
```

### Namespace Conflicts

If you see UID mapping errors, ensure the outer container has sufficient subordinate UIDs:

```bash
podman run --rm -it \
  --security-opt label=disable \
  --user podman \
  --device /dev/fuse \
  --userns=keep-id \
  quay.io/podman/stable \
  podman info
```

## Conclusion

Running Podman inside Podman is a practical solution for CI/CD pipelines, development environments, and container testing. Podman's rootless architecture makes nested containers more secure than alternatives that require a daemon socket mount. By choosing the right configuration for your needs, whether rootless with fuse-overlayfs or privileged mode for full functionality, you can build powerful nested container workflows.
