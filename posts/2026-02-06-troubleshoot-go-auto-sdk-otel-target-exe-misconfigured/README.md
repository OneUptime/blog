# How to Troubleshoot Go Auto SDK Instrumentation Not Activating Because

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, Auto-Instrumentation, eBPF

Description: Troubleshoot Go auto-instrumentation issues caused by OTEL_GO_AUTO_TARGET_EXE pointing to the wrong binary or path.

OpenTelemetry Go auto-instrumentation (based on eBPF) is a powerful way to get tracing without modifying your application code. But it has a critical configuration requirement: the `OTEL_GO_AUTO_TARGET_EXE` environment variable must point to the exact binary that is running. If it does not match, the instrumentation agent cannot attach to the intended process.

## How Go Auto-Instrumentation Works

Unlike Java or Python auto-instrumentation that uses runtime hooks, Go auto-instrumentation uses eBPF to attach to the running process at the kernel level. The agent needs to know which binary to instrument. It uses `OTEL_GO_AUTO_TARGET_EXE` to find the target process.

The agent uses the executable path to locate the target process. If there is no match, the agent has nothing to attach to.

## Common Misconfiguration Scenarios

### Scenario 1: Path Does Not Match the Container Binary

Your Dockerfile builds the binary to `/app/server`, but you set the environment variable to `/server`:

```dockerfile
FROM golang:1.23 AS builder
WORKDIR /src
COPY . .
RUN go build -o /app/server ./cmd/server

FROM gcr.io/distroless/static
COPY --from=builder /app/server /app/server
# The binary is at /app/server in the container

```

```yaml
# Kubernetes deployment - WRONG
env:
- name: OTEL_GO_AUTO_TARGET_EXE
  value: "/server"  # Does not match /app/server
```

Fix: Make the path match exactly:

```yaml
env:
- name: OTEL_GO_AUTO_TARGET_EXE
  value: "/app/server"  # Matches the actual binary path
```

### Scenario 2: Using the Go Binary Name Instead of the Built Binary

If you run with `go run`, the actual binary is a temporary file in a temp directory:

```yaml
# WRONG: this is not how the process appears in /proc
env:
- name: OTEL_GO_AUTO_TARGET_EXE
  value: "main.go"
```

The `go run` command compiles to a temporary binary like `/tmp/go-build123456/b001/exe/main`. You should compile the binary first and run it directly.

### Scenario 3: Symlink or Wrapper Script

If your entrypoint is a shell script that launches the Go binary:

```bash
#!/bin/sh
# entrypoint.sh
exec /app/server "$@"
```

The process running is `/app/server`, not `entrypoint.sh`. Set `OTEL_GO_AUTO_TARGET_EXE` to `/app/server`.

## Debugging Steps

### Step 1: Find the Actual Binary Path

Exec into the container and check the running process:

```bash
# Find the PID of your Go process
kubectl exec -it <pod> -- ps aux

# Check what binary the process is running
kubectl exec -it <pod> -- readlink /proc/1/exe
```

The output of `readlink` is what `OTEL_GO_AUTO_TARGET_EXE` should be set to.

### Step 2: Check the Agent Logs

The auto-instrumentation agent logs to stdout. Look for messages about target process discovery:

```bash
kubectl logs <pod> -c opentelemetry-auto-instrumentation
```

For Operator-injected pods, use the injected Go auto-instrumentation sidecar name if it differs in your cluster. Look for messages about startup, target process discovery, or attach errors.

### Step 3: Verify eBPF Capabilities

The agent needs elevated privileges to use eBPF. If you use the OTel Operator, it injects the Go sidecar with the required security context. If you run the sidecar manually, configure it to run as root and privileged:

```yaml
securityContext:
  runAsUser: 0
  privileged: true
```

Without those permissions, the agent cannot attach even if it finds the process.

## Full Working Configuration

Here is a complete Kubernetes configuration that works:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-go-service
spec:
  template:
    metadata:
      annotations:
        # If using the OTel Operator, this annotation triggers injection
        instrumentation.opentelemetry.io/inject-go: "true"
        instrumentation.opentelemetry.io/otel-go-auto-target-exe: "/app/server"
    spec:
      # Go auto-instrumentation must be enabled in the OTel Operator feature gates
      containers:
      - name: app
        image: myregistry/my-go-service:latest
        # The binary must be at /app/server inside this container
```

If you are running the agent manually (not via the Operator):

```yaml
shareProcessNamespace: true
containers:
- name: app
  image: myregistry/my-go-service:latest
- name: otel-agent
  image: otel/autoinstrumentation-go:v0.24.0
  env:
  - name: OTEL_GO_AUTO_TARGET_EXE
    value: "/app/server"
  - name: OTEL_SERVICE_NAME
    value: "my-go-service"
  - name: OTEL_EXPORTER_OTLP_ENDPOINT
    value: "http://otel-collector:4318"
  securityContext:
    runAsUser: 0
    privileged: true
```

The `shareProcessNamespace: true` is critical. Without it, the agent container cannot see processes in the app container.

## Quick Checklist

1. Verify the binary path with `readlink /proc/<pid>/exe`
2. Set `OTEL_GO_AUTO_TARGET_EXE` to that exact path
3. Ensure `shareProcessNamespace: true` is set on the pod
4. Ensure the agent runs as root with `privileged: true`
5. Check agent logs for process discovery messages

Getting the binary path right is the most common fix. Everything else follows from there.
