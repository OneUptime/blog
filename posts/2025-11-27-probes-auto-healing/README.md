# How to Add Liveness, Readiness, and Startup Probes So Kubernetes Auto-Heals Your Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Reliability, DevOps, Troubleshooting

Description: Configure HTTP/TCP/command probes, validate them with kubectl, and wire alerting so the scheduler auto-heals hung Pods before users notice.

---

Kubernetes will happily restart unhealthy containers-as long as you teach it how to detect them. Probes answer three questions:

- **Startup:** Has the app finished booting yet?
- **Readiness:** Can this Pod receive traffic right now?
- **Liveness:** Is the process still healthy, or should the kubelet restart it?

Let’s bolt these onto a simple web service.

## 1. Instrument Your App

Expose an endpoint or command that reflects real health:

- `/healthz` that hits dependencies (DB cache, upstream APIs).
- `/readyz` that only flips to 200 when caches warm.
- CLI check (e.g., `python health.py`).

Return non-200 status codes when broken so probes fail decisively.

## 2. Add Probes to the Deployment

The following Kubernetes Deployment manifest configures all three probe types for a web application. Each probe serves a distinct purpose: the startup probe gives your app time to initialize, the readiness probe controls traffic routing, and the liveness probe triggers automatic restarts when the container becomes unhealthy.

`deployments/web-with-probes.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: dev
spec:
  replicas: 3  # Run 3 instances for high availability
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: ghcr.io/example/web:1.4.2
          ports:
            - containerPort: 8080

          # Readiness probe: Controls whether this Pod receives traffic
          # Pod is removed from Service endpoints when probe fails
          readinessProbe:
            httpGet:
              path: /readyz      # Endpoint that checks if app can serve requests
              port: 8080
            initialDelaySeconds: 5   # Wait 5s before first check
            periodSeconds: 5         # Check every 5 seconds
            failureThreshold: 3      # Remove from service after 3 failures

          # Liveness probe: Detects hung or deadlocked containers
          # Container is restarted when probe fails
          livenessProbe:
            httpGet:
              path: /healthz     # Endpoint that verifies process health
              port: 8080
            initialDelaySeconds: 15  # Wait 15s for app startup before checking
            periodSeconds: 10        # Check every 10 seconds
            timeoutSeconds: 2        # Fail if response takes >2s

          # Startup probe: Gates liveness/readiness probes during boot
          # Prevents premature restarts for slow-starting apps
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            failureThreshold: 30     # Allow up to 30 * 5s = 150s for startup
            periodSeconds: 5         # Check every 5 seconds during startup
```

Key rules:

- **Startup probe** gates the liveness probe until the app finishes booting.
- **Readiness probe** removes Pods from Services while failing, preventing bad traffic.
- **Liveness probe** restarts the container when it keeps failing.

Apply the deployment to your cluster. This command creates or updates the Deployment resource with the probe configuration:

```bash
# Deploy the web application with health probes configured
kubectl apply -f deployments/web-with-probes.yaml
```

## 3. Watch Probe Status

After deploying, use `kubectl` commands to verify that probes are working correctly. The `describe` command shows detailed probe status and any failures in the Events section:

```bash
# List all pods for the web app and check their status
kubectl get pods -n dev -l app=web

# Inspect probe configuration and recent probe events for a specific pod
# Replace 'web-abcde' with your actual pod name from the previous command
kubectl describe pod web-abcde -n dev | grep -A5 Liveness
```

Events should show `Readiness probe succeeded` before traffic hits the Pod. If you see `Back-off restarting failed container`, the liveness probe is firing.

## 4. Test Failure Paths Safely

Before relying on probes in production, validate that they behave correctly when your application fails. Force the readiness endpoint to break (toggle a feature flag or pause the HTTP handler) and observe how Kubernetes responds:

```bash
# Start port-forwarding in the background to access the service locally
kubectl port-forward svc/web 8080:80 &

# Now trigger a failure in your app (e.g., via feature flag or chaos script)
# The /readyz endpoint should start returning 503

# Watch the endpoints list - unhealthy pods will be removed automatically
kubectl get endpoints web -n dev
```

The Endpoints list should drop out-of-service Pods immediately. Revert the failure and watch them rejoin.

For liveness tests, sleep the process longer than the probe timeout or `iptables -A OUTPUT -p tcp --dport 8080 -j DROP` inside the container to simulate a hang. Kubernetes should restart the container automatically.

## 5. Tune Probe Settings

- `failureThreshold × periodSeconds` ≈ total downtime tolerated before restart.
- `timeoutSeconds` should be slightly higher than your P99 handler latency.
- Use `grpcHealthCheck` for gRPC servers instead of HTTP GET.

Monitor probe events; flapping indicates thresholds are too aggressive.

## 6. Alert on Probe Failures

Don't rely solely on Kubernetes to handle probe failures silently. Set up alerting so your team is notified when containers restart frequently, which often indicates an underlying issue that needs investigation. Scrape `kubelet_probe_*` or `kube_pod_container_status_restarts_total` metrics from your monitoring system.

The following PromQL query fires an alert when a container restarts more than 3 times in 5 minutes, which typically indicates a crashloop or persistent health issue:

```promql
# Alert when container restarts exceed threshold
# This catches crashloops and persistent liveness probe failures
increase(kube_pod_container_status_restarts_total{namespace="prod",container="web"}[5m]) > 3
```

Tie alerts to runbooks that include `kubectl describe pod <name>` and log tail commands.

## 7. Version Control the Probes

Store the manifest in Git, run `kubectl diff -f` in CI, and require PR reviews before someone loosens liveness thresholds in prod. Combine with canary rollouts so new probe settings hit a single Pod first.

---

With probes in place, Kubernetes becomes a safety net: Pods that stop responding are drained from traffic and restarted automatically. Spend the time to define accurate endpoints, and your MTTR drops on day one.
