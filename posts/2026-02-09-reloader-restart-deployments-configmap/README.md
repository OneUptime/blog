# How to Use Reloader to Automatically Restart Deployments on ConfigMap Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Reloader, ConfigMaps

Description: Learn how to use Stakater Reloader to automatically restart Kubernetes deployments when ConfigMaps or Secrets change, eliminating manual pod restarts.

---

Manually restarting deployments after updating ConfigMaps or Secrets is tedious and error-prone. You might forget to restart a deployment, leading to pods running with outdated configuration. This creates inconsistency between what you expect and what's actually running.

Reloader is a Kubernetes controller from Stakater that watches ConfigMaps and Secrets, automatically triggering rolling updates when they change. This ensures your applications always run with the latest configuration without manual intervention.

In this guide, you'll learn how to install and configure Reloader, use annotations to control reload behavior, and implement patterns for zero-downtime configuration updates.

## Understanding the Problem

When you update a ConfigMap or Secret, Kubernetes doesn't automatically restart pods that use them. For mounted volumes, kubelet eventually updates the files (30-60 seconds), but environment variables never change without a pod restart.

This creates several issues:

- Pods continue running with old configuration
- Environment variables remain stale indefinitely
- Manual restarts are required for every config change
- Risk of forgetting to restart all affected deployments

Reloader solves this by watching for changes and triggering automated rolling updates.

## Installing Reloader

Install Reloader using Helm, the recommended method:

```bash
# Add Stakater Helm repository
helm repo add stakater https://stakater.github.io/stakater-charts
helm repo update

# Install Reloader in the reloader namespace
helm install reloader stakater/reloader \
  --namespace reloader \
  --create-namespace \
  --set reloader.watchGlobally=true
```

Verify the installation:

```bash
# Check Reloader pod is running
kubectl get pods -n reloader

# View Reloader logs
kubectl logs -n reloader -l app=reloader -f
```

You can also install using kubectl with the manifests:

```bash
kubectl apply -f https://raw.githubusercontent.com/stakater/Reloader/master/deployments/kubernetes/reloader.yaml
```

## Basic Usage with Annotations

Reloader uses annotations to determine which deployments to reload. Add annotations to your Deployment, StatefulSet, or DaemonSet resources.

### Auto-Reload All ConfigMaps and Secrets

Use `reloader.stakater.com/auto: "true"` to automatically reload when any ConfigMap or Secret mounted in the pod changes:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    reloader.stakater.com/auto: "true"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: app
        image: my-app:latest
        envFrom:
        - configMapRef:
            name: app-config
        - secretRef:
            name: app-secrets
        volumeMounts:
        - name: extra-config
          mountPath: /etc/config
      volumes:
      - name: extra-config
        configMap:
          name: extra-config
```

With this annotation, Reloader watches `app-config`, `app-secrets`, and `extra-config`. When any of them change, it triggers a rolling update.

### Watching Specific ConfigMaps

If you want fine-grained control, specify exact ConfigMaps to watch:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    reloader.stakater.com/match: "true"
    configmap.reloader.stakater.com/reload: "app-config,feature-flags"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
      - name: app
        image: my-app:latest
        envFrom:
        - configMapRef:
            name: app-config
        volumeMounts:
        - name: feature-flags
          mountPath: /etc/flags
      volumes:
      - name: feature-flags
        configMap:
          name: feature-flags
```

This deployment only reloads when `app-config` or `feature-flags` change. Other ConfigMaps are ignored.

### Watching Specific Secrets

Similarly, watch specific Secrets:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
  annotations:
    reloader.stakater.com/match: "true"
    secret.reloader.stakater.com/reload: "api-keys,database-credentials"
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-server
  template:
    metadata:
      labels:
        app: api-server
    spec:
      containers:
      - name: api
        image: api-server:latest
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: database-credentials
              key: password
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: api-keys
              key: key
```

### Watching Both ConfigMaps and Secrets

Combine both annotations to watch ConfigMaps and Secrets simultaneously:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
  annotations:
    reloader.stakater.com/match: "true"
    configmap.reloader.stakater.com/reload: "web-config,nginx-config"
    secret.reloader.stakater.com/reload: "tls-certs,oauth-secrets"
spec:
  replicas: 5
  selector:
    matchLabels:
      app: web-app
  template:
    metadata:
      labels:
        app: web-app
    spec:
      containers:
      - name: web
        image: web-app:latest
        envFrom:
        - configMapRef:
            name: web-config
        volumeMounts:
        - name: nginx
          mountPath: /etc/nginx
        - name: tls
          mountPath: /etc/tls
      volumes:
      - name: nginx
        configMap:
          name: nginx-config
      - name: tls
        secret:
          secretName: tls-certs
```

## Real-World Example: Multi-Tier Application

Let's configure a complete multi-tier application with Reloader:

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
  namespace: production
data:
  API_ENDPOINT: "https://api.example.com"
  FEATURE_FLAGS: "new-ui,dark-mode"
  LOG_LEVEL: "info"
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: backend-config
  namespace: production
