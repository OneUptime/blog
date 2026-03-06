# How to Use Capacitor Dashboard with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, capacitor, dashboard, kubernetes, gitops, monitoring, ui

Description: A practical guide to installing and using the Capacitor Dashboard as a lightweight UI for monitoring and managing Flux CD workloads.

---

## Introduction

Capacitor is a lightweight, open-source web UI designed specifically for Flux CD. Unlike heavier dashboard solutions, Capacitor focuses on simplicity and speed, providing a clean interface to view your Flux resources without requiring complex setup or additional dependencies.

In this guide, you will learn how to deploy Capacitor alongside Flux CD, configure it for your environment, and use it effectively to monitor your GitOps pipelines.

## Prerequisites

Before you begin, ensure you have:

- A running Kubernetes cluster (v1.26 or later)
- Flux CD installed and bootstrapped
- kubectl configured to access your cluster
- A Git repository connected to Flux

Verify Flux is running:

```bash
# Confirm Flux components are healthy
flux check

# List existing Flux resources
flux get all
```

## What Is Capacitor

Capacitor is a general-purpose UI for Flux CD that provides:

- A unified view of all Flux resources (GitRepositories, Kustomizations, HelmReleases, etc.)
- Real-time status updates for reconciliation
- Event timelines showing what happened and when
- A minimal footprint with low resource consumption
- No external database or storage requirements

Capacitor runs as a single deployment in your cluster and reads Flux resources directly from the Kubernetes API.

## Installing Capacitor

### Method 1: Direct Manifest Deployment

The simplest way to install Capacitor is using a Flux Kustomization that references the official manifests:

```yaml
# capacitor-source.yaml
# GitRepository pointing to the Capacitor source code
apiVersion: source.toolkit.fluxcd.io/v1
kind: GitRepository
metadata:
  name: capacitor
  namespace: flux-system
spec:
  interval: 30m
  url: https://github.com/gimlet-io/capacitor
  ref:
    # Use a specific tag for stability
    tag: v0.4.3
```

```yaml
# capacitor-kustomization.yaml
# Kustomization to deploy Capacitor from its repository
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: capacitor
  namespace: flux-system
spec:
  interval: 1h
  # Wait for the source to be ready
  sourceRef:
    kind: GitRepository
    name: capacitor
  # Path to the deployment manifests in the repository
  path: ./deploy/manifests
  prune: true
  targetNamespace: flux-system
```

Apply both resources:

```bash
kubectl apply -f capacitor-source.yaml
kubectl apply -f capacitor-kustomization.yaml
```

### Method 2: Using Raw Kubernetes Manifests

You can also deploy Capacitor directly using its deployment manifest:

```yaml
# capacitor-deployment.yaml
# ServiceAccount for Capacitor to access Flux resources
apiVersion: v1
kind: ServiceAccount
metadata:
  name: capacitor
  namespace: flux-system
---
# ClusterRole granting read access to all Flux CRDs
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: capacitor
rules:
  # Access to Flux source resources
  - apiGroups: ["source.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  # Access to Flux kustomize resources
  - apiGroups: ["kustomize.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  # Access to Flux helm resources
  - apiGroups: ["helm.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  # Access to Flux notification resources
  - apiGroups: ["notification.toolkit.fluxcd.io"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  # Access to core Kubernetes resources for context
  - apiGroups: [""]
    resources: ["namespaces", "pods", "events"]
    verbs: ["get", "list", "watch"]
  - apiGroups: ["apps"]
    resources: ["deployments", "replicasets"]
    verbs: ["get", "list", "watch"]
---
# Bind the ClusterRole to the Capacitor ServiceAccount
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: capacitor
subjects:
  - kind: ServiceAccount
    name: capacitor
    namespace: flux-system
roleRef:
  kind: ClusterRole
  name: capacitor
  apiGroup: rbac.authorization.k8s.io
---
# The Capacitor deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: capacitor
  namespace: flux-system
spec:
  replicas: 1
  selector:
    matchLabels:
      app: capacitor
  template:
    metadata:
      labels:
        app: capacitor
    spec:
      serviceAccountName: capacitor
      containers:
        - name: capacitor
          # Use the official Capacitor image
          image: ghcr.io/gimlet-io/capacitor:v0.4.3
          ports:
            - containerPort: 9000
              name: http
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 200m
              memory: 128Mi
          # Liveness probe to detect if the process is stuck
          livenessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 5
            periodSeconds: 10
          # Readiness probe to ensure the UI is ready to serve
          readinessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 3
            periodSeconds: 5
---
# Service to expose the Capacitor UI
apiVersion: v1
kind: Service
metadata:
  name: capacitor
  namespace: flux-system
spec:
  selector:
    app: capacitor
  ports:
    - port: 9000
      targetPort: http
      protocol: TCP
      name: http
  type: ClusterIP
```

Apply the manifests:

```bash
kubectl apply -f capacitor-deployment.yaml
```

### Verify the Installation

```bash
# Check that the Capacitor pod is running
kubectl get pods -n flux-system -l app=capacitor

# Check the deployment status
kubectl get deployment capacitor -n flux-system
```

## Accessing the Capacitor Dashboard

### Port Forwarding

Use port forwarding for quick access:

