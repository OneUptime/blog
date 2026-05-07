# How to Connect to Podman with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Python, SDK, Connection, API

Description: Learn how to establish connections to Podman from Python using the Podman Python SDK, including local sockets, remote connections, SSH tunnels, and connection management best practices.

---

> Connecting to Podman from Python opens the door to full container automation. Whether you are working locally or managing remote hosts, the SDK provides flexible connection options for every scenario.

The Podman Python SDK uses the Podman REST API to communicate with the Podman service. Understanding how to configure and manage connections is essential for building reliable container automation. This guide covers every connection method available, from local Unix sockets to remote SSH connections.

---

## The PodmanClient Object

The `PodmanClient` class is your primary entry point for interacting with Podman. It manages the connection and provides access to all container, image, volume, and network operations.

### Default Connection

The simplest way to connect is to use the default settings, which connect to the local Podman socket:

```python
from podman import PodmanClient

client = PodmanClient()
print(client.version())
client.close()
```

On a typical rootless Linux setup, this connects to the Podman socket under `$XDG_RUNTIME_DIR`, such as `http+unix:///run/user/{uid}/podman/podman.sock`, by default.

### Using a Context Manager

The recommended approach is to use a context manager, which ensures the connection is properly closed when you are done:

```python
from podman import PodmanClient

with PodmanClient() as client:
    version = client.version()
    print(f"Podman version: {version['Version']}")
    print(f"API version: {version['ApiVersion']}")
```

The context manager calls `client.close()` automatically when the `with` block exits, even if an exception occurs.

## Connecting to a Specific Socket

You can specify the exact socket path using the `base_url` parameter:

```python
from podman import PodmanClient

# Connect to rootless socket explicitly

with PodmanClient(base_url="unix:///run/user/1000/podman/podman.sock") as client:
    print(client.version())
```

For rootful Podman:

```python
from podman import PodmanClient

# Connect to root socket (requires root privileges)
with PodmanClient(base_url="unix:///run/podman/podman.sock") as client:
    print(client.version())
```

### Dynamic Socket Path

To dynamically determine the socket path based on the current user:

```python
import os
from podman import PodmanClient

uid = os.getuid()
socket_path = f"unix:///run/user/{uid}/podman/podman.sock"

with PodmanClient(base_url=socket_path) as client:
    info = client.info()
    print(f"Host: {info['host']['hostname']}")
    print(f"OS: {info['host']['os']}")
```

## Remote Connections via SSH

Podman supports remote connections over SSH, which is useful for managing containers on remote servers:

```python
from podman import PodmanClient

# Connect to a remote Podman instance via SSH
remote_uri = "ssh://user@remote-host:22/run/user/1000/podman/podman.sock"

with PodmanClient(base_url=remote_uri) as client:
    containers = client.containers.list()
    print(f"Remote containers: {len(containers)}")
```

### SSH with Identity File

For SSH connections using key-based authentication:

```python
from podman import PodmanClient

remote_uri = "ssh://user@remote-host:22/run/user/1000/podman/podman.sock"
identity_file = "/home/user/.ssh/id_rsa"

with PodmanClient(
    base_url=remote_uri,
    identity=identity_file
) as client:
    print(client.version())
```

## Connecting via TCP

For environments where the Podman API is exposed over TCP:

```python
from podman import PodmanClient

# Connect via TCP
with PodmanClient(base_url="tcp://localhost:8080") as client:
    print(client.version())
```

To start Podman listening on a TCP port:

```bash
podman system service --time=0 tcp://localhost:8080
```

Note that TCP connections without TLS are not encrypted and should only be used in trusted networks or for local development.

## Connection Health Checks

Always verify the connection before performing operations. The SDK provides a `ping` method for quick health checks:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # Quick health check
    is_alive = client.ping()
    print(f"Podman is alive: {is_alive}")

    # Detailed system info
    info = client.info()
    print(f"Containers: {info['store']['containerStore']['number']}")
    print(f"Images: {info['store']['imageStore']['number']}")
```

## Handling Connection Errors

Robust applications should handle connection failures gracefully:

```python
from podman import PodmanClient
from podman.errors import APIError
import requests

