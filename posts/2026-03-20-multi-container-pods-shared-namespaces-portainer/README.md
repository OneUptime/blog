# How to Set Up Multi-Container Pods with Shared Namespaces in Portainer (2)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Kubernetes, Pod, Shared Namespaces, Sidecar Pattern

Description: Configure multi-container workloads in Portainer using shared network and IPC namespaces to implement sidecar and ambassador patterns for logging, monitoring, and proxy injection.

---

The sidecar pattern runs helper containers alongside the main application container, sharing namespaces so they can communicate via localhost or shared memory. In Docker, this is implemented via namespace sharing; in Kubernetes, it's native through pod specs.

## Shared Network Namespace in Docker Compose

The simplest way to share a network namespace is `network_mode: service:<name>`:

```yaml
version: "3.8"
services:
  # Main application container
  app:
    image: myapp:1.2.3
    networks:
      - app-net

  # Metrics sidecar - shares app's network namespace
  # Can access localhost:8080 inside app
  metrics-exporter:
    image: prometheus/cloudwatch-exporter:latest
    network_mode: "service:app"    # Share network namespace with app
    # This container can now reach localhost:8080 (the app's port)
    # Prometheus scrapes this container on port 9106

  # Log sidecar - share network namespace
  log-forwarder:
    image: fluent/fluent-bit:2.2
    network_mode: "service:app"
    volumes:
      - app-logs:/var/log/app:ro
```

## Shared IPC Namespace

For shared memory communication between containers:

```yaml
services:
  app:
    image: myapp:1.2.3
    ipc: shareable    # Allow other containers to share this IPC namespace

  cache-sidecar:
    image: shared-memory-cache:1.0
    ipc: "service:app"    # Share IPC namespace with app
    # Can now use POSIX shared memory (/dev/shm) to communicate with app
```

## Kubernetes Pod Pattern (via Portainer)

In Kubernetes, containers in the same Pod always share network and IPC namespaces:

```yaml
# multi-container-pod.yaml - deploy via Portainer Kubernetes manifests

apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-sidecars
spec:
  template:
    spec:
      # All these containers share network and IPC namespaces
      containers:
        # Main application
        - name: app
          image: myapp:1.2.3
          ports:
            - containerPort: 8080

        # Metrics sidecar - reaches app via localhost
        - name: metrics-exporter
          image: prom/statsd-exporter:latest
          ports:
            - containerPort: 9102

        # Log shipping sidecar
        - name: log-forwarder
          image: fluent/fluent-bit:2.2
          volumeMounts:
            - name: app-logs
              mountPath: /var/log/app

      volumes:
        - name: app-logs
          emptyDir: {}
```

## Sidecar Use Cases

### 1. Service Mesh Proxy (Envoy/Istio)

```yaml
containers:
  - name: app
    image: myapp:1.2.3
  - name: envoy-proxy
    image: envoyproxy/envoy:v1.28
    # Intercepts all traffic in/out of the pod
```

### 2. Log Collection

```yaml
containers:
  - name: app
    image: myapp:1.2.3
    volumeMounts:
      - name: logs
        mountPath: /var/log/app
  - name: log-collector
    image: fluent/fluent-bit:2.2
    volumeMounts:
      - name: logs    # Shared volume - same logs directory
        mountPath: /var/log/app
        readOnly: true
```

### 3. Health Check Proxy

```yaml
containers:
  - name: app
    image: legacy-app:1.0    # No HTTP health endpoint
  - name: healthcheck-proxy
    image: health-proxy:1.0
    # Reaches legacy app via localhost, exposes HTTP health endpoint
```

## Summary

Shared namespace multi-container patterns allow sidecar containers to closely integrate with the main application without changing the application code. In Docker Compose via Portainer, use `network_mode: "service:name"` for shared networking. In Kubernetes via Portainer, pods natively share namespaces between containers, making sidecar injection straightforward.
