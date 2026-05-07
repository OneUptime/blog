# How to Run Podman Inside Docker

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Docker, Nested Containers, Migration, DevOps

Description: A step-by-step guide to running Podman inside Docker containers, useful for migration scenarios, CI/CD pipelines, and environments that already use Docker but need Podman capabilities.

---

> Running Podman inside Docker containers bridges the gap between Docker-based infrastructure and Podman's daemonless architecture. This setup is valuable for gradual migrations, CI/CD environments, and teams evaluating Podman.

If your infrastructure already runs on Docker but you want to leverage Podman's rootless capabilities, pod support, or Kubernetes YAML generation, running Podman inside Docker containers is a practical transitional approach. This guide covers the setup, configuration, and common use cases.

---

## Why Run Podman Inside Docker?

There are several practical reasons for this combination:

- Gradual migration from Docker to Podman
- CI/CD systems built on Docker that need Podman features
- Testing Podman compatibility in Docker-based environments
- Leveraging Podman's pod support within Docker infrastructure
- Building Podman-based tools in Docker-hosted development environments

## Basic Setup

Run the official Podman image inside Docker:

```bash
docker run --rm -it \
  --privileged \
  quay.io/podman/stable \
  podman run --rm docker.io/library/alpine echo "Hello from Podman inside Docker"
```

The `--privileged` flag is often required because Docker's default security model restricts the namespace and mount operations that Podman needs.

## Rootless Podman Inside Docker

To avoid running the inner Podman process as root, run as a non-root user:

```bash
docker run --rm -it \
  --privileged \
  --user podman \
  --device /dev/fuse \
  quay.io/podman/stable \
  podman run --rm alpine cat /etc/os-release
```

## Building a Custom Image

Create a Dockerfile that adds build tools and the Podman Python SDK:

```dockerfile
FROM quay.io/podman/stable

# Install build tools

RUN dnf install -y \
    git \
    make \
    curl \
    jq \
    python3 \
    python3-podman \
    && dnf clean all

# Configure containers storage
RUN mkdir -p /home/podman/.config/containers && \
    printf '[storage]\ndriver = "overlay"\n\n[storage.options.overlay]\nmount_program = "/usr/bin/fuse-overlayfs"\n' \
    > /home/podman/.config/containers/storage.conf

# Configure registries
RUN printf 'unqualified-search-registries = ["docker.io"]\n' \
    > /home/podman/.config/containers/registries.conf

USER podman
WORKDIR /home/podman

ENTRYPOINT ["/bin/bash"]
```

Build it with Docker:

```bash
docker build -t podman-in-docker -f Dockerfile .
```

## Running Podman Operations Inside Docker

### Pulling and Running Images

```bash
docker run --rm -it \
  --privileged \
  --user podman \
  --device /dev/fuse \
  podman-in-docker \
  -c '
    podman pull docker.io/library/nginx:latest
    podman run -d --name web -p 8080:80 nginx:latest
    podman ps
    curl -s http://localhost:8080 | head -5
    podman stop web
    podman rm web
  '
```

### Building Images with Podman Inside Docker

```bash
docker run --rm -it \
  --privileged \
  --user podman \
  --device /dev/fuse \
  -v $(pwd)/myapp:/home/podman/myapp:Z \
  podman-in-docker \
  -c '
    cd /home/podman/myapp
    podman build -t myapp:latest .
    podman images
  '
```

## CI/CD Pipeline Integration

### GitLab CI Example

```yaml
# .gitlab-ci.yml
build-with-podman:
  image:
    name: quay.io/podman/stable
    entrypoint: [""]
  variables:
    STORAGE_DRIVER: vfs
  before_script:
    - podman info
  script:
    - podman build -t $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA .
    - podman push $CI_REGISTRY_IMAGE:$CI_COMMIT_SHA
  tags:
    - docker-privileged
```

### GitHub Actions Example

```yaml
# .github/workflows/build.yml
name: Build with Podman
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    container:
      image: quay.io/podman/stable
      options: --privileged --device /dev/fuse
    steps:
      - uses: actions/checkout@v4
      - name: Build image
        run: |
          podman build -t myapp:${{ github.sha }} .
      - name: Test image
        run: |
          podman run --rm myapp:${{ github.sha }} python3 -m pytest
```

## Using the Podman Python SDK Inside Docker

Write Python scripts that use the Podman SDK inside Docker containers:

