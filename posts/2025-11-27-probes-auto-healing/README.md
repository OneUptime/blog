# How to Add Liveness, Readiness, and Startup Probes So Kubernetes Auto-Heals Your Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Reliability, DevOps, Troubleshooting

Description: Configure HTTP/TCP/command probes, validate them with kubectl, and wire alerting so the scheduler auto-heals hung Pods before users notice.

---

Kubernetes will happily restart unhealthy containers—as long as you teach it how to detect them. Probes answer three questions:

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

`deployments/web-with-probes.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: dev
spec:
  replicas: 3
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
          readinessProbe:
            httpGet:
              path: /readyz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
            timeoutSeconds: 2
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            failureThreshold: 30
            periodSeconds: 5
```

Key rules:

- **Startup probe** gates the liveness probe until the app finishes booting.
- **Readiness probe** removes Pods from Services while failing, preventing bad traffic.
- **Liveness probe** restarts the container when it keeps failing.

Apply it:

```bash
kubectl apply -f deployments/web-with-probes.yaml
```

## 3. Watch Probe Status

Use `kubectl describe pod` to confirm probe conditions:

```bash
kubectl get pods -n dev -l app=web
kubectl describe pod web-abcde -n dev | grep -A5 Liveness
```

Events should show `Readiness probe succeeded` before traffic hits the Pod. If you see `Back-off restarting failed container`, the liveness probe is firing.

## 4. Test Failure Paths Safely

Force the readiness endpoint to break (toggle a feature flag or pause the HTTP handler) and observe:

```bash
kubectl port-forward svc/web 8080:80 &
# flip /readyz to return 503 via feature toggle or chaos script
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

Scrape `kubelet_probe_*` or `kube_pod_container_status_restarts_total` metrics. Example PromQL alert:

```
increase(kube_pod_container_status_restarts_total{namespace="prod",container="web"}[5m]) > 3
```

Tie alerts to runbooks that include `kubectl describe pod <name>` and log tail commands.

## 7. Version Control the Probes

Store the manifest in Git, run `kubectl diff -f` in CI, and require PR reviews before someone loosens liveness thresholds in prod. Combine with canary rollouts so new probe settings hit a single Pod first.

---

With probes in place, Kubernetes becomes a safety net: Pods that stop responding are drained from traffic and restarted automatically. Spend the time to define accurate endpoints, and your MTTR drops on day one.
