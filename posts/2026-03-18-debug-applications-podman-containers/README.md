# How to Debug Applications Inside Podman Containers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Debugging, Container, Development, Troubleshooting

Description: A practical guide to debugging applications running inside Podman containers, covering remote debuggers, log inspection, interactive shells, and network troubleshooting.

---

> Debugging inside containers requires a different approach than local debugging, but Podman provides the tools to make it straightforward once you know the right techniques.

Containers isolate your application from the host system, which is great for consistency but can make debugging harder. When something goes wrong inside a Podman container, you need to know how to inspect logs, attach debuggers, examine the filesystem, and trace network traffic. This post covers practical debugging techniques for applications running in Podman containers, with examples for Python, Node.js, Java, and Go.

---

## Inspecting Container Logs

The first step in debugging any containerized application is checking its output logs. Podman captures everything written to stdout and stderr.

```bash
# View logs from a running container

podman logs my-container

# Follow logs in real time (like tail -f)
podman logs -f my-container

# Show only the last 50 lines
podman logs --tail 50 my-container

# Show logs with timestamps
podman logs -t my-container

# Show logs since a specific time
podman logs --since 2026-03-18T10:00:00 my-container
```

For containers that have already exited, you can still view their logs as long as the container has not been removed:

```bash
# List all containers, including stopped ones
podman ps -a

# View logs from a stopped container
podman logs <container-id>
```

## Getting a Shell Inside a Running Container

Opening an interactive shell inside a container lets you inspect files, check environment variables, and run diagnostic commands:

```bash
# Open a bash shell inside a running container
podman exec -it my-container /bin/bash

# If bash is not available, use sh
podman exec -it my-container /bin/sh

# Run a single command without an interactive shell
podman exec my-container cat /etc/os-release

# Check environment variables
podman exec my-container env

# Inspect the filesystem
podman exec my-container ls -la /app/

# Check running processes
podman exec my-container ps aux
```

## Remote Debugging with Python

Python's `debugpy` library lets you attach a remote debugger to a Python application running inside a container. First, add `debugpy` to your container image:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Install the debug adapter
RUN pip install debugpy
COPY . .
CMD ["python", "app.py"]
```

Modify your application entry point to start the debug server:

```python
# app.py
import debugpy

# Listen for debugger connections on port 5678
# Allow connections from any host (needed for container networking)
debugpy.listen(("0.0.0.0", 5678))

# Uncomment the next line to pause execution until a debugger attaches
# debugpy.wait_for_client()

print("Debug server listening on port 5678")

# Your application code follows
from flask import Flask
app = Flask(__name__)

@app.route("/")
def hello():
    # Set breakpoints in your IDE on lines like this
    message = "Hello from inside the container"
    return message

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
```

Run the container with the debug port exposed:

```bash
# Run the container and expose both the app port and debug port
podman run -d \
  --name python-debug \
  -p 8000:8000 \
  -p 5678:5678 \
  -v ./src:/app/src:Z \
  my-python-app
```

In VS Code, create a launch configuration to attach to the remote debugger:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Podman Container",
      "type": "debugpy",
      "request": "attach",
      "connect": {
        "host": "localhost",
        "port": 5678
      },
      "pathMappings": [
        {
          "localRoot": "${workspaceFolder}/src",
          "remoteRoot": "/app/src"
        }
      ]
    }
  ]
}
```

## Remote Debugging with Node.js

Node.js has a built-in inspector that you can enable with the `--inspect` flag:

```dockerfile
FROM node:24-bookworm-slim
WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
# Start Node with the inspector enabled and bound to all interfaces
CMD ["node", "--inspect=0.0.0.0:9229", "server.js"]
```

Run the container with the debug port exposed:

```bash
# Run with the inspector port published
podman run -d \
  --name node-debug \
  -p 3000:3000 \
  -p 9229:9229 \
  -v ./src:/app/src:Z \
  my-node-app
```

Connect with VS Code using this launch configuration:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Node in Container",
      "type": "node",
      "request": "attach",
      "address": "localhost",
      "port": 9229,
      "localRoot": "${workspaceFolder}/src",
      "remoteRoot": "/app/src",
      "restart": true
    }
  ]
}
```

You can also open Chrome DevTools by navigating to `chrome://inspect` in Chrome and clicking the inspect link for your container.

