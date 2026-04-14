# How to Debug Dapr Applications with Remote Debugging

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Remote Debugging, VS Code, Go, Kubernetes

Description: Learn how to attach a remote debugger to Dapr applications running in Docker or Kubernetes using VS Code, Delve, and port forwarding to debug live issues.

---

## Remote Debugging with Dapr

Remote debugging lets you set breakpoints and step through code running inside a container without rebuilding or redeploying. This is invaluable for reproducing bugs that only appear in integrated environments where Dapr sidecars and real components are present.

## Remote Debugging a Go Dapr Service

Build your Go app with debug symbols and start the Delve debugger:

```dockerfile
# Debug Dockerfile - NOT for production
FROM golang:1.22-alpine AS debugger
RUN go install github.com/go-delve/delve/cmd/dlv@latest
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -gcflags="all=-N -l" -o server ./cmd/server

EXPOSE 8080 2345
CMD ["dlv", "--listen=:2345", "--headless=true", "--api-version=2", "--accept-multiclient", "exec", "./server"]
```

Run with `dapr run`:

```bash
dapr run \
  --app-id order-service \
  --app-port 8080 \
  --components-path ./components \
  -- docker run -p 8080:8080 -p 2345:2345 order-service:debug
```

## Attaching VS Code to the Debugger

Create a `.vscode/launch.json` configuration:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Attach to Dapr Go Service",
      "type": "go",
      "debugAdapter": "dlv-dap",
      "request": "attach",
      "mode": "remote",
      "port": 2345,
      "host": "127.0.0.1",
      "substitutePath": [
        { "from": "${workspaceFolder}", "to": "/app" }
      ],
      "showLog": true,
      "trace": "verbose"
    }
  ]
}
```

Press F5 in VS Code to attach. You can now set breakpoints in your Go source files and they will be hit when the Dapr service handles requests.

## Remote Debugging on Kubernetes

For Kubernetes, forward the debug port from the pod to your local machine:

```bash
# Port forward the debug port
kubectl port-forward order-service-7b4c8d9f6-xk2pq 2345:2345 -n default
```

Then attach VS Code using the same `launch.json` configuration. Requests going through Dapr service invocation will trigger breakpoints in your local IDE.

## Remote Debugging a Node.js Dapr Service

Start the Node.js app with the inspector enabled:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY src/ ./src/
EXPOSE 3000 9229
CMD ["node", "--inspect=0.0.0.0:9229", "src/index.js"]
```

VS Code launch configuration:

```json
{
  "name": "Attach to Dapr Node Service",
  "type": "node",
  "request": "attach",
  "port": 9229,
  "address": "localhost",
  "localRoot": "${workspaceFolder}",
  "remoteRoot": "/app",
  "restart": true
}
```

Forward the port from Kubernetes:

```bash
kubectl port-forward svc/order-service 9229:9229 -n default
```

## Remote Debugging a Python Dapr Service

Use `debugpy` for Python remote debugging:

```python
import debugpy
debugpy.listen(("0.0.0.0", 5678))
print("Waiting for debugger to attach...")
debugpy.wait_for_client()

from fastapi import FastAPI
# ... rest of app
```

VS Code configuration:

```json
{
  "name": "Attach to Dapr Python Service",
  "type": "debugpy",
  "request": "attach",
  "connect": {
    "host": "localhost",
    "port": 5678
  },
  "pathMappings": [
    {"localRoot": "${workspaceFolder}", "remoteRoot": "/app"}
  ]
}
```

## Summary

Remote debugging Dapr applications requires building a debug image with the appropriate debugger (Delve for Go, Node inspector, debugpy for Python), exposing the debug port, and using `kubectl port-forward` to bridge it to your local machine. VS Code connects to the forwarded port and you can set breakpoints, inspect variables, and step through code that is running with real Dapr sidecars and components - the most authentic debugging environment possible.
