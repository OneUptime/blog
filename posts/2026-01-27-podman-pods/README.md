# How to Use Podman Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Containers, DevOps, Kubernetes, Pods, Linux, Docker Alternative

Description: A comprehensive guide to using Podman pods for grouping containers, sharing namespaces, and achieving Kubernetes-compatible container orchestration on your local machine.

---

> "The unit of deployment should be the unit of scaling." - Kelsey Hightower

Podman pods bring Kubernetes-style container grouping to your local development environment. Unlike Docker, which treats containers as standalone units, Podman natively supports pods - groups of containers that share resources and can be deployed together. This guide covers everything you need to know about creating, managing, and leveraging pods in Podman.

## What Is a Podman Pod?

A pod in Podman is a group of one or more containers that share the same network namespace, IPC namespace, and optionally other namespaces. This concept comes directly from Kubernetes, making Podman an excellent choice for developing cloud-native applications locally.

```mermaid
graph TB
    subgraph "Podman Pod"
        INF[Infra Container<br/>pause]
        subgraph "Shared Namespaces"
            NET[Network Namespace<br/>localhost communication]
            IPC[IPC Namespace<br/>shared memory]
            PID[PID Namespace<br/>optional]
        end
        C1[Container 1<br/>Web App]
        C2[Container 2<br/>Sidecar]
        C3[Container 3<br/>Log Collector]

        INF --> NET
        INF --> IPC
        INF --> PID
        C1 --> NET
        C2 --> NET
        C3 --> NET
    end
```

### Key Characteristics of Pods

- **Shared network namespace**: All containers in a pod share the same IP address and port space
- **Localhost communication**: Containers can communicate via `localhost`
- **Infra container**: Every pod has a hidden "pause" container that holds namespaces
- **Atomic deployment**: Containers in a pod start and stop together
- **Kubernetes compatibility**: Pod definitions can be exported to Kubernetes YAML

## Creating Your First Pod

### Basic Pod Creation

```bash
# Create an empty pod named "my-app"
# The pod is created with a pause container that holds the namespaces
podman pod create --name my-app

# List all pods to verify creation
# Shows POD ID, NAME, STATUS, CREATED time, and container count
podman pod ls

# Expected output:
# POD ID        NAME     STATUS   CREATED        INFRA ID      # OF CONTAINERS
# a1b2c3d4e5f6  my-app   Created  5 seconds ago  f6e5d4c3b2a1  1
```

### Creating Pods with Port Mappings

```bash
# Create a pod with published ports
# IMPORTANT: Ports must be defined at the pod level, not container level
# -p 8080:80 maps host port 8080 to container port 80
# -p 5432:5432 maps PostgreSQL port for database access
podman pod create --name web-stack \
    --publish 8080:80 \
    --publish 5432:5432

# All containers in this pod will share these port mappings
# Container 1 can listen on port 80
# Container 2 can listen on port 5432
```

### Creating Pods with Resource Limits

```bash
# Create a pod with memory and CPU limits
# These limits apply to the entire pod, shared among all containers
# --cpus limits CPU usage to 2 cores
# --memory limits total memory to 2 gigabytes
podman pod create --name limited-pod \
    --cpus 2 \
    --memory 2g \
    --publish 3000:3000
```

## Adding Containers to Pods

Once you have a pod, you can add containers to it. Containers in the same pod share the network namespace, enabling localhost communication.

### Adding a Web Application Container

```bash
# Create a pod for a web application stack
podman pod create --name webapp --publish 8080:80 --publish 6379:6379

# Add an nginx container to the pod
# The --pod flag specifies which pod this container joins
# Container inherits the pod's network namespace automatically
podman run -d --pod webapp \
    --name webapp-nginx \
    nginx:alpine

# Add a redis container to the same pod
# Redis and nginx share the same network namespace
# They can communicate via localhost without any network configuration
podman run -d --pod webapp \
    --name webapp-redis \
    redis:alpine

# Verify both containers are in the pod
# --pod flag shows which pod each container belongs to
podman pod ps
podman ps --pod
```

### Localhost Communication Between Containers

