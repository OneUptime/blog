# How to Use Docker SDK with Podman API Compatibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Docker, SDK, API Compatibility, Container

Description: Learn how to use existing Docker SDKs and tools with Podman's Docker-compatible API, enabling a seamless migration from Docker to Podman without rewriting your automation code.

---

> Podman provides a Docker-compatible API layer that allows many existing Docker SDKs, tools, and scripts to work with Podman with little or no modification. This compatibility layer makes migrating from Docker to Podman straightforward, letting you keep your existing automation while gaining Podman's rootless and daemonless advantages.

One of Podman's strongest features is its commitment to Docker compatibility. The Podman API includes a Docker-compatible endpoint that speaks the same protocol as the Docker Engine API. This means the official Docker SDKs for Python, Go, and other languages can communicate with Podman directly, as can tools like Docker Compose and Portainer.

This guide shows you how to configure Podman's compatibility layer and use Docker SDKs with it across multiple languages.

---

## Understanding Podman's Compatibility Layer

Podman exposes two sets of API endpoints:

1. **Libpod API** (`/libpod/...`): Podman-native endpoints with full Podman feature access.
2. **Compat API** (`/...`): Docker-compatible endpoints that mirror the Docker Engine API.

The compat API handles the same request and response formats that Docker clients expect. When a Docker SDK connects to the Podman socket, it uses these compat endpoints transparently.

## Setting Up Podman for Docker Compatibility

### Starting the API Service

```bash
# Rootful

sudo podman system service --time=0 unix:///run/podman/podman.sock &

# Rootless
podman system service --time=0 unix://$XDG_RUNTIME_DIR/podman/podman.sock &
```

### Creating a Docker-Compatible Socket Symlink

Many Docker SDKs default to connecting at `/var/run/docker.sock`. You can create a symlink:

```bash
sudo ln -sf /run/podman/podman.sock /var/run/docker.sock
```

Or use systemd to manage Podman's socket:

```bash
# Rootful
sudo systemctl enable --now podman.socket

# Rootless
systemctl --user enable --now podman.socket
```

### Setting the DOCKER_HOST Environment Variable

Alternatively, configure Docker SDKs to use a custom socket path:

```bash
export DOCKER_HOST=unix:///run/podman/podman.sock
```

## Using the Docker SDK for Python

The official Docker SDK for Python works with Podman's compat API.

### Installation

```bash
pip install docker
```

### Connecting to Podman

```python
import docker

# Option 1: Use DOCKER_HOST environment variable
# export DOCKER_HOST=unix:///run/podman/podman.sock
client = docker.from_env()

# Option 2: Specify the socket path directly
client = docker.DockerClient(
    base_url="unix:///run/podman/podman.sock",
    version="auto"
)

# Verify connection
info = client.info()
print(f"Server: {info.get('ServerVersion', 'unknown')}")
print(f"Containers: {info.get('Containers', 0)}")
```

### Managing Containers

```python
import docker

client = docker.DockerClient(
    base_url="unix:///run/podman/podman.sock",
    version="auto"
)

# Pull an image
print("Pulling nginx:alpine...")
image = client.images.pull("nginx", tag="alpine")
print(f"Pulled: {image.tags}")

# Run a container
container = client.containers.run(
    "nginx:alpine",
    name="docker-sdk-demo",
    ports={"80/tcp": 8080},
    environment={"NGINX_HOST": "localhost"},
    detach=True
)
print(f"Container started: {container.short_id}")
print(f"Status: {container.status}")

# List running containers
for c in client.containers.list():
    print(f"  {c.name} ({c.short_id}) - {c.status}")

# Get logs
logs = container.logs(tail=10).decode("utf-8")
print(f"Logs:\n{logs}")

# Get stats
stats = container.stats(stream=False)
print(f"CPU: {stats['cpu_stats']['cpu_usage']['total_usage']}")
print(f"Memory: {stats['memory_stats']['usage'] / 1048576:.1f} MB")

# Execute a command
exit_code, output = container.exec_run("cat /etc/os-release")
print(f"Exit code: {exit_code}")
print(f"Output:\n{output.decode('utf-8')}")

# Stop and remove
container.stop(timeout=5)
container.remove()
print("Container removed")
```

### Volume and Network Management

```python
client = docker.DockerClient(
    base_url="unix:///run/podman/podman.sock",
    version="auto"
)

# Create a volume
volume = client.volumes.create(name="my-data", labels={"env": "dev"})
print(f"Volume created: {volume.name}")

# Create a network
network = client.networks.create("my-network", driver="bridge")
print(f"Network created: {network.name}")

# Run container with volume and network
container = client.containers.run(
    "alpine:latest",
    name="vol-test",
    volumes={"my-data": {"bind": "/data", "mode": "rw"}},
    network="my-network",
    command="sleep 3600",
    detach=True
)

# Clean up
container.stop()
container.remove()
network.remove()
volume.remove()
```

## Using the Docker SDK for Go

The Docker SDK for Go also works with Podman.

### Installation

```bash
go get github.com/moby/moby/client
```

### Connecting and Managing Containers

