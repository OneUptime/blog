# How to Use ArgoCD with Vanilla Kubernetes

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Deployments

Description: Learn how to set up and use ArgoCD with a standard upstream Kubernetes cluster, covering installation, configuration, and best practices for vanilla K8s environments.

---

Vanilla Kubernetes refers to the upstream, unmodified Kubernetes distribution that you install using kubeadm or build from source. Unlike managed services (EKS, GKE, AKS) or lightweight distributions (K3s, MicroK8s), vanilla Kubernetes gives you a clean slate with no vendor-specific additions. This makes it the most straightforward platform for running ArgoCD, but it also means you need to handle more infrastructure plumbing yourself.

## Prerequisites

Before installing ArgoCD on vanilla Kubernetes, make sure your cluster meets these requirements:

- Kubernetes 1.24 or later (ArgoCD 2.x supports 1.24+)
- A working Ingress controller (or you will use port-forwarding/NodePort)
- At least 2 worker nodes for reliability
- Persistent storage provisioner if you want durable Redis data
- kubectl configured with cluster admin access

```bash
# Verify your cluster is healthy
kubectl cluster-info
kubectl get nodes -o wide

# Check the Kubernetes version
kubectl version --short
```

## Installing ArgoCD on Vanilla Kubernetes

The standard installation uses the ArgoCD manifests directly.

```bash
# Create the argocd namespace
kubectl create namespace argocd

# Install ArgoCD using the official manifests
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Wait for all pods to be ready
kubectl wait --for=condition=Ready pods --all -n argocd --timeout=300s
```

Verify the installation.

```bash
# Check all ArgoCD components are running
kubectl get pods -n argocd

# Expected output:
# argocd-application-controller-0      1/1     Running
# argocd-dex-server-xxx                1/1     Running
# argocd-redis-xxx                     1/1     Running
# argocd-repo-server-xxx               1/1     Running
# argocd-server-xxx                    1/1     Running
# argocd-applicationset-controller-xxx 1/1     Running
# argocd-notifications-controller-xxx  1/1     Running
```

## Exposing the ArgoCD UI

On vanilla Kubernetes, you do not get a cloud load balancer automatically. Here are your options.

### Option 1: NodePort Service

```bash
# Patch the argocd-server service to use NodePort
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort"}}'

# Get the assigned NodePort
kubectl get svc argocd-server -n argocd -o jsonpath='{.spec.ports[0].nodePort}'
```

Access the UI at `https://<any-node-ip>:<nodeport>`.

### Option 2: Ingress with TLS

```yaml
# Ingress resource for ArgoCD UI
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # For nginx ingress controller
    nginx.ingress.kubernetes.io/force-ssl-redirect: "true"
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
  ingressClassName: nginx
  rules:
    - host: argocd.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: argocd-server
                port:
                  number: 443
  tls:
    - hosts:
        - argocd.example.com
      secretName: argocd-tls
```

### Option 3: Port Forward for Quick Access

```bash
# Quick access for development/testing
kubectl port-forward svc/argocd-server -n argocd 8080:443
# Access at https://localhost:8080
```

## Getting the Initial Admin Password

```bash
# Retrieve the initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d
echo  # newline

# Login with the CLI
argocd login argocd.example.com --username admin --password <password>

# Change the password immediately
argocd account update-password
```

## Configuring Storage for Vanilla Kubernetes

Vanilla Kubernetes does not come with a default StorageClass. You need to set one up for ArgoCD's Redis to persist data across restarts (optional but recommended for production).

```yaml
# Example: local-path StorageClass for bare metal
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: local-path
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: rancher.io/local-path
volumeBindingMode: WaitForFirstConsumer
reclaimPolicy: Delete
```

For production, use a proper storage solution like Rook-Ceph, OpenEBS, or Longhorn.

## Deploying Your First Application

Create a simple application that deploys from a Git repository.

