# How to Handle Application Dependencies on Sidecar Readiness

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Sidecar, Readiness, Startup

Description: Practical solutions for handling the race condition where application containers start before the Istio sidecar proxy is ready to handle traffic.

---

One of the most frustrating issues people hit when adopting Istio is the startup race condition. Your application container starts up, tries to make an outbound HTTP call or connect to a database, and fails because the Envoy sidecar hasn't finished initializing yet. The sidecar needs time to receive its configuration from the control plane, set up listeners, and establish mTLS connections. If your app tries to send traffic before all that is done, requests fail.

This problem shows up as connection refused errors, DNS failures, or TLS handshake errors during the first few seconds of a pod's life. Here's how to solve it properly.

## Understanding the Race Condition

When Kubernetes starts a pod, it starts all containers roughly at the same time. The init containers run first (in sequence), then all regular containers start in parallel. Since the Envoy sidecar is a regular container, there's no guarantee it will be ready before your application container.

The sidecar goes through these steps during startup:
1. Envoy binary starts
2. pilot-agent bootstraps the Envoy configuration
3. Envoy connects to istiod to fetch its xDS configuration
4. Listeners, routes, and clusters are configured
5. The sidecar starts accepting traffic

This process typically takes 1-5 seconds, but can take longer if istiod is under load or the configuration is large.

## Solution 1: holdApplicationUntilProxyStarts

The cleanest solution, available since Istio 1.7, is the `holdApplicationUntilProxyStarts` option. When enabled, the sidecar injection modifies the pod spec so that the application container doesn't start until the sidecar is ready:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  meshConfig:
    defaultConfig:
      holdApplicationUntilProxyStarts: true
```

You can also set it per workload:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
      - name: app
        image: my-app:latest
```

This works by using a postStart lifecycle hook on the sidecar container that blocks until the proxy is ready. The application container waits because Kubernetes starts containers in order when lifecycle hooks are in play.

## Solution 2: Native Sidecar Containers (Kubernetes 1.28+)

Starting with Kubernetes 1.28, there's native support for sidecar containers through the `initContainers` field with `restartPolicy: Always`. Istio takes advantage of this in newer versions:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        ENABLE_NATIVE_SIDECARS: "true"
```

With native sidecars, the Envoy container is defined as an init container with `restartPolicy: Always`. This means it starts before regular containers, and Kubernetes waits for it to be ready before starting the application container. It's the proper solution to the ordering problem.

Check if your cluster supports this:

```bash
kubectl version --short
```

You need Kubernetes 1.28 or later, and the `SidecarContainers` feature gate must be enabled (it's beta and enabled by default in 1.29+).

## Solution 3: Application-Side Retry Logic

Sometimes you can't use the Istio-level solutions. Maybe you're running an older version, or you need the fastest possible startup time. In that case, build retry logic into your application:

```python
import requests
from tenacity import retry, wait_exponential, stop_after_attempt

@retry(wait=wait_exponential(multiplier=0.5, max=5), stop=stop_after_attempt(10))
def startup_health_check():
    response = requests.get("http://dependency-service:8080/health")
    response.raise_for_status()
    return response

# Call this during app initialization
try:
    startup_health_check()
except Exception as e:
    print(f"Dependencies not ready after retries: {e}")
```

Or in Go:

```go
func waitForSidecar() error {
    for i := 0; i < 30; i++ {
        resp, err := http.Get("http://localhost:15021/healthz/ready")
        if err == nil && resp.StatusCode == 200 {
            resp.Body.Close()
            return nil
        }
        if resp != nil {
            resp.Body.Close()
        }
        time.Sleep(500 * time.Millisecond)
    }
    return fmt.Errorf("sidecar not ready after 15 seconds")
}
```

The sidecar exposes a health endpoint at `localhost:15021/healthz/ready` that your app can poll.

## Solution 4: Init Container That Waits for Sidecar

You can add an init container to your deployment that waits for the sidecar to be ready before your application starts. But wait, there's a catch: init containers run before the sidecar, so the sidecar isn't there yet.

The workaround is to use a script that waits for the sidecar's health endpoint in your application's startup:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "true"
    spec:
      containers:
      - name: app
        image: my-app:latest
        command:
        - /bin/sh
        - -c
        - |
          until curl -s -o /dev/null -w "%{http_code}" http://localhost:15021/healthz/ready | grep -q "200"; do
            echo "Waiting for sidecar..."
            sleep 1
          done
          echo "Sidecar is ready, starting application"
          exec /app/start
```

This wraps your app's entrypoint with a sidecar readiness check. It's not the most elegant, but it works reliably.

## Handling Database Migrations and Jobs

Kubernetes Jobs and database migrations are a special case. They run once and exit, but the sidecar keeps running, preventing the Job from completing. And on startup, they hit the same race condition.

For the startup issue, use `holdApplicationUntilProxyStarts`. For the shutdown issue, have your Job call the sidecar's quit endpoint when it finishes:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migration
spec:
  template:
    metadata:
      annotations:
        proxy.istio.io/config: |
          holdApplicationUntilProxyStarts: true
    spec:
      containers:
      - name: migration
        image: my-migration:latest
        command:
        - /bin/sh
        - -c
        - |
          /app/run-migration
          STATUS=$?
          curl -sf -XPOST http://localhost:15020/quitquitquit
          exit $STATUS
      restartPolicy: Never
```

The `/quitquitquit` endpoint tells the sidecar to shut down. The exit status of the migration is preserved so Kubernetes knows if the Job succeeded.

## Readiness Probes and the Sidecar

Your application's readiness probe can also be affected by sidecar readiness. If your readiness probe makes an HTTP call to an external service through the mesh, it will fail while the sidecar is starting up.

One approach is to use a local health endpoint for your readiness probe that doesn't depend on external calls:

```yaml
spec:
  containers:
  - name: app
    readinessProbe:
      httpGet:
        path: /healthz
        port: 8080
      initialDelaySeconds: 5
      periodSeconds: 5
```

The `initialDelaySeconds: 5` gives the sidecar time to start up before the first probe runs.

## Verifying the Configuration

After implementing one of these solutions, verify it's working:

```bash
# Watch pod startup
kubectl get pods -w -n my-namespace

# Check container start times
kubectl get pod my-pod -o jsonpath='{range .status.containerStatuses[*]}{.name}: {.state.running.startedAt}{"\n"}{end}'

# Check sidecar logs for startup timing
kubectl logs my-pod -c istio-proxy | head -20
```

If `holdApplicationUntilProxyStarts` is working correctly, you'll see the istio-proxy container start a few seconds before the application container.

## Recommendations

For new deployments on Kubernetes 1.29+, use native sidecars. It's the cleanest solution and doesn't require any workarounds. For older Kubernetes versions, enable `holdApplicationUntilProxyStarts` globally. It adds a small amount of startup latency (typically 2-5 seconds) but eliminates the race condition entirely.

For Jobs and CronJobs, always combine `holdApplicationUntilProxyStarts` with the quit endpoint pattern. And regardless of which solution you use, building retry logic into your application's initialization is good practice anyway, since network dependencies can be unavailable for reasons beyond sidecar readiness.
