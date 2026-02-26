# How to Use ArgoCD with Minikube

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Minikube, Local Development

Description: Learn how to set up and use ArgoCD on Minikube for local Kubernetes development, including tunnel configuration, addon integration, and resource management.

---

Minikube is one of the most established tools for running Kubernetes locally. It supports multiple drivers (Docker, VirtualBox, HyperKit, KVM), has a rich addon ecosystem, and provides features like `minikube tunnel` for LoadBalancer support. Running ArgoCD on Minikube gives you a full-featured GitOps environment for learning, development, and testing.

## Setting Up Minikube for ArgoCD

ArgoCD needs a reasonable amount of resources. Configure Minikube with enough CPU and memory.

```bash
# Start Minikube with sufficient resources
minikube start \
  --cpus=4 \
  --memory=8192 \
  --driver=docker \
  --kubernetes-version=v1.28.0

# Verify the cluster is running
minikube status
kubectl get nodes
```

If you are running on a machine with limited resources, you can get by with less, but ArgoCD might be slow.

```bash
# Minimum viable configuration for ArgoCD
minikube start \
  --cpus=2 \
  --memory=4096 \
  --driver=docker
```

## Installing ArgoCD

```bash
# Create the namespace and install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for all pods to be ready
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s

# Check that everything is running
kubectl get pods -n argocd
```

## Accessing the ArgoCD UI

Minikube offers several ways to access services.

### Option 1: Minikube Tunnel (Recommended)

`minikube tunnel` creates a network route to LoadBalancer services. This is the cleanest approach.

```bash
# In a separate terminal, start the tunnel
minikube tunnel

# Change ArgoCD server to LoadBalancer type
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "LoadBalancer"}}'

# Get the external IP
kubectl get svc argocd-server -n argocd

# Access ArgoCD at https://<EXTERNAL-IP>
```

### Option 2: Minikube Service Command

```bash
# Open the ArgoCD server service in your browser
minikube service argocd-server -n argocd --https

# This automatically finds the NodePort and opens your browser
```

### Option 3: Port Forwarding

```bash
# Simple and always works
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Access at https://localhost:8080
```

### Option 4: Minikube Ingress Addon

```bash
# Enable the ingress addon
minikube addons enable ingress

# Wait for the ingress controller to be ready
kubectl wait --for=condition=Ready pods -l app.kubernetes.io/component=controller -n ingress-nginx --timeout=120s
```

Create an Ingress for ArgoCD.

```yaml
# argocd-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  ingressClassName: nginx
  rules:
    - host: argocd.local
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
```

Add the hostname to your hosts file.

```bash
# Get the Minikube IP
echo "$(minikube ip) argocd.local" | sudo tee -a /etc/hosts

# Access at https://argocd.local
```

## Getting the Admin Password

```bash
# Retrieve the initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
echo

# Login with ArgoCD CLI
argocd login localhost:8080 --insecure --username admin --password $(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d)
```

## Using Minikube Addons with ArgoCD

Minikube has several addons that complement ArgoCD.

### Metrics Server

```bash
# Enable metrics for resource monitoring
minikube addons enable metrics-server

# Now you can check ArgoCD resource usage
kubectl top pods -n argocd
```

### Registry

```bash
# Enable the built-in Docker registry
minikube addons enable registry

# Push images to the Minikube registry
# First, get the registry's cluster IP
REGISTRY=$(kubectl get svc registry -n kube-system -o jsonpath='{.spec.clusterIP}')
echo "Registry is at $REGISTRY:80"
```

### Dashboard

```bash
# Enable the Kubernetes dashboard alongside ArgoCD
minikube addons enable dashboard

# Access it with
minikube dashboard
```

## Deploying Your First Application

```yaml
# hello-world-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: hello-world
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    server: https://kubernetes.default.svc
    namespace: hello-world
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - CreateNamespace=true
```

```bash
# Apply the application
kubectl apply -f hello-world-app.yaml

# Watch ArgoCD sync
argocd app get hello-world --watch

# Access the deployed application
minikube service guestbook-ui -n hello-world
```