def get_podman_client(base_url=None):
    """Create a Podman client with error handling."""
    try:
        kwargs = {}
        if base_url:
            kwargs["base_url"] = base_url

        client = PodmanClient(**kwargs)
        # Verify the connection works
        client.ping()
        return client
    except requests.exceptions.ConnectionError:
        print("Error: Cannot connect to Podman. Is the socket running?")
        print("Try: systemctl --user start podman.socket")
        return None
    except APIError as e:
        print(f"API Error: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

# Usage
client = get_podman_client()
if client:
    with client:
        print(client.version())
else:
    print("Failed to connect to Podman")
```

## Connection Timeout Configuration

For environments where the Podman service may be slow to respond, configure timeouts:

```python
from podman import PodmanClient

with PodmanClient(timeout=30) as client:
    # Operations will timeout after 30 seconds
    print(client.version())
```

For more granular control:

```python
from podman import PodmanClient

# Set different timeouts for connect and read operations
with PodmanClient(timeout=(5, 30)) as client:
    # 5 seconds to connect, 30 seconds to read
    print(client.version())
```

## Creating a Reusable Connection Wrapper

For larger projects, create a wrapper class that manages the connection lifecycle:

```python
from podman import PodmanClient
from podman.errors import APIError
import logging

logger = logging.getLogger(__name__)

class PodmanConnection:
    """Manages Podman client connections with retry and logging."""

    def __init__(self, base_url=None, timeout=30):
        self.base_url = base_url
        self.timeout = timeout
        self._client = None

    def connect(self):
        """Establish connection to Podman."""
        kwargs = {"timeout": self.timeout}
        if self.base_url:
            kwargs["base_url"] = self.base_url

        self._client = PodmanClient(**kwargs)

        # Verify connection
        if not self._client.ping():
            raise ConnectionError("Podman ping failed")

        version = self._client.version()
        logger.info(f"Connected to Podman {version['Version']}")
        return self

    @property
    def client(self):
        """Get the active client, connecting if necessary."""
        if self._client is None:
            self.connect()
        return self._client

    def close(self):
        """Close the connection."""
        if self._client:
            self._client.close()
            self._client = None
            logger.info("Disconnected from Podman")

    def __enter__(self):
        return self.connect()

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
        return False

# Usage
with PodmanConnection() as conn:
    client = conn.client
    containers = client.containers.list()
    print(f"Found {len(containers)} containers")
```

## Environment-Based Configuration

Configure connections using environment variables for flexibility across environments:

```python
import os
from podman import PodmanClient

def create_client_from_env():
    """Create a Podman client from environment variables."""
    base_url = os.environ.get("CONTAINER_HOST")
    identity = os.environ.get("CONTAINER_SSHKEY")
    timeout = int(os.environ.get("PODMAN_TIMEOUT", "30"))

    kwargs = {"timeout": timeout}
    if base_url:
        kwargs["base_url"] = base_url
    if identity:
        kwargs["identity"] = identity

    return PodmanClient(**kwargs)

# Set environment variables before running:
# export CONTAINER_HOST=ssh://user@host/run/user/1000/podman/podman.sock
# export CONTAINER_SSHKEY=/home/user/.ssh/id_rsa

with create_client_from_env() as client:
    print(client.version())
```

## Inspecting the Connection

For debugging, inspect the connection details:

```python
from podman import PodmanClient

with PodmanClient() as client:
    # System information
    info = client.info()

    print(f"Hostname: {info['host']['hostname']}")
    print(f"Kernel: {info['host']['kernel']}")
    print(f"OS: {info['host']['os']}")
    print(f"Arch: {info['host']['arch']}")
    print(f"CPUs: {info['host']['cpus']}")
    print(f"Memory: {info['host']['memTotal']}")
    print(f"Rootless: {info['host']['security']['rootless']}")
```

## Conclusion

The Podman Python SDK provides multiple ways to connect to Podman services, from simple local sockets to remote SSH connections. Using context managers ensures clean connection lifecycle management, and proper error handling makes your automation scripts resilient. With a solid connection established, you can move on to managing containers, images, and other resources programmatically.