```python
#!/usr/bin/env python3
"""Build script using Podman Python SDK inside Docker."""

import os
import subprocess
import sys
import time

PODMAN_SOCKET = "unix:///tmp/podman.sock"

def ensure_podman_socket():
    """Start the Podman socket for SDK communication."""
    socket_path = PODMAN_SOCKET.removeprefix("unix://")
    try:
        os.unlink(socket_path)
    except FileNotFoundError:
        pass

    subprocess.Popen(
        ["podman", "system", "service", "--time=0", PODMAN_SOCKET],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        start_new_session=True
    )
    for _ in range(50):
        if os.path.exists(socket_path):
            return
        time.sleep(0.1)
    raise RuntimeError("Podman service socket did not start")

def build_and_test():
    """Build and test using the Podman Python SDK."""
    from podman import PodmanClient

    with PodmanClient(base_url=PODMAN_SOCKET) as client:
        print(f"Podman version: {client.version()['Version']}")

        # Build the image
        print("Building image...")
        image, logs = client.images.build(
            path="/home/podman/project",
            tag="myapp:test"
        )
        for log in logs:
            if "stream" in log:
                print(log["stream"], end="")

        # Run tests
        print("\nRunning tests...")
        container = client.containers.run(
            image="myapp:test",
            command=["python3", "-m", "pytest", "-v"],
            detach=True
        )

        result = container.wait()
        logs = container.logs()
        print(logs.decode())

        container.remove()

        return result.get("StatusCode", 1) == 0

if __name__ == "__main__":
    ensure_podman_socket()
    success = build_and_test()
    sys.exit(0 if success else 1)
```

Run this inside Docker:

```bash
docker run --rm \
  --privileged \
  --user podman \
  --device /dev/fuse \
  -v $(pwd):/home/podman/project:Z \
  podman-in-docker \
  -c 'python3 /home/podman/project/build.py'
```

## Storage Configuration

Storage driver selection impacts performance and compatibility:

### Using VFS Driver (Most Compatible)

```bash
docker run --rm -it \
  --privileged \
  -e STORAGE_DRIVER=vfs \
  quay.io/podman/stable \
  podman info --format '{{.Store.GraphDriverName}}'
```

VFS copies entire layers, making it slow but compatible with any environment.

### Using Overlay with FUSE

```bash
docker run --rm -it \
  --privileged \
  --device /dev/fuse \
  --user podman \
  quay.io/podman/stable \
  podman info --format '{{.Store.GraphDriverName}}'
```

fuse-overlayfs provides better performance for rootless operation.

## Persistent Storage Between Runs

Use Docker volumes to persist Podman data across container restarts:

```bash
# Create a Docker volume for Podman storage
docker volume create podman-data

# Run with persistent storage
docker run --rm -it \
  --privileged \
  --user podman \
  --device /dev/fuse \
  -v podman-data:/home/podman/.local/share/containers:Z \
  quay.io/podman/stable \
  bash -c '
    podman pull docker.io/library/python:3.11-slim
    echo "Images will persist for next run"
    podman images
  '
```

## Network Configuration

### Sharing Host Network

```bash
docker run --rm -it \
  --privileged \
  --network host \
  quay.io/podman/stable \
  podman run -d -p 9090:80 nginx:latest
```

### Creating Isolated Networks

```bash
docker run --rm -it \
  --privileged \
  quay.io/podman/stable \
  bash -c '
    podman network create mynet
    podman run -d --name web --network mynet nginx:latest
    podman run --rm --network mynet alpine wget -qO- http://web:80
    podman stop web && podman rm web
    podman network rm mynet
  '
```

## Troubleshooting Common Issues

### Permission Denied for /dev/fuse

If the FUSE device is not available:

```bash
# Run with explicit device access
docker run --rm -it \
  --privileged \
  --device /dev/fuse \
  quay.io/podman/stable \
  ls -la /dev/fuse
```

### Overlay Filesystem Errors

If overlay fails inside Docker, switch to vfs:

```bash
docker run --rm -it \
  --privileged \
  quay.io/podman/stable \
  bash -c '
    mkdir -p ~/.config/containers
    echo "[storage]" > ~/.config/containers/storage.conf
    echo "driver = \"vfs\"" >> ~/.config/containers/storage.conf
    podman info
  '
```

### Slow Performance

For better I/O performance, use tmpfs for the storage directory:

```bash
docker run --rm -it \
  --privileged \
  --tmpfs /var/lib/containers:rw,size=4g \
  quay.io/podman/stable \
  podman run --rm alpine echo "Fast storage"
```

## Security Considerations

Running Podman inside Docker with `--privileged` grants full host capabilities. For production environments, consider these alternatives:

```bash
# More targeted capability grants instead of --privileged
docker run --rm -it \
  --cap-add=SYS_ADMIN \
  --cap-add=MKNOD \
  --cap-add=NET_ADMIN \
  --security-opt seccomp=unconfined \
  --security-opt apparmor=unconfined \
  --device /dev/fuse \
  quay.io/podman/stable \
  podman run --rm alpine echo "Reduced privileges"
```

## Conclusion

Running Podman inside Docker is a practical approach for teams transitioning from Docker to Podman, CI/CD environments that need Podman features, and development setups that want to leverage both tools. While the `--privileged` flag is often necessary, understanding the specific capabilities required lets you reduce the security surface. This setup bridges the gap between Docker-based infrastructure and Podman's modern container management capabilities.