```bash
# Inside the nginx container, redis is accessible via localhost
# This demonstrates the shared network namespace in action
podman exec webapp-nginx sh -c "apk add --no-cache redis && redis-cli -h localhost ping"
# Output: PONG

# This works because both containers share the same network namespace
# No need for container linking, DNS resolution, or custom networks
# Containers communicate as if they were processes on the same machine
```

## Pod Architecture Deep Dive

### Understanding the Infra Container

Every pod has an infrastructure (infra) container that maintains the shared namespaces. This container runs a minimal "pause" process that does nothing but hold the namespaces open.

```mermaid
flowchart TD
    subgraph POD["Pod: my-app"]
        INFRA["Infra Container (pause)<br/>- Holds namespaces<br/>- First to start<br/>- Last to stop"]

        subgraph SHARED["Shared Resources"]
            NS_NET["Network Namespace<br/>IP: 10.88.0.5"]
            NS_IPC["IPC Namespace"]
            NS_UTS["UTS Namespace"]
        end

        APP["App Container<br/>Port 8080"]
        SIDECAR["Sidecar Container<br/>Port 9090"]

        INFRA --> NS_NET
        INFRA --> NS_IPC
        INFRA --> NS_UTS

        APP -.->|joins| NS_NET
        SIDECAR -.->|joins| NS_NET
    end

    CLIENT["External Client"] -->|"localhost:8080"| NS_NET
```

### Inspecting Pod Namespaces

```bash
# Create a test pod to examine namespace sharing
podman pod create --name ns-demo

# Add a container to the pod
podman run -d --pod ns-demo --name ns-demo-app alpine sleep infinity

# Inspect the pod to see namespace configuration
# Returns detailed JSON with container IDs and network settings
podman pod inspect ns-demo | jq '.Containers'

# Check that containers share the network namespace
# The SandboxKey shows the network namespace path
podman inspect ns-demo-app --format '{{.NetworkSettings.SandboxKey}}'
```

## Shared Namespaces Explained

Podman pods support sharing multiple Linux namespaces between containers. Understanding these namespaces is key to leveraging pods effectively.

### Network Namespace Sharing

```bash
# All containers in a pod share the same network stack
# This means:
# - Same IP address for all containers
# - Same port space (containers cannot bind to the same port)
# - Can communicate via localhost
# - Share routing tables and firewall rules

# Example: App container calling sidecar on localhost
podman pod create --name net-demo --publish 8080:8080

# Main app listens on port 8080
podman run -d --pod net-demo --name main-app \
    python:3.11-slim \
    python -c "
import http.server
import socketserver

# Simple HTTP server that responds to all requests
class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'Hello from main app!')

with socketserver.TCPServer(('', 8080), Handler) as httpd:
    httpd.serve_forever()
"

# Sidecar can access main app via localhost
# No network configuration needed - they share the namespace
podman run --pod net-demo --name sidecar \
    curlimages/curl \
    curl -s localhost:8080
# Output: Hello from main app!
```

### IPC Namespace Sharing

```bash
# IPC namespace sharing enables shared memory between containers
# Useful for high-performance inter-process communication
# Applications can use POSIX shared memory, message queues, and semaphores

podman pod create --name ipc-demo --share ipc

# Producer container creates shared memory segment
podman run -d --pod ipc-demo --name producer alpine sh -c "
    # Create a POSIX shared memory segment
    # This file will be visible to other containers in the pod
    echo 'Shared data from producer' > /dev/shm/shared-data
    sleep infinity
"

# Consumer container reads the shared memory
# This demonstrates IPC namespace sharing
podman run --pod ipc-demo --name consumer alpine sh -c "
    cat /dev/shm/shared-data
"
# Output: Shared data from producer
```

### PID Namespace Sharing

```bash
# PID namespace sharing lets containers see each other's processes
# Enable with --share pid flag
# Useful for process monitoring, debugging, and init systems

podman pod create --name pid-demo --share pid

# Start a process in container 1
podman run -d --pod pid-demo --name pid-app1 alpine sh -c "
    echo 'Process in container 1'
    sleep infinity
"

# Container 2 can see container 1's processes
# ps aux shows processes from ALL containers in the pod
podman run --pod pid-demo --name pid-app2 alpine ps aux
# Output shows processes from both containers including sleep infinity
```

### Configuring Shared Namespaces

