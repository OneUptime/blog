# How to Configure Liveness and Readiness Probes in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Workload

Description: Learn how to configure liveness, readiness, and startup probes in Rancher to ensure your containers are healthy and ready to serve traffic.

Health probes are essential for keeping your Kubernetes workloads reliable. Liveness probes detect when a container is stuck and needs to be restarted. Readiness probes determine when a container is ready to accept traffic. Startup probes handle slow-starting containers. This guide shows you how to configure all three probe types in Rancher.

## Prerequisites

- A running Rancher instance (v2.7 or later)
- A managed Kubernetes cluster
- A workload to configure probes on
- An application that exposes health check endpoints or can be checked via TCP/command

## Understanding the Three Probe Types

**Liveness Probe**: Checks if the container is alive. If the probe fails, Kubernetes kills the container and restarts it according to the restart policy. Use this to catch deadlocks or hung processes.

**Readiness Probe**: Checks if the container is ready to serve traffic. If the probe fails, the pod is removed from the Service endpoints, so it stops receiving traffic. The container is not restarted. Use this for containers that need time to warm up or temporarily cannot serve requests.

**Startup Probe**: Checks if the application has started. While the startup probe is running, liveness and readiness probes are disabled. Use this for slow-starting applications to prevent the liveness probe from killing them before they initialize.

## Step 1: Configure Probes via the Rancher UI

### Navigate to the Workload

1. Go to **☰ > Cluster Management**, open your cluster, and click **Explore > Workload**
2. Click **Create** and choose **Deployment** for a new workload, or find an existing workload and click the three-dot menu and **Edit Config**

### Add a Liveness Probe

1. Scroll to the **Health Check** section in the container configuration
2. Click **Add Liveness Check**
3. Choose the check type:
   - **HTTP GET**: Send an HTTP request to the container
   - **TCP Socket**: Check if a TCP port is open
   - **Command**: Run a command inside the container

For an HTTP check:
- **Path**: `/healthz`
- **Port**: `8080`
- **Initial Delay**: `15` seconds
- **Period**: `10` seconds
- **Timeout**: `5` seconds
- **Success Threshold**: `1`
- **Failure Threshold**: `3`

### Add a Readiness Probe

1. Click **Add Readiness Check**
2. Configure similarly to the liveness probe but with an appropriate endpoint:
   - **Path**: `/ready`
   - **Port**: `8080`
   - **Initial Delay**: `5` seconds
   - **Period**: `5` seconds

## Step 2: Configure Probes via YAML

### HTTP GET Probes

The most common probe type for web applications:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-web-app
  namespace: default
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-web-app
  template:
    metadata:
      labels:
        app: my-web-app
    spec:
      containers:
        - name: web
          image: my-web-app:latest
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
              httpHeaders:
                - name: Accept
                  value: application/json
            initialDelaySeconds: 15
            periodSeconds: 10
            timeoutSeconds: 5
            successThreshold: 1
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            timeoutSeconds: 3
            successThreshold: 1
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 0
            periodSeconds: 10
            timeoutSeconds: 5
            failureThreshold: 30
```

The startup probe allows up to 300 seconds (30 failures x 10 second period) for the application to start before the liveness probe takes over.

### TCP Socket Probes

Useful for non-HTTP services like databases:

```yaml
livenessProbe:
  tcpSocket:
    port: 5432
  initialDelaySeconds: 15
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
readinessProbe:
  tcpSocket:
    port: 5432
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
```

### Command (Exec) Probes

Run a command inside the container. The probe succeeds if the command exits with code 0:

```yaml
livenessProbe:
  exec:
    command:
      - sh
      - -c
      - "pg_isready -U postgres -h localhost"
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
readinessProbe:
  exec:
    command:
      - sh
      - -c
      - "redis-cli ping | grep PONG"
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3
```

### gRPC Probes

For gRPC services that implement the gRPC Health Checking Protocol (available by default in Kubernetes 1.24+, stable in Kubernetes 1.27+):

```yaml
livenessProbe:
  grpc:
    port: 50051
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3
```

## Step 3: Understanding Probe Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `initialDelaySeconds` | Seconds to wait before running the first probe | 0 |
| `periodSeconds` | How often to run the probe | 10 |
| `timeoutSeconds` | Seconds to wait for a response | 1 |
| `successThreshold` | Consecutive successes to be considered healthy after a failure (`1` for liveness and startup probes) | 1 |
| `failureThreshold` | Consecutive failures to be considered unhealthy | 3 |

## Probe Configuration Guidelines

### For Web Applications

```yaml
livenessProbe:
  httpGet:
    path: /healthz
    port: 8080
  initialDelaySeconds: 15
  periodSeconds: 10
  failureThreshold: 3
readinessProbe:
  httpGet:
    path: /ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3
```

### For Java Applications (Slow Startup)

```yaml
startupProbe:
  httpGet:
    path: /actuator/health
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 30
livenessProbe:
  httpGet:
    path: /actuator/health/liveness
    port: 8080
  periodSeconds: 10
  failureThreshold: 3
readinessProbe:
  httpGet:
    path: /actuator/health/readiness
    port: 8080
  periodSeconds: 5
  failureThreshold: 3
```

### For Database Sidecars

```yaml
livenessProbe:
  tcpSocket:
    port: 3306
  initialDelaySeconds: 30
  periodSeconds: 15
  failureThreshold: 5
readinessProbe:
  exec:
    command:
      - mysqladmin
      - ping
      - -h
      - localhost
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3
```

## Common Mistakes to Avoid

1. **Assuming liveness and readiness probes must use different endpoints**: They can use the same low-cost endpoint for simple applications. Use separate endpoints when liveness and readiness need to represent different conditions.

2. **Initial delay too short**: If your application takes 30 seconds to start, but your liveness probe starts after 5 seconds, the pod will be killed in a restart loop.

3. **Timeout too short**: Network hiccups or momentary load spikes can cause brief timeouts. Set a reasonable timeout (3-5 seconds).

4. **Liveness probe depends on external services**: A liveness probe should only check the health of the container itself. If it checks an external database and that database is down, all your pods will be restarted, making things worse.

5. **Missing startup probes for slow-starting apps**: Without a startup probe, you have to set a large `initialDelaySeconds` on the liveness probe, which delays failure detection after the app has fully started.

## Verifying Probes

Check probe status in the pod description:

```bash
kubectl describe pod my-app-pod -n default
```

Look for events like:

```plaintext
Warning  Unhealthy  3s  kubelet  Liveness probe failed: HTTP probe failed with statuscode: 503
Warning  Unhealthy  3s  kubelet  Readiness probe failed: HTTP probe failed with statuscode: 503
```

## Summary

Health probes are a critical part of running reliable workloads in Kubernetes. Rancher makes it easy to configure liveness, readiness, and startup probes through its UI. Use HTTP probes for web services, TCP probes for non-HTTP services, and command probes for custom health checks. Always keep liveness probes simple and avoid dependencies on external services.