```bash
# Forward port 9000 to access the Capacitor UI
kubectl port-forward svc/capacitor -n flux-system 9000:9000
```

Open your browser at `http://localhost:9000`.

### Ingress Configuration

For persistent access, set up an Ingress:

```yaml
# capacitor-ingress.yaml
# Ingress to expose Capacitor externally with TLS
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: capacitor
  namespace: flux-system
  annotations:
    # TLS certificate management
    cert-manager.io/cluster-issuer: letsencrypt-prod
    # Basic authentication for security
    nginx.ingress.kubernetes.io/auth-type: basic
    nginx.ingress.kubernetes.io/auth-secret: capacitor-basic-auth
    nginx.ingress.kubernetes.io/auth-realm: "Capacitor Dashboard"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - capacitor.example.com
      secretName: capacitor-tls
  rules:
    - host: capacitor.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: capacitor
                port:
                  number: 9000
```

Create the basic auth secret:

```bash
# Generate htpasswd file and create Kubernetes secret
htpasswd -c auth admin
kubectl create secret generic capacitor-basic-auth \
  --from-file=auth \
  -n flux-system
```

## Using the Capacitor Dashboard

### Overview Page

The main page shows a summary of all Flux resources grouped by type:

- **Sources** - GitRepositories, HelmRepositories, OCIRepositories, and Buckets
- **Kustomizations** - All Kustomization resources and their status
- **Helm Releases** - All HelmRelease resources and their chart versions
- **Notifications** - Alert and Provider configurations

### Monitoring Reconciliation

Each resource in Capacitor displays:

- A status indicator (green for ready, red for failed, yellow for in-progress)
- The last applied revision or chart version
- The time since the last successful reconciliation
- Any error messages from failed reconciliations

### Triggering Manual Reconciliation

While Capacitor is primarily a read-only dashboard, you can trigger reconciliation from the CLI and watch the results in real time:

```bash
# Trigger a reconciliation and watch the result in Capacitor
flux reconcile kustomization my-app -n flux-system

# Reconcile a specific HelmRelease
flux reconcile helmrelease my-chart -n flux-system
```

### Event Timeline

Capacitor provides an event timeline that shows recent Kubernetes events related to Flux resources. This is useful for debugging reconciliation failures:

```bash
# You can also view events from the CLI for comparison
kubectl get events -n flux-system --sort-by='.lastTimestamp' \
  --field-selector reason=ReconciliationSucceeded
```

## Managing Capacitor with Flux

To manage Capacitor itself through GitOps, add its manifests to your Flux repository:

```yaml
# clusters/my-cluster/capacitor/kustomization.yaml
# Kustomize overlay for Capacitor deployment
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: flux-system
resources:
  - deployment.yaml
  - service.yaml
  - ingress.yaml
  - rbac.yaml
# Patch to customize resource limits for your environment
patches:
  - target:
      kind: Deployment
      name: capacitor
    patch: |
      - op: replace
        path: /spec/template/spec/containers/0/resources/limits/memory
        value: 256Mi
```

Then reference it from a Flux Kustomization:

```yaml
# clusters/my-cluster/capacitor.yaml
# Flux Kustomization to deploy Capacitor from the Git repo
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: capacitor
  namespace: flux-system
spec:
  interval: 1h
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/capacitor
  prune: true
```

## Network Policies

Secure Capacitor by restricting its network access:

```yaml
# capacitor-netpol.yaml
# NetworkPolicy to restrict Capacitor traffic
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: capacitor
  namespace: flux-system
spec:
  podSelector:
    matchLabels:
      app: capacitor
  policyTypes:
    - Ingress
    - Egress
  ingress:
    # Allow traffic from the ingress controller only
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 9000
          protocol: TCP
  egress:
    # Allow access to the Kubernetes API server
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - port: 443
          protocol: TCP
        - port: 6443
          protocol: TCP
    # Allow DNS resolution
    - to:
        - namespaceSelector: {}
      ports:
        - port: 53
          protocol: UDP
        - port: 53
          protocol: TCP
```

## Troubleshooting

### Capacitor Pod Crashing

```bash
# Check pod events and logs
kubectl describe pod -n flux-system -l app=capacitor
kubectl logs -n flux-system -l app=capacitor

# Verify RBAC permissions are correct
kubectl auth can-i list kustomizations.kustomize.toolkit.fluxcd.io \
  --as=system:serviceaccount:flux-system:capacitor
```

### Missing Resources in the Dashboard

If some Flux resources are not showing up:

```bash
# Verify the ClusterRole has the right API groups
kubectl get clusterrole capacitor -o yaml

# Check that the resources exist
flux get all --all-namespaces
```

### High Memory Usage

If Capacitor uses more memory than expected in large clusters:

```bash
# Increase the memory limit
kubectl patch deployment capacitor -n flux-system --type=json \
  -p='[{"op":"replace","path":"/spec/template/spec/containers/0/resources/limits/memory","value":"512Mi"}]'
```

## Summary

Capacitor provides a lightweight, focused dashboard for Flux CD that is easy to deploy and maintain. Its minimal resource footprint makes it an excellent choice for teams that want visual insight into their GitOps workflows without the overhead of a full-featured platform. By deploying Capacitor through Flux itself, you keep your entire toolchain under GitOps control.