```bash
# By default, pods share: ipc, net, uts
# You can customize namespace sharing with --share flag

# Share only network namespace (minimal sharing)
podman pod create --name minimal-share --share net

# Share all namespaces including PID (maximum sharing)
podman pod create --name full-share --share ipc,net,uts,pid

# Share nothing (containers are isolated except for pod membership)
# Useful when you only want pod lifecycle management
podman pod create --name no-share --share none
```

## Real-World Pod Patterns

### Pattern 1: Web Application with Database

```bash
# Create a pod for a complete web application stack
# This pattern is common for local development environments
podman pod create --name fullstack \
    --publish 3000:3000 \
    --publish 5432:5432

# Add PostgreSQL database
# The database listens on localhost:5432 within the pod
podman run -d --pod fullstack \
    --name fullstack-db \
    -e POSTGRES_USER=app \
    -e POSTGRES_PASSWORD=secret \
    -e POSTGRES_DB=myapp \
    postgres:15-alpine

# Add Node.js application
# DATABASE_URL uses localhost because of shared network namespace
# No need for container names or service discovery
podman run -d --pod fullstack \
    --name fullstack-app \
    -e DATABASE_URL=postgresql://app:secret@localhost:5432/myapp \
    -e NODE_ENV=development \
    node:20-alpine \
    sh -c "npm install && npm start"
```

### Pattern 2: Sidecar Logging

The sidecar pattern is a powerful way to handle cross-cutting concerns like logging, monitoring, and proxying.

```mermaid
flowchart LR
    subgraph POD["Pod: app-with-logging"]
        APP["Application<br/>Writes to /var/log/app"]
        SIDECAR["Log Sidecar<br/>Reads from /var/log/app"]
        VOL[("Shared Volume<br/>/var/log/app")]

        APP -->|writes| VOL
        SIDECAR -->|reads| VOL
    end

    SIDECAR -->|ships logs| EXT["Log Aggregator<br/>(OneUptime, ELK, etc.)"]
```

```bash
# Create pod with shared volume for logs
podman pod create --name app-logging --publish 8080:8080

# Create shared volume for log files
podman volume create app-logs

# Run application that writes logs to shared volume
# The :Z suffix handles SELinux labeling automatically
podman run -d --pod app-logging \
    --name app-logging-main \
    -v app-logs:/var/log/app:Z \
    alpine sh -c "
        while true; do
            echo \"\$(date): Application heartbeat\" >> /var/log/app/app.log
            sleep 5
        done
    "

# Run log sidecar that processes and ships logs
# Uses :ro for read-only access to prevent accidental writes
podman run -d --pod app-logging \
    --name app-logging-sidecar \
    -v app-logs:/var/log/app:ro,Z \
    alpine sh -c "
        tail -f /var/log/app/app.log | while read line; do
            echo \"[SIDECAR] \$line\"
            # In production, ship to OneUptime or other log aggregators
        done
    "

# View sidecar output to verify log shipping
podman logs -f app-logging-sidecar
```

### Pattern 3: Ambassador Pattern

The ambassador pattern uses a proxy container to handle external communication, providing features like TLS termination, authentication, and rate limiting.

```bash
# Ambassador pattern: Proxy container handles external communication
podman pod create --name ambassador-demo --publish 8080:8080

# Main application (internal only, not directly exposed)
podman run -d --pod ambassador-demo \
    --name ambassador-app \
    nginx:alpine

# Ambassador proxy handles TLS termination, auth, rate limiting, etc.
# All external traffic goes through Envoy first
podman run -d --pod ambassador-demo \
    --name ambassador-proxy \
    envoyproxy/envoy:v1.28-latest
```

## Managing Pod Lifecycle

### Starting and Stopping Pods

```bash
# Stop all containers in a pod gracefully
# Sends SIGTERM to containers, then SIGKILL after timeout
podman pod stop my-app

# Start all containers in a pod
# Containers start in creation order
podman pod start my-app

# Restart all containers in a pod
# Equivalent to stop followed by start
podman pod restart my-app

# Pause all containers (freeze processes without terminating)
# Useful for debugging or resource management
podman pod pause my-app

# Unpause containers (resume frozen processes)
podman pod unpause my-app
```

### Inspecting Pods

