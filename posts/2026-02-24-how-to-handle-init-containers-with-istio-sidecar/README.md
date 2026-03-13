# How to Handle Init Containers with Istio Sidecar

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Init Containers, Sidecar, Networking

Description: How to handle Kubernetes init containers when Istio sidecar injection is enabled, including networking issues, ordering problems, and practical workarounds.

---

Init containers run before the main application containers start and are commonly used for database migrations, configuration fetching, dependency checks, and secret initialization. When Istio injects its sidecar into a pod, init containers run into a subtle but frustrating problem: they often need network access, but the Istio sidecar is not running yet, and the iptables rules redirect all traffic through the (non-existent) proxy.

This guide explains the problem and walks through the solutions.

## The Problem

When Istio injects a sidecar, it also injects an init container called `istio-init` (or uses the CNI plugin) that sets up iptables rules to redirect all inbound and outbound traffic through the Envoy proxy. The execution order is:

1. `istio-init` runs and sets up iptables rules
2. Your init containers run
3. The `istio-proxy` sidecar starts
4. Your application container starts

The problem is at step 2. Your init containers try to make network requests, but the iptables rules redirect that traffic to port 15001 (Envoy's outbound port). Since Envoy is not running yet, the connection fails.

```bash
# This is what you see in your init container logs:
curl: (7) Failed to connect to api.example.com port 443: Connection refused
```

## Solution 1: Exclude Init Container Traffic from Proxy

You can tell Istio to exclude specific ports or IP ranges from the traffic redirection. This lets init container traffic bypass the proxy:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    metadata:
      annotations:
        traffic.sidecar.istio.io/excludeOutboundPorts: "443,5432"
    spec:
      initContainers:
      - name: db-migrate
        image: my-app:latest
        command: ["./migrate.sh"]
        # This connects to PostgreSQL on port 5432
      containers:
      - name: my-app
        image: my-app:latest
```

The `excludeOutboundPorts` annotation tells the iptables rules to not redirect traffic on those ports. The downside is that this exclusion applies to all containers, not just init containers. Your main application container will also bypass the proxy for traffic on port 443 and 5432, which means no mTLS and no Istio telemetry for that traffic.

You can also exclude by IP range:

```yaml
metadata:
  annotations:
    traffic.sidecar.istio.io/excludeOutboundIPRanges: "10.0.0.5/32,10.0.0.10/32"
```

## Solution 2: Use the Istio CNI Plugin

When using the Istio CNI plugin, the iptables rules are set up by the CNI plugin at the network level, but the behavior is similar. However, some CNI configurations handle init container traffic more gracefully.

With certain Istio versions and the CNI plugin, you can configure it to not redirect init container traffic:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  components:
    cni:
      enabled: true
  values:
    cni:
      cniBinDir: /opt/cni/bin
      cniConfDir: /etc/cni/net.d
```

## Solution 3: Native Sidecar Containers (Kubernetes 1.28+)

The best solution is Kubernetes native sidecar containers, available as stable in Kubernetes 1.28. With this feature, the Istio proxy runs as an init container with `restartPolicy: Always`, which means it starts before your regular init containers and keeps running.

Enable it in Istio:

```yaml
apiVersion: install.istio.io/v1alpha1
kind: IstioOperator
spec:
  values:
    pilot:
      env:
        ENABLE_NATIVE_SIDECARS: "true"
```

With native sidecars, the execution order becomes:

1. `istio-proxy` starts as a native sidecar (init container with restartPolicy: Always)
2. Your init containers run (proxy is already running!)
3. Your application containers start

Your init containers can now use the full mesh networking because the proxy is already up:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      initContainers:
      - name: db-migrate
        image: my-app:latest
        command: ["./migrate.sh"]
        # This works because istio-proxy is already running
      containers:
      - name: my-app
        image: my-app:latest
```

## Solution 4: Wait for Proxy in Init Container

If you cannot use native sidecars, you can add retry logic in your init container to wait for the proxy to become available. But this only works if your init container runs after the sidecar, which is not the default behavior.

A more practical approach is to move the initialization logic into the main container's startup:

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
      - name: my-app
        image: my-app:latest
        command:
        - /bin/sh
        - -c
        - |
          # Run migration (proxy is ready due to holdApplicationUntilProxyStarts)
          ./migrate.sh
          # Start the application
          exec ./start-app.sh
```

With `holdApplicationUntilProxyStarts: true`, the application container waits for the sidecar to be ready before starting. This means your migration script runs with full proxy access.

## Solution 5: Separate Init Work Into a Job

For heavy initialization tasks like database migrations, consider running them as a separate Job before deploying the application:

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: db-migrate
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
    spec:
      restartPolicy: Never
      containers:
      - name: migrate
        image: my-app:latest
        command: ["./migrate.sh"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
```

This keeps the migration completely separate from the sidecar lifecycle. Disable sidecar injection for the Job if the database is accessible without mTLS, or use the quitquitquit pattern if you need the mesh.

## Common Init Container Patterns and Their Solutions

### Fetching Configuration from a Remote API

```yaml
initContainers:
- name: fetch-config
  image: curlimages/curl
  command: ["curl", "-o", "/config/app.json", "https://config-service/api/config"]
  volumeMounts:
  - name: config
    mountPath: /config
```

Solution: Use `excludeOutboundPorts` for the config service port, or use native sidecars.

### Waiting for a Database to Be Ready

```yaml
initContainers:
- name: wait-for-db
  image: busybox
  command:
  - /bin/sh
  - -c
  - |
    until nc -z postgres.database 5432; do
      echo "Waiting for database..."
      sleep 2
    done
```

Solution: Exclude port 5432 from the proxy, or move the check to the main container startup.

### Downloading Secrets from a Vault

```yaml
initContainers:
- name: vault-init
  image: vault:latest
  command: ["vault", "agent", "-config=/etc/vault/config.hcl", "-exit-after-auth"]
```

Solution: Exclude the Vault server's port and IP from the proxy redirect.

## Testing Init Container Behavior

Verify that your init containers work with the sidecar:

```bash
# Deploy and watch pod startup
kubectl apply -f my-deployment.yaml
kubectl get pods -w

# Check init container logs
kubectl logs my-app-pod -c db-migrate

# Check if init container completed successfully
kubectl describe pod my-app-pod | grep -A 5 "Init Containers"
```

If the init container is stuck, check for connection errors:

```bash
kubectl logs my-app-pod -c db-migrate
# Look for "Connection refused" errors
```

## Wrapping Up

Init containers with Istio require careful handling because of the traffic interception setup. The cleanest solution is native sidecar containers in Kubernetes 1.28+, which starts the proxy before init containers run. If you cannot use native sidecars, exclude the relevant ports from the proxy redirect or move initialization logic into the main container with `holdApplicationUntilProxyStarts`. Pick the solution that best fits your Kubernetes version and security requirements.