## Testing Helm Charts with ArgoCD on Minikube

Minikube is great for testing Helm deployments through ArgoCD.

```yaml
# helm-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: nginx-test
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://charts.bitnami.com/bitnami
    chart: nginx
    targetRevision: 15.4.4
    helm:
      values: |
        # Smaller resource requests for Minikube
        resources:
          requests:
            cpu: 50m
            memory: 64Mi
          limits:
            cpu: 200m
            memory: 128Mi
        # Use NodePort for Minikube
        service:
          type: NodePort
        # Single replica for local testing
        replicaCount: 1
  destination:
    server: https://kubernetes.default.svc
    namespace: nginx-test
  syncPolicy:
    automated:
      selfHeal: true
    syncOptions:
      - CreateNamespace=true
```

## Resource Management Tips

### Reduce ArgoCD Polling Frequency

On resource-constrained Minikube, reduce how often ArgoCD checks for changes.

```bash
# Increase the reconciliation timeout to 5 minutes (default is 3 minutes)
kubectl patch configmap argocd-cm -n argocd --type merge -p '{
  "data": {
    "timeout.reconciliation": "300s"
  }
}'
```

### Reduce Replicas for Development

```bash
# ArgoCD components do not need multiple replicas for local dev
kubectl scale deployment argocd-dex-server -n argocd --replicas=0  # Disable if not using SSO
kubectl scale deployment argocd-notifications-controller -n argocd --replicas=0  # Disable if not using notifications
```

### Pause and Resume Minikube

Unlike Kind, Minikube supports pausing and resuming. This preserves your ArgoCD setup between work sessions.

```bash
# Pause Minikube (saves resources while preserving state)
minikube pause

# Resume when you need it again
minikube unpause

# Or stop completely (preserves disk state)
minikube stop

# Start again later
minikube start
```

## Working with Multiple Minikube Profiles

Minikube profiles let you run multiple clusters for multi-cluster ArgoCD testing.

```bash
# Create a management cluster
minikube start --profile=management --cpus=4 --memory=6144

# Create a target cluster
minikube start --profile=target --cpus=2 --memory=4096

# Switch to the management cluster
minikube profile management

# Install ArgoCD on management
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Add the target cluster to ArgoCD
argocd cluster add target --name target-cluster
```

## Minikube-Specific Gotchas

### Docker Driver Network Isolation

When using the Docker driver, Minikube runs inside a Docker container. This means `localhost` inside Minikube is not the same as `localhost` on your host machine. Use `minikube ip` to get the correct IP.

```bash
minikube ip
# Returns something like 192.168.49.2
```

### Persistent Volume Claims

Minikube provisions PVs automatically using the hostpath provisioner, but they are tied to the Minikube VM. If you delete and recreate the cluster, the data is gone.

```bash
# List PVCs used by ArgoCD
kubectl get pvc -n argocd
```

### Docker Desktop Compatibility

If you are using Docker Desktop on macOS or Windows, Minikube with the Docker driver may have performance issues. Consider using the native hypervisor.

```bash
# macOS - use the HyperKit driver for better performance
minikube start --driver=hyperkit --cpus=4 --memory=8192

# Linux - use KVM2 for better performance
minikube start --driver=kvm2 --cpus=4 --memory=8192
```

## Cleanup

```bash
# Delete the Minikube cluster
minikube delete

# Delete a specific profile
minikube delete --profile=management

# Delete all profiles
minikube delete --all
```

## Summary

Minikube remains a solid choice for running ArgoCD locally. Its strengths are the addon ecosystem (ingress, metrics, registry, dashboard), `minikube tunnel` for LoadBalancer support, and the ability to pause/resume clusters to save resources. Use port-forwarding for quick access, the ingress addon for a more production-like setup, and Minikube profiles for multi-cluster testing. Allocate at least 4 CPUs and 4GB RAM for a comfortable ArgoCD experience.