```bash
# Get detailed pod information in JSON format
# Includes network settings, container IDs, and namespace configuration
podman pod inspect my-app

# Get pod information in specific format using Go templates
podman pod inspect my-app --format '{{.Name}} has {{.NumContainers}} containers'

# List containers in a pod with their status
podman ps --filter pod=my-app

# Get pod resource usage statistics (CPU, memory, network I/O)
podman pod stats my-app
```

### Removing Pods

```bash
# Remove a stopped pod and all its containers
podman pod rm my-app

# Force remove a running pod (stops containers first)
# Use with caution - does not allow graceful shutdown
podman pod rm -f my-app

# Remove all pods on the system
podman pod rm --all

# Prune unused pods (removes pods with no running containers)
podman pod prune
```

## Kubernetes Pod Compatibility

One of Podman's most powerful features is native Kubernetes YAML support. You can export pods to Kubernetes manifests and import Kubernetes YAML to create pods.

### Exporting Pods to Kubernetes YAML

```bash
# Create a pod with multiple containers
podman pod create --name k8s-export --publish 80:80 --publish 6379:6379
podman run -d --pod k8s-export --name k8s-export-web nginx:alpine
podman run -d --pod k8s-export --name k8s-export-cache redis:alpine

# Export to Kubernetes YAML
# This generates a Pod manifest compatible with kubectl apply
podman generate kube k8s-export > k8s-export.yaml
```

The generated YAML is fully compatible with Kubernetes:

```yaml
# Generated Kubernetes YAML from Podman pod
# This manifest can be applied directly to any Kubernetes cluster
apiVersion: v1
kind: Pod
metadata:
  name: k8s-export
  labels:
    app: k8s-export
spec:
  containers:
    # Web server container configuration
    - name: k8s-export-web
      image: docker.io/library/nginx:alpine
      ports:
        - containerPort: 80
          hostPort: 80
          protocol: TCP
      resources: {}
    # Cache container configuration
    - name: k8s-export-cache
      image: docker.io/library/redis:alpine
      ports:
        - containerPort: 6379
          hostPort: 6379
          protocol: TCP
      resources: {}
  restartPolicy: Always
```

### Importing Kubernetes YAML

```bash
# Create a Kubernetes pod manifest file
cat <<EOF > my-k8s-pod.yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-k8s-app
  labels:
    app: my-k8s-app
spec:
  containers:
    - name: web
      image: nginx:alpine
      ports:
        - containerPort: 80
    - name: api
      image: python:3.11-slim
      command: ["python", "-m", "http.server", "8000"]
      ports:
        - containerPort: 8000
EOF

# Import and run the pod in Podman
# podman play kube reads Kubernetes YAML and creates equivalent pods
podman play kube my-k8s-pod.yaml

# List the created pod
podman pod ps

# Stop and remove pods created from YAML
# The --down flag tears down all resources created by play kube
podman play kube --down my-k8s-pod.yaml
```

### Kubernetes Development Workflow

```mermaid
flowchart LR
    subgraph LOCAL["Local Development"]
        DEV["Developer Machine"]
        POD["Podman Pod"]
        TEST["Local Testing"]
    end

    subgraph EXPORT["Export Phase"]
        GEN["podman generate kube"]
        YAML["Kubernetes YAML"]
    end

    subgraph K8S["Kubernetes Cluster"]
        DEPLOY["kubectl apply"]
        PROD["Production Pod"]
    end

    DEV -->|develop| POD
    POD -->|test| TEST
    TEST -->|"podman generate kube"| GEN
    GEN --> YAML
    YAML -->|"kubectl apply -f"| DEPLOY
    DEPLOY --> PROD
```

```bash
# Complete workflow example: develop locally, deploy to Kubernetes

# 1. Develop locally with Podman pods
podman pod create --name dev-app --publish 8080:80

podman run -d --pod dev-app \
    --name dev-app-web \
    -v ./src:/usr/share/nginx/html:Z \
    nginx:alpine

# 2. Test locally using curl or browser
curl localhost:8080

# 3. Export to Kubernetes YAML when ready
podman generate kube dev-app > deployment.yaml

# 4. Apply to Kubernetes cluster
kubectl apply -f deployment.yaml

# 5. Verify deployment
kubectl get pods
```

## Pod Networking Deep Dive

### Default Pod Networking

