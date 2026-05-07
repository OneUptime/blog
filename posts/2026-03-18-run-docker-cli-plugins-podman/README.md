# How to Run Docker CLI Plugins with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, Docker, CLI Plugins, Compose, Buildx, Compatibility

Description: Learn how to use Docker CLI plugins like Compose and Buildx with Podman through compatibility layers and alternative tools.

---

> While Podman does not natively support Docker CLI plugins, compatibility layers and alternative tools let you use the same workflows you rely on with Docker.

Docker CLI plugins extend the `docker` command with additional functionality. Popular plugins include Docker Compose, Buildx, and Scout. Podman does not support Docker's plugin architecture directly, but provides alternative ways to achieve the same results. This guide covers how to use common Docker CLI plugins with Podman and which native Podman alternatives are available.

---

## Understanding Docker CLI Plugins

Docker CLI plugins are executables stored in `~/.docker/cli-plugins/` that extend the `docker` command.

```bash
# List Docker CLI plugins

ls ~/.docker/cli-plugins/
# Common plugins:
# docker-compose  - Multi-container orchestration
# docker-buildx   - Extended build capabilities
# docker-scout    - Image vulnerability scanning

# Docker plugins run as: docker compose, docker buildx, etc.
```

## Using Docker Compose with Podman

Docker Compose is the most commonly needed plugin. Podman supports it through multiple approaches.

```bash
# Option 1: podman-compose (Python-based alternative)
pip3 install podman-compose

# Use it as a drop-in replacement
podman-compose up -d
podman-compose ps
podman-compose down

# Option 2: Podman's built-in compose support (Podman 4.7+)
# Uses docker-compose or podman-compose as the backend
podman compose up -d
podman compose ps
podman compose down

# Option 3: Run Docker Compose against Podman's socket
# Start the Podman socket
systemctl --user enable --now podman.socket

# Set DOCKER_HOST to point to Podman's socket
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"

# Now docker-compose CLI works with Podman
docker-compose up -d
docker-compose ps
```

## Using Buildx Features with Podman

Docker Buildx provides multi-platform builds and advanced build features. Podman handles these natively.

```bash
# Docker Buildx multi-platform build
docker buildx build --platform linux/amd64,linux/arm64 -t myapp:latest .

# Podman equivalent - use --platform with --manifest for multiple platforms
podman build --platform linux/amd64,linux/arm64 --manifest myapp:latest .

# Build for a specific platform
podman build --platform linux/arm64 -t myapp:arm64 .

# Podman manifest for multi-arch images (replaces buildx imagetools)
podman manifest create myapp:latest
podman manifest add myapp:latest myapp:amd64
podman manifest add myapp:latest myapp:arm64
podman manifest push myapp:latest docker://registry.example.com/myapp:latest
```

## Setting Up the Podman Socket for Plugin Compatibility

Many Docker plugins communicate via the Docker socket. Podman provides a compatible socket.

```bash
# Enable the Podman socket for the current user (rootless)
systemctl --user enable --now podman.socket

# Verify the socket is running
systemctl --user status podman.socket

# Check the socket path
echo "${XDG_RUNTIME_DIR}/podman/podman.sock"
ls -la "${XDG_RUNTIME_DIR}/podman/podman.sock"

# Set DOCKER_HOST for all Docker plugins
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"

# Add to your shell profile for persistence
echo "export DOCKER_HOST=\"unix://\${XDG_RUNTIME_DIR}/podman/podman.sock\"" \
  >> ~/.bashrc

# For rootful Podman socket
sudo systemctl enable --now podman.socket
# Socket at: /run/podman/podman.sock
```

## Creating a Plugin Compatibility Wrapper

Build a wrapper script that handles common Docker plugin commands with Podman alternatives.