```yaml
# my-first-app.yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: guestbook
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/argoproj/argocd-example-apps.git
    targetRevision: HEAD
    path: guestbook
  destination:
    # For vanilla K8s, the API server URL is typically this
    server: https://kubernetes.default.svc
    namespace: guestbook
  syncPolicy:
    automated:
      selfHeal: true
      prune: true
    syncOptions:
      - CreateNamespace=true
```

```bash
# Apply the application
kubectl apply -f my-first-app.yaml

# Check the sync status
argocd app get guestbook
```

## Vanilla Kubernetes-Specific Considerations

### Network Policies

Vanilla Kubernetes supports NetworkPolicy only if you have a CNI that implements it (Calico, Cilium, etc.). Secure ArgoCD with network policies.

```yaml
# Restrict access to ArgoCD namespace
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-server-ingress
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  policyTypes:
    - Ingress
  ingress:
    # Allow from ingress controller
    - from:
        - namespaceSelector:
            matchLabels:
              app: ingress-nginx
      ports:
        - port: 8080
        - port: 8443
```

### RBAC Configuration

On vanilla Kubernetes, you manage your own RBAC. Make sure ArgoCD has the permissions it needs.

```bash
# Verify ArgoCD's cluster role bindings
kubectl get clusterrolebindings | grep argocd

# Check that the service account has the right permissions
kubectl auth can-i create deployments --as=system:serviceaccount:argocd:argocd-application-controller --all-namespaces
```

### Certificate Management

Without a managed service providing certificates, you need to handle TLS yourself. Use cert-manager for automatic certificate management.

```yaml
# Certificate for ArgoCD using cert-manager
apiVersion: cert-manager.io/v1
kind: Certificate
metadata:
  name: argocd-server-tls
  namespace: argocd
spec:
  secretName: argocd-tls
  issuerRef:
    name: letsencrypt-prod
    kind: ClusterIssuer
  dnsNames:
    - argocd.example.com
```

For more on certificate management with ArgoCD, see [bootstrapping cert-manager with ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-bootstrap-cert-manager/view).

## Multi-Cluster Management from Vanilla K8s

You can use your vanilla Kubernetes cluster as the ArgoCD hub that manages other clusters.

```bash
# Add a remote cluster to ArgoCD
argocd cluster add remote-cluster-context --name production

# List registered clusters
argocd cluster list
```

```yaml
# Application targeting a remote cluster
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: remote-app
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/org/apps.git
    targetRevision: main
    path: production
  destination:
    # URL of the remote cluster
    server: https://production-cluster.example.com:6443
    namespace: default
```

## High Availability on Vanilla Kubernetes

For production use, deploy ArgoCD in HA mode.

```bash
# Install the HA manifests instead
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
```

This gives you:

- 3 replicas of the application controller (with leader election)
- 3 replicas of the API server
- 3 replicas of the repo server
- HA Redis with Sentinel

Make sure your vanilla cluster has enough resources for the HA deployment.

```bash
# Check resource requests for HA ArgoCD
kubectl get pods -n argocd -o json | \
  jq -r '.items[] | "\(.metadata.name): CPU=\(.spec.containers[0].resources.requests.cpu // "none"), Memory=\(.spec.containers[0].resources.requests.memory // "none")"'
```

## Upgrading ArgoCD on Vanilla Kubernetes

Since you installed from raw manifests, upgrades are straightforward.

```bash
# Upgrade to a specific version
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.10.0/manifests/install.yaml

# Or if using HA
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/v2.10.0/manifests/ha/install.yaml

# Wait for the rollout to complete
kubectl rollout status deployment/argocd-server -n argocd
kubectl rollout status statefulset/argocd-application-controller -n argocd
```

## Summary

Using ArgoCD with vanilla Kubernetes is the most transparent setup - no vendor abstractions hiding configuration details. You need to handle storage provisioning, ingress, TLS certificates, and network policies yourself, but this gives you full control. The installation is standard, the configuration is well-documented, and the operational model is clean. For production workloads, use the HA manifests and ensure your cluster has proper storage and networking in place before deploying ArgoCD.