```bash
# Pods use CNI (Container Network Interface) by default
# Each pod gets its own IP address on the podman network

# Create a pod and check its IP address
podman pod create --name net-test
podman run -d --pod net-test --name net-test-app alpine sleep infinity

# Get pod IP address by inspecting the infra container
podman pod inspect net-test --format '{{.InfraContainerID}}' | \
    xargs podman inspect --format '{{.NetworkSettings.IPAddress}}'
```

### Pod-to-Pod Communication

```bash
# Create two pods that need to communicate
podman pod create --name frontend --publish 3000:3000
podman pod create --name backend --publish 5000:5000

# Add containers to each pod
podman run -d --pod frontend --name frontend-app \
    -e BACKEND_URL=http://$(podman pod inspect backend --format '{{.InfraContainerID}}' | \
    xargs podman inspect --format '{{.NetworkSettings.IPAddress}}'):5000 \
    node:alpine

podman run -d --pod backend --name backend-app python:alpine

# Alternative: Use host networking mode for simpler pod-to-pod communication
# This shares the host's network namespace with all containers
podman pod create --name frontend-host --network host
```

### DNS Resolution in Pods

```bash
# Containers in a pod share DNS configuration
# Custom DNS servers and search domains are set at pod level
podman pod create --name dns-demo \
    --dns 8.8.8.8 \
    --dns-search example.com

# Verify DNS configuration inside a container
podman run --pod dns-demo alpine cat /etc/resolv.conf
# Shows configured DNS servers and search domains
```

## Advanced Pod Features

### Health Checks for Containers in Pods

```bash
# Add health checks to containers for better lifecycle management
# Health checks run periodically to verify container health
podman run -d --pod webapp \
    --name webapp-healthy \
    --health-cmd "curl -f http://localhost:80/health || exit 1" \
    --health-interval 10s \
    --health-retries 3 \
    --health-timeout 5s \
    --health-start-period 30s \
    nginx:alpine

# Manually run health check
podman healthcheck run webapp-healthy

# Check health status
podman inspect webapp-healthy --format '{{.State.Health.Status}}'
```

### Resource Management

```bash
# Set resource limits at pod level
# Limits are shared among all containers in the pod
podman pod create --name resource-limited \
    --cpus 2.5 \
    --memory 4g \
    --memory-swap 4g

# Or set limits per container within the pod
# Container limits must not exceed pod limits
podman run -d --pod resource-limited \
    --name cpu-intensive \
    --cpus 1.5 \
    --memory 2g \
    stress-ng --cpu 2

podman run -d --pod resource-limited \
    --name memory-intensive \
    --cpus 1.0 \
    --memory 2g \
    stress-ng --vm 1 --vm-bytes 1g
```

### Init Containers Pattern

```bash
# Simulate Kubernetes init containers
# Init containers run first and must complete before main containers start

# Create pod
podman pod create --name with-init --publish 8080:80

# Run init container (blocks until prerequisite is ready)
# This pattern is useful for database migrations, config setup, etc.
podman run --pod with-init --name init-db-wait \
    busybox sh -c "
        echo 'Waiting for database...'
        sleep 5
        echo 'Database ready!'
    "

# After init completes successfully, start main container
podman run -d --pod with-init --name main-app nginx:alpine
```

## Monitoring Pods with OneUptime

