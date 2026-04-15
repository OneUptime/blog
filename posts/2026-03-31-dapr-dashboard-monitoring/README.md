# How to Use Dapr Dashboard for Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Dashboard, Monitoring, Observability, UI

Description: Learn how to launch and use the Dapr Dashboard to monitor applications, inspect component configurations, and view actor and service status in real time.

---

## What Is the Dapr Dashboard?

The Dapr Dashboard is a web UI that provides visibility into your Dapr environment. It shows running applications, component configurations, actor information, and Dapr system services. It is useful for debugging and day-to-day operations.

## Launching the Dashboard in Self-Hosted Mode

```bash
dapr dashboard
```

This opens the dashboard at `http://localhost:8080` by default. To use a different port:

```bash
dapr dashboard --port 9090
```

## Launching the Dashboard in Kubernetes

```bash
dapr dashboard -k
```

The CLI forwards port 8080 from the dashboard pod to your local machine and opens a browser automatically.

To specify a different local port:

```bash
dapr dashboard -k --port 9090
```

## Key Dashboard Sections

### Applications Tab

Shows all running Dapr-enabled applications with:
- App ID and HTTP/gRPC ports
- Sidecar version
- Component subscriptions

### Components Tab

Lists all registered components (state stores, pub/sub, bindings) with their type and scoping metadata.

### Actors Tab

Displays active actor types, counts of active actors per type, and host placement.

### Control Plane Tab

Shows health status of Dapr control plane services:

| Service | Expected Status |
|---------|----------------|
| dapr-operator | Healthy |
| dapr-sidecar-injector | Healthy |
| dapr-placement | Healthy |
| dapr-sentry | Healthy |
| dapr-scheduler | Healthy |

## Accessing Dashboard Remotely

When running in Kubernetes, expose the dashboard service if you need persistent access:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: dapr-dashboard-lb
  namespace: dapr-system
spec:
  selector:
    app: dapr-dashboard
  ports:
    - port: 80
      targetPort: 8080
  type: LoadBalancer
```

```bash
kubectl apply -f dapr-dashboard-svc.yaml
```

## Dashboard Version and Upgrade

```bash
# Check dashboard version
dapr dashboard --version

# Upgrade with CLI upgrade
dapr upgrade -k --runtime-version 1.13.3
```

## Summary

The Dapr Dashboard provides a real-time web UI for monitoring Dapr applications, components, and control plane health. Launch it with `dapr dashboard` locally or `dapr dashboard -k` for Kubernetes. Use it to inspect actor placement, component configurations, and running service status during development and debugging.