```go
package main

import (
    "context"
    "fmt"
    "io"
    "os"

    "github.com/docker/go-connections/nat"
    "github.com/moby/moby/api/types/container"
    "github.com/moby/moby/client"
)

func main() {
    ctx := context.Background()

    // Connect to Podman's compat socket
    cli, err := client.New(
        client.WithHost("unix:///run/podman/podman.sock"),
    )
    if err != nil {
        fmt.Printf("Error creating client: %v\n", err)
        os.Exit(1)
    }
    defer cli.Close()

    // Check connection
    info, err := cli.Info(ctx, client.InfoOptions{})
    if err != nil {
        fmt.Printf("Error getting info: %v\n", err)
        os.Exit(1)
    }
    fmt.Printf("Connected: %s, Containers: %d\n", info.Info.Name, info.Info.Containers)

    // Pull an image
    reader, err := cli.ImagePull(ctx, "docker.io/library/nginx:alpine", client.ImagePullOptions{})
    if err != nil {
        fmt.Printf("Error pulling image: %v\n", err)
        os.Exit(1)
    }
    io.Copy(io.Discard, reader)
    reader.Close()
    fmt.Println("Image pulled")

    // Create container
    resp, err := cli.ContainerCreate(ctx, client.ContainerCreateOptions{
        Image: "nginx:alpine",
        Config: &container.Config{
            Env: []string{"NGINX_HOST=localhost"},
        },
        HostConfig: &container.HostConfig{
            PortBindings: nat.PortMap{
                "80/tcp": []nat.PortBinding{
                    {HostPort: "9090"},
                },
            },
        },
        Name: "go-sdk-demo",
    })
    if err != nil {
        fmt.Printf("Error creating container: %v\n", err)
        os.Exit(1)
    }
    fmt.Printf("Created: %s\n", resp.ID[:12])

    // Start container
    if _, err := cli.ContainerStart(ctx, resp.ID, client.ContainerStartOptions{}); err != nil {
        fmt.Printf("Error starting: %v\n", err)
        os.Exit(1)
    }
    fmt.Println("Started")

    // List containers
    containers, _ := cli.ContainerList(ctx, client.ContainerListOptions{})
    for _, c := range containers.Items {
        fmt.Printf("  %s (%s) - %s\n", c.Names[0], c.ID[:12], c.State)
    }

    // Get logs
    logReader, _ := cli.ContainerLogs(ctx, resp.ID, client.ContainerLogsOptions{
        ShowStdout: true,
        ShowStderr: true,
        Tail:       "10",
    })
    logData, _ := io.ReadAll(logReader)
    logReader.Close()
    fmt.Printf("Logs:\n%s\n", string(logData))

    // Stop and remove
    cli.ContainerStop(ctx, resp.ID, client.ContainerStopOptions{})
    cli.ContainerRemove(ctx, resp.ID, client.ContainerRemoveOptions{})
    fmt.Println("Cleaned up")
}
```

## Using Docker Compose with Podman

Docker Compose can use Podman's compat API directly:

```bash
# Set the Docker host to Podman's socket
export DOCKER_HOST=unix:///run/podman/podman.sock

# Use docker-compose as normal
docker-compose up -d
docker-compose ps
docker-compose logs
docker-compose down
```

For `docker compose` (the Go-based plugin version), the same environment variable works:

```bash
export DOCKER_HOST=unix:///run/podman/podman.sock
docker compose up -d
```

## Compatibility Considerations

While Podman's compat API covers most Docker API features, there are some differences to be aware of:

### Supported Features

- Container CRUD operations (create, start, stop, remove, inspect)
- Image pull, push, build, and management
- Volume operations
- Network management
- Exec (running commands in containers)
- Logs and stats streaming
- Container events

### Known Differences

1. **Docker Swarm**: Podman does not support Swarm mode. Swarm-related API endpoints return errors.
2. **Docker plugins**: Docker volume and network plugins are not supported.
3. **Build cache**: Build cache behavior may differ slightly.
4. **Container events**: Some event types may not match exactly.

### Handling API Version Negotiation

Use API version negotiation when using Docker SDKs with Podman:

```python
# Python
client = docker.DockerClient(
    base_url="unix:///run/podman/podman.sock",
    version="auto"  # Auto-negotiate API version
)
```

```go
// Go
cli, err := client.New(
    client.WithHost("unix:///run/podman/podman.sock"),
)
```

## Testing Compatibility

Create a simple test script to verify compatibility:

```python
import docker
import sys

client = docker.DockerClient(
    base_url="unix:///run/podman/podman.sock",
    version="auto"
)

tests = {
    "ping": lambda: client.ping(),
    "info": lambda: client.info(),
    "images_list": lambda: client.images.list(),
    "containers_list": lambda: client.containers.list(all=True),
    "volumes_list": lambda: client.volumes.list(),
    "networks_list": lambda: client.networks.list(),
}

passed = 0
failed = 0

for name, test_fn in tests.items():
    try:
        test_fn()
        print(f"  PASS: {name}")
        passed += 1
    except Exception as e:
        print(f"  FAIL: {name} - {e}")
        failed += 1

print(f"\nResults: {passed} passed, {failed} failed")
sys.exit(1 if failed > 0 else 0)
```

## Migration Strategy

When migrating from Docker to Podman:

1. **Start with the compat API**. Point your `DOCKER_HOST` to the Podman socket and test your existing tooling.
2. **Verify critical workflows**. Run your CI/CD pipelines and deployment scripts against Podman.
3. **Adopt rootless mode**. Switch to rootless Podman for improved security.
4. **Gradually migrate to the libpod API**. For Podman-specific features, update your code to use the native endpoints.

## Conclusion

Podman's Docker-compatible API layer makes the transition from Docker to Podman remarkably smooth. By pointing Docker SDKs at the Podman socket, you can often run your existing container management code, Docker Compose files, and CI/CD pipelines with little or no modification. This compatibility, combined with Podman's rootless operation and daemonless architecture, gives you the best of both worlds: proven Docker tooling with Podman's security and simplicity.
