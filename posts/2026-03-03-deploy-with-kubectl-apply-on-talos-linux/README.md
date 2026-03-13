# How to Deploy with kubectl apply on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, kubectl, Deployments, DevOps

Description: A practical guide to deploying and managing applications using kubectl apply on a Talos Linux Kubernetes cluster.

---

While tools like Helm and Kustomize add powerful features on top of Kubernetes, sometimes all you need is kubectl and a set of well-written YAML manifests. The `kubectl apply` command is the most fundamental way to deploy resources to a Kubernetes cluster, and on Talos Linux, it works just as reliably as on any other Kubernetes distribution.

This guide covers using kubectl apply effectively on a Talos Linux cluster, from basic deployments to managing complex multi-resource applications.

## Prerequisites

Make sure your workstation is configured to talk to your Talos Linux cluster:

```bash
# Generate kubeconfig from Talos
talosctl kubeconfig --nodes <control-plane-ip>

# Verify cluster access
kubectl cluster-info
kubectl get nodes
```

## Basic kubectl apply

The `kubectl apply` command takes a manifest file and creates or updates the resources defined in it:

```bash
# Apply a single manifest file
kubectl apply -f deployment.yaml

# Apply all manifest files in a directory
kubectl apply -f ./manifests/

# Apply from a URL
kubectl apply -f https://raw.githubusercontent.com/example/app/main/deploy.yaml
```

The key advantage of `kubectl apply` over `kubectl create` is that apply is declarative. If the resource already exists, it updates it to match the manifest. If it does not exist, it creates it. This makes apply safe to run multiple times.

## Writing a Complete Application Manifest

Let us build a full application deployment for a Talos Linux cluster. We will create a web application with a deployment, service, configmap, and ingress.

```yaml
# app-namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
  labels:
    app.kubernetes.io/name: my-app
```

```yaml
# app-configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: my-app
data:
  APP_PORT: "3000"
  LOG_LEVEL: "info"
  DATABASE_HOST: "postgres.databases.svc.cluster.local"
  DATABASE_PORT: "5432"
  DATABASE_NAME: "myapp"
```

```yaml
# app-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
  labels:
    app.kubernetes.io/name: my-app
    app.kubernetes.io/version: "1.0.0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app.kubernetes.io/name: my-app
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app.kubernetes.io/name: my-app
        app.kubernetes.io/version: "1.0.0"
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsGroup: 1000
      containers:
        - name: my-app
          image: myorg/my-app:1.0.0
          ports:
            - containerPort: 3000
              name: http
          envFrom:
            - configMapRef:
                name: my-app-config
          resources:
            requests:
              cpu: 200m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
          livenessProbe:
            httpGet:
              path: /health
              port: http
            initialDelaySeconds: 10
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            initialDelaySeconds: 5
            periodSeconds: 5
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop:
                - ALL
```

```yaml
# app-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: my-app
spec:
  selector:
    app.kubernetes.io/name: my-app
  ports:
    - port: 80
      targetPort: http
      protocol: TCP
      name: http
  type: ClusterIP
```

```yaml
# app-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: my-app
  namespace: my-app
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  rules:
    - host: app.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: my-app
                port:
                  number: 80
  tls:
    - secretName: my-app-tls
      hosts:
        - app.example.com
```

## Applying the Full Application

You can apply each file individually or put them all in a directory:

```bash
# Create the directory structure
mkdir -p manifests/my-app

# Move all manifests to the directory
# Then apply everything at once
kubectl apply -f manifests/my-app/

# Or apply in a specific order
kubectl apply -f app-namespace.yaml
kubectl apply -f app-configmap.yaml
kubectl apply -f app-deployment.yaml
kubectl apply -f app-service.yaml
kubectl apply -f app-ingress.yaml
```

## Using Multi-Document YAML Files

You can also combine multiple resources in a single file, separated by `---`:

```yaml
# all-in-one.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: my-app
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: my-app-config
  namespace: my-app
data:
  APP_PORT: "3000"
  LOG_LEVEL: "info"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: my-app
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
        - name: my-app
          image: myorg/my-app:1.0.0
          ports:
            - containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
  namespace: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 80
      targetPort: 3000
```

```bash
# Apply the multi-document file
kubectl apply -f all-in-one.yaml
```

## Dry Run and Diff

Before applying changes to a production Talos cluster, preview what will happen:

```bash
# Client-side dry run (validates YAML syntax)
kubectl apply -f deployment.yaml --dry-run=client

# Server-side dry run (validates against the cluster API)
kubectl apply -f deployment.yaml --dry-run=server

# Show the diff between local file and cluster state
kubectl diff -f deployment.yaml
```

The `kubectl diff` command is especially useful because it shows exactly what will change, similar to a git diff.

## Managing Updates

When you need to update your application, edit the manifest and apply again:

```bash
# After editing deployment.yaml to change the image tag
kubectl apply -f app-deployment.yaml

# Watch the rollout progress
kubectl rollout status deployment/my-app -n my-app

# Check rollout history
kubectl rollout history deployment/my-app -n my-app
```

If an update causes problems, you can roll back:

```bash
# Undo the last rollout
kubectl rollout undo deployment/my-app -n my-app

# Roll back to a specific revision
kubectl rollout undo deployment/my-app -n my-app --to-revision=2
```

## Labels and Selectors for Organization

Use labels consistently to organize and query your resources:

```bash
# List all resources with a specific label
kubectl get all -l app.kubernetes.io/name=my-app -n my-app

# Apply manifests only to resources with certain labels
kubectl get deployments -l environment=production --all-namespaces
```

## Pruning Deleted Resources

When you remove a manifest file from your directory but apply the directory again, the old resource stays in the cluster. Use the `--prune` flag to clean up:

```bash
# Apply with pruning (removes resources that are no longer in the manifests)
kubectl apply -f manifests/my-app/ --prune -l app.kubernetes.io/name=my-app
```

Be careful with pruning. It deletes resources that match the label selector but are not in your manifest files. Always use a specific label selector to avoid accidentally deleting resources from other deployments.

## Talos Linux Specific Patterns

On Talos Linux, remember that:

1. You cannot use hostPath volumes that point to arbitrary filesystem paths. Talos has a very restricted filesystem layout.

2. Pods that need to interact with the container runtime cannot use Docker socket mounts because Talos uses containerd without exposing the socket.

3. DaemonSets that need host access should use the appropriate security contexts and Talos-approved paths.

```yaml
# Correct way to mount host paths on Talos Linux
volumes:
  - name: host-data
    hostPath:
      path: /var/run  # Only specific paths are available
      type: Directory
```

## Handling Secrets

For production deployments on Talos Linux, avoid putting secrets directly in manifest files:

```bash
# Create a secret from the command line
kubectl create secret generic db-credentials \
  --namespace my-app \
  --from-literal=username=appuser \
  --from-literal=password=secure-password

# Or create from files
kubectl create secret generic tls-certs \
  --namespace my-app \
  --from-file=tls.crt=./certs/server.crt \
  --from-file=tls.key=./certs/server.key
```

## Summary

Deploying with kubectl apply on Talos Linux follows the same patterns as any Kubernetes cluster, but you need to be aware of the OS's immutable filesystem and security restrictions. The declarative nature of kubectl apply makes it safe to run repeatedly, and combined with dry runs and diffs, you can deploy with confidence. For small to medium deployments, kubectl apply with well-organized YAML files is all you need. As your setup grows, you can layer Kustomize or Helm on top without abandoning the fundamentals covered here.