When deploying containerized applications, comprehensive monitoring is essential. [OneUptime](https://oneuptime.com) provides observability for your container infrastructure, including metrics, logs, and traces.

### Container Monitoring Setup

```bash
# Create a pod with OneUptime telemetry sidecar
# The sidecar collects and ships telemetry data to OneUptime
podman pod create --name monitored-app \
    --publish 8080:8080 \
    --publish 4317:4317

# Main application with OpenTelemetry instrumentation
podman run -d --pod monitored-app \
    --name monitored-app-main \
    -e OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317 \
    -e OTEL_SERVICE_NAME=my-app \
    my-instrumented-app:latest

# OpenTelemetry collector sidecar shipping to OneUptime
podman run -d --pod monitored-app \
    --name monitored-app-otel \
    -e ONEUPTIME_OTLP_ENDPOINT=https://otlp.oneuptime.com \
    -e ONEUPTIME_API_KEY=${ONEUPTIME_API_KEY} \
    otel/opentelemetry-collector:latest
```

```mermaid
flowchart LR
    subgraph POD["Monitored Pod"]
        APP["Application<br/>Instrumented with OTEL"]
        OTEL["OTel Collector<br/>Sidecar"]
        APP -->|traces, metrics, logs| OTEL
    end

    OTEL -->|OTLP| ONEUPTIME["OneUptime<br/>Observability Platform"]
    ONEUPTIME -->|alerts| ONCALL["On-Call Team"]
    ONEUPTIME -->|dashboards| SRE["SRE Dashboard"]
```

## Troubleshooting Pods

### Common Issues and Solutions

```bash
# Issue: Container can't start in pod
# Solution: Check pod status and events
podman pod inspect my-pod --format '{{.State}}'
podman events --filter pod=my-pod

# Issue: Port conflict in pod
# Remember: all containers share ports, can't bind same port twice
podman pod inspect my-pod --format '{{.InfraConfig.PortBindings}}'

# Issue: Container can't reach localhost service
# Solution: Verify containers are in the same pod
podman ps --filter pod=my-pod --format '{{.Names}}'

# Issue: Pod won't stop
# Solution: Force stop with immediate termination
podman pod stop -t 0 my-pod
podman pod rm -f my-pod
```

### Debugging Pod Networking

```bash
# Check pod network namespace details
podman pod inspect my-pod --format '{{.InfraContainerID}}' | \
    xargs podman inspect --format '{{.NetworkSettings}}'

# Run a debug container in the pod with networking tools
podman run --rm -it --pod my-pod \
    nicolaka/netshoot \
    bash

# Inside debug container, run diagnostic commands:
# ss -tulpn                    # Show listening ports
# netstat -an                  # Network connections
# curl localhost:PORT          # Test services
# nslookup service-name        # DNS resolution
```

### Viewing Pod Logs

```bash
# View logs from all containers in a pod
podman pod logs my-pod

# Follow logs from all containers in real-time
podman pod logs -f my-pod

# View logs from specific container in pod
podman logs my-pod-container-name

# View logs with timestamps
podman logs -t my-pod-container-name
```

## Best Practices

### Pod Design Principles

1. **Single responsibility per container**: Each container should do one thing well
2. **Shared fate**: Containers in a pod should have the same lifecycle
3. **Use sidecars wisely**: Add sidecars for cross-cutting concerns (logging, monitoring, proxying)
4. **Define resource limits**: Always set memory and CPU limits to prevent resource exhaustion
5. **Use health checks**: Ensure containers report their health status for better lifecycle management

### Security Considerations

```bash
# Run pods with reduced privileges for better security
podman pod create --name secure-pod \
    --security-opt no-new-privileges:true \
    --cap-drop ALL

# Run containers as non-root user
podman run -d --pod secure-pod \
    --user 1000:1000 \
    --name secure-app \
    my-app:latest

# Use read-only root filesystem with tmpfs for temporary files
podman run -d --pod secure-pod \
    --read-only \
    --tmpfs /tmp \
    --name readonly-app \
    my-app:latest
```

### Pod Naming Conventions

```bash
# Use descriptive names that indicate purpose and environment
podman pod create --name api-gateway-prod
podman pod create --name user-service-staging
podman pod create --name payment-processor-dev

# Container names should indicate their role within the pod
podman run -d --pod api-gateway-prod --name api-gateway-prod-envoy envoy:latest
podman run -d --pod api-gateway-prod --name api-gateway-prod-app api:latest
```

## Conclusion

Podman pods provide a powerful way to group related containers, share resources, and develop Kubernetes-compatible applications locally. Key takeaways:

- **Pods group containers** that need to work together and share the same lifecycle
- **Shared namespaces** enable localhost communication and resource sharing between containers
- **Kubernetes compatibility** means you can export pods to YAML and deploy to any Kubernetes cluster
- **Sidecar patterns** work naturally with pods for logging, monitoring, and proxying

Start with simple pods for local development, leverage the Kubernetes export feature for production deployments, and use [OneUptime](https://oneuptime.com) to monitor your containerized applications wherever they run.

---

*Need to monitor your Podman pods and containerized applications? [OneUptime](https://oneuptime.com) provides comprehensive container monitoring, distributed tracing, and alerting for your entire infrastructure - from local development to production Kubernetes clusters.*