## Remote Debugging with Java

Java supports remote debugging through the JDWP (Java Debug Wire Protocol). Pass the debug options when starting your application:

```dockerfile
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY target/myapp.jar .
# Enable JDWP debugging on port 5005
CMD ["java", \
  "-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005", \
  "-jar", "myapp.jar"]
```

```bash
# Run the container with the debug port exposed
podman run -d \
  --name java-debug \
  -p 8080:8080 \
  -p 5005:5005 \
  my-java-app
```

In IntelliJ IDEA, create a **Remote JVM Debug** run configuration pointing to `localhost:5005`.

## Remote Debugging with Go

Go applications compiled with debug symbols can be debugged remotely using Delve:

```dockerfile
FROM golang:1.26-bookworm AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Build with debug symbols (disable optimizations)
RUN CGO_ENABLED=0 go build -gcflags="all=-N -l" -o server .

FROM golang:1.26-bookworm
# Install Delve debugger
RUN go install github.com/go-delve/delve/cmd/dlv@latest
WORKDIR /app
COPY --from=builder /app/server .
# Start the app through Delve
CMD ["dlv", "--listen=:2345", "--headless=true", "--api-version=2", \
  "--accept-multiclient", "exec", "./server"]
```

```bash
# Run with the Delve port exposed
podman run -d \
  --name go-debug \
  -p 8080:8080 \
  -p 2345:2345 \
  --security-opt=seccomp=unconfined \
  my-go-app
```

Note the `--security-opt=seccomp=unconfined` flag. Delve uses `ptrace` to control the debugged process, which is blocked by the default seccomp profile.

## Network Debugging

When your containerized application has networking issues, Podman provides several ways to inspect network behavior:

```bash
# Inspect the container's network configuration
podman inspect --format '{{json .NetworkSettings}}' my-container | python3 -m json.tool

# Check which ports are mapped
podman port my-container

# Test connectivity from inside the container
podman exec my-container curl -v http://localhost:8080/health

# Install and use network tools inside the container
podman exec my-container bash -c "apt-get update && apt-get install -y iproute2 dnsutils"
podman exec my-container ss -tlnp
podman exec my-container nslookup some-service

# Check if containers on the same pod/network can communicate
podman network ls
podman network inspect my-network
```

## Inspecting Container State

Podman provides several commands to examine the full state of a container:

```bash
# View the complete container configuration and state
podman inspect my-container

# Check resource usage (CPU, memory, network I/O)
podman stats my-container

# See the processes running inside the container
podman top my-container

# View filesystem changes made since the container started
podman diff my-container

# Export the container's filesystem for offline analysis
podman export my-container -o container-fs.tar
```

## Using Podman Events for Debugging

Podman records events for container lifecycle changes, which can help identify issues like unexpected restarts:

```bash
# Stream all Podman events in real time
podman events

# Filter events for a specific container
podman events --filter container=my-container

# Show only specific event types
podman events --filter event=died --filter event=start

# Show events from the last hour
podman events --since 1h
```

## Debugging Container Startup Failures

When a container exits immediately after starting, use these techniques to find out why:

```bash
# Check the exit code
podman inspect --format '{{.State.ExitCode}}' my-container

# Override the entrypoint to get a shell and debug manually
podman run -it --entrypoint /bin/bash my-image

# Run the container in the foreground to see output directly
podman run --rm -it my-image

# Check if the image has the expected files
podman run --rm my-image ls -la /app/

# Verify environment variables are set correctly
podman run --rm my-image env
```

## Conclusion

Debugging containerized applications with Podman follows the same general patterns as Docker: expose debug ports, attach remote debuggers, and use `exec` to inspect running containers. The key details to remember are publishing the debug port when starting the container, mapping source paths correctly between host and container, and using `--security-opt=seccomp=unconfined` when your debugger needs `ptrace` access. With these techniques, you can debug applications inside Podman containers as effectively as you would on your local machine.