```bash
#!/bin/bash
# /usr/local/bin/docker - Plugin-aware Docker-to-Podman wrapper

case "$1" in
  compose)
    shift
    # Use podman-compose or podman compose
    if command -v podman-compose &>/dev/null; then
      exec podman-compose "$@"
    else
      exec podman compose "$@"
    fi
    ;;
  buildx)
    shift
    case "$1" in
      build)
        shift
        exec podman build "$@"
        ;;
      imagetools)
        shift
        exec podman manifest "$@"
        ;;
      *)
        echo "Buildx subcommand '$1' is not fully supported by this wrapper."
        echo "Use 'podman build' or 'podman manifest' directly for advanced buildx workflows."
        shift
        exec podman build "$@"
        ;;
    esac
    ;;
  scout)
    shift
    echo "Docker Scout is not available with Podman."
    echo "Use 'trivy image <image>' or 'grype <image>' instead."
    exit 1
    ;;
  *)
    exec podman "$@"
    ;;
esac
```

```bash
# Make the wrapper executable
sudo chmod +x /usr/local/bin/docker

# Test plugin compatibility
docker compose up -d
docker buildx build -t myapp .
```

## Alternative Scanning Tools

Docker Scout does not work with Podman, but excellent alternatives exist.

```bash
# Install Trivy for vulnerability scanning
sudo tee /etc/yum.repos.d/trivy.repo <<'EOF'
[trivy]
name=Trivy repository
baseurl=https://get.trivy.dev/rpm/releases/$basearch/
gpgcheck=1
enabled=1
gpgkey=https://get.trivy.dev/rpm/public.key
EOF
sudo dnf install -y trivy
brew install trivy           # macOS

# Scan a Podman image with Trivy
trivy image myapp:latest

# Scan with severity filtering
trivy image --severity HIGH,CRITICAL myapp:latest

# Install Grype as another alternative
curl -sSfL https://get.anchore.io/grype | \
  sudo sh -s -- -b /usr/local/bin

# Scan with Grype
grype myapp:latest
```

## Running Docker Plugins via the Podman Socket

Some Docker plugins can connect to Podman through its Docker-compatible API.

```bash
# Ensure the Podman socket is running
systemctl --user start podman.socket

# Test the API compatibility
curl --unix-socket "${XDG_RUNTIME_DIR}/podman/podman.sock" \
  http://localhost/v1.40/version | jq .

# Docker plugins that use the API will work automatically
# when DOCKER_HOST points to the Podman socket
export DOCKER_HOST="unix://${XDG_RUNTIME_DIR}/podman/podman.sock"

# Test with docker-compose
docker-compose version
docker-compose up -d
```

## Updating CI/CD for Plugin Compatibility

Adjust CI/CD pipelines that use Docker plugins to work with Podman.

```bash
#!/bin/bash
# ci-build.sh - CI/CD build script compatible with both Docker and Podman

# Detect the available runtime
if command -v podman &>/dev/null; then
  RUNTIME="podman"
  # For Compose, use podman-compose
  COMPOSE_CMD="podman-compose"
elif command -v docker &>/dev/null; then
  RUNTIME="docker"
  COMPOSE_CMD="docker compose"
else
  echo "No container runtime found" >&2
  exit 1
fi

echo "Using runtime: ${RUNTIME}"

# Build the application
$RUNTIME build -t myapp:${CI_COMMIT_SHA} .

# Run tests using compose
$COMPOSE_CMD -f docker-compose.test.yml up --abort-on-container-exit
TEST_EXIT=$?

# Clean up
$COMPOSE_CMD -f docker-compose.test.yml down -v

exit $TEST_EXIT
```

## Summary

While Podman does not support Docker CLI plugins directly, it provides equivalent functionality through native commands, alternative tools, and its Docker-compatible socket. Docker Compose works through podman-compose or the Podman socket. Buildx features like multi-platform builds are built into Podman natively. For scanning, use Trivy or Grype as alternatives to Docker Scout. Setting up the Podman socket and DOCKER_HOST environment variable provides the broadest compatibility with Docker plugins that communicate through the API.