data:
  config.yaml: |
    database:
      max_connections: 100
      timeout: 30
    cache:
      ttl: 3600
    features:
      enable_metrics: true
---
# secrets.yaml
apiVersion: v1
kind: Secret
metadata:
  name: backend-secrets
  namespace: production
type: Opaque
stringData:
  DB_PASSWORD: "secure-password"
  API_SECRET: "secret-key"
---
# frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend
  namespace: production
  annotations:
    reloader.stakater.com/auto: "true"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: frontend
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
      - name: frontend
        image: frontend:v1.2.0
        envFrom:
        - configMapRef:
            name: frontend-config
        ports:
        - containerPort: 3000
---
# backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend
  namespace: production
  annotations:
    reloader.stakater.com/match: "true"
    configmap.reloader.stakater.com/reload: "backend-config"
    secret.reloader.stakater.com/reload: "backend-secrets"
spec:
  replicas: 5
  selector:
    matchLabels:
      app: backend
  template:
    metadata:
      labels:
        app: backend
    spec:
      containers:
      - name: backend
        image: backend:v2.1.0
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: backend-secrets
              key: DB_PASSWORD
        volumeMounts:
        - name: config
          mountPath: /etc/config
      volumes:
      - name: config
        configMap:
          name: backend-config
```

Apply these resources:

```bash
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f frontend-deployment.yaml
kubectl apply -f backend-deployment.yaml
```

## Testing Reloader

Update a ConfigMap and watch Reloader trigger a rolling update:

```bash
# Update the frontend ConfigMap
kubectl create configmap frontend-config \
  --from-literal=API_ENDPOINT="https://api.example.com" \
  --from-literal=FEATURE_FLAGS="new-ui,dark-mode,analytics" \
  --from-literal=LOG_LEVEL="debug" \
  --dry-run=client -o yaml | kubectl apply -n production -f -

# Watch the deployment rollout
kubectl rollout status deployment/frontend -n production

# Check Reloader logs
kubectl logs -n reloader -l app=reloader --tail=50
```

You'll see Reloader detect the change and trigger the update:

```
time="2026-02-09T10:30:00Z" level=info msg="Changes detected in configmap: production/frontend-config"
time="2026-02-09T10:30:00Z" level=info msg="Updating deployment: production/frontend"
```

## Reloader with StatefulSets

Reloader works with StatefulSets the same way as Deployments:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: database
  annotations:
    reloader.stakater.com/auto: "true"
spec:
  serviceName: database
  replicas: 3
  selector:
    matchLabels:
      app: database
  template:
    metadata:
      labels:
        app: database
    spec:
      containers:
      - name: postgres
        image: postgres:15
        envFrom:
        - configMapRef:
            name: postgres-config
        - secretRef:
            name: postgres-secrets
```

## Reloader with DaemonSets

DaemonSets also support Reloader annotations:

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: logging-agent
  annotations:
    configmap.reloader.stakater.com/reload: "logging-config"
spec:
  selector:
    matchLabels:
      app: logging-agent
  template:
    metadata:
      labels:
        app: logging-agent
    spec:
      containers:
      - name: fluentd
        image: fluentd:v1.15
        volumeMounts:
        - name: config
          mountPath: /fluentd/etc
      volumes:
      - name: config
        configMap:
          name: logging-config
```

## Advanced Configuration

### Namespace-Scoped Reloader

If you don't want Reloader watching all namespaces, configure it for specific namespaces:

```bash
# Install with namespace restrictions
helm install reloader stakater/reloader \
  --namespace reloader \
  --create-namespace \
  --set reloader.watchGlobally=false \
  --set reloader.namespaceSelector="environment=production"
```

### Custom Reloader Image

Use a specific Reloader version:

```bash
helm install reloader stakater/reloader \
  --namespace reloader \
  --create-namespace \
  --set reloader.deployment.image.tag=v1.0.40
```

## Monitoring Reloader

Check Reloader's metrics endpoint for monitoring:

```bash
# Port-forward to Reloader
kubectl port-forward -n reloader svc/reloader-reloader 9090:9090

# Access metrics
curl http://localhost:9090/metrics
```

Create a ServiceMonitor for Prometheus:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: reloader
  namespace: reloader
spec:
  selector:
    matchLabels:
      app: reloader
  endpoints:
  - port: metrics
    interval: 30s
```

## Best Practices

1. **Use auto mode for development**: In dev environments, use `reloader.stakater.com/auto: "true"` for convenience.

2. **Use match mode for production**: In production, explicitly list ConfigMaps and Secrets to avoid unintended restarts.

3. **Monitor reload events**: Track reload events in your monitoring system to correlate configuration changes with application behavior.

4. **Test configuration changes**: Always test ConfigMap updates in non-production environments before applying to production.

5. **Use immutable ConfigMaps**: Consider using immutable ConfigMaps with new names for each version to have more control over rollouts.

Reloader eliminates the manual work of restarting deployments after configuration changes. By automatically triggering rolling updates, it ensures your applications always run with current configuration while maintaining zero downtime through Kubernetes' standard rolling update mechanism.
