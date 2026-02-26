# How to Configure ArgoCD Server as Insecure for Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Development, Configuration

Description: Learn how to configure ArgoCD server in insecure mode for development, testing, and when TLS is handled externally by an ingress or load balancer.

---

ArgoCD server runs with built-in TLS by default. While this is great for security, it complicates development setups and creates issues when an external load balancer or ingress controller already handles TLS. Running ArgoCD in insecure mode disables its built-in TLS, making it serve plain HTTP on port 8080. This guide explains when and how to use this configuration safely.

## When to Use Insecure Mode

Insecure mode does not mean your ArgoCD instance is insecure. It means ArgoCD itself does not handle TLS. Use it when:

- An ingress controller terminates TLS in front of ArgoCD
- A cloud load balancer handles TLS (ALB, GCE, NLB)
- You are developing locally and do not need TLS
- You are running ArgoCD behind a reverse proxy that handles encryption
- You want to avoid redirect loops caused by double TLS

Do NOT use insecure mode when:

- ArgoCD is directly exposed to the internet without a TLS-terminating proxy
- You are using TLS passthrough at the ingress
- You need end-to-end encryption without a service mesh

## Method 1: ConfigMap Configuration

The recommended way to enable insecure mode:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"
```

Apply and restart the server:

```bash
kubectl apply -f argocd-cmd-params-cm.yaml
kubectl rollout restart deployment argocd-server -n argocd

# Verify the server is running in insecure mode
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-server | head -20
# Look for: "serving insecure" or "running in insecure mode"
```

## Method 2: Command-Line Flag

If you manage the ArgoCD deployment directly, you can add the flag to the server container:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-server
          command:
            - argocd-server
          args:
            - --insecure
```

## Method 3: Helm Values

If you install ArgoCD with Helm:

```yaml
# values.yaml
server:
  extraArgs:
    - --insecure

# Or using the configs section
configs:
  params:
    server.insecure: true
```

```bash
helm upgrade argocd argo/argo-cd \
  --namespace argocd \
  -f values.yaml
```

## What Changes in Insecure Mode

When insecure mode is enabled:

1. **Port changes**: The server listens on port 8080 (HTTP) instead of 8443 (HTTPS)
2. **No TLS certificate**: ArgoCD does not generate or serve a TLS certificate
3. **Service ports**: The Kubernetes service maps port 80 to the server's port 8080
4. **gRPC**: gRPC traffic uses h2c (HTTP/2 cleartext) instead of encrypted HTTP/2
5. **Redirects**: ArgoCD does not redirect HTTP to HTTPS

The ArgoCD service already accounts for both modes:

```bash
# Check the ArgoCD server service
kubectl get svc argocd-server -n argocd -o yaml
```

The service exposes both port 80 (HTTP) and port 443 (HTTPS). In insecure mode, use port 80.

## Verifying Insecure Mode

```bash
# Check if the server is listening on HTTP
kubectl exec -n argocd deploy/argocd-server -- curl -s http://localhost:8080/healthz
# Should return: "ok"

# Check if HTTPS is disabled
kubectl exec -n argocd deploy/argocd-server -- curl -s https://localhost:8443/healthz
# Should fail with connection refused

# Port-forward and test
kubectl port-forward svc/argocd-server -n argocd 8080:80
curl http://localhost:8080
# Should return the ArgoCD UI HTML
```

## Development Setup with Insecure Mode

For a complete local development setup:

```bash
# 1. Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 2. Enable insecure mode
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge \
  -p '{"data":{"server.insecure":"true"}}'

# 3. Restart the server
kubectl rollout restart deployment argocd-server -n argocd

# 4. Wait for the rollout
kubectl rollout status deployment argocd-server -n argocd

# 5. Get the admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

# 6. Start port-forward
kubectl port-forward svc/argocd-server -n argocd 8080:80 &

# 7. Login with CLI
argocd login localhost:8080 --insecure --username admin --password $ARGOCD_PASSWORD

# 8. Open the UI
echo "ArgoCD UI: http://localhost:8080"
echo "Username: admin"
echo "Password: $ARGOCD_PASSWORD"
```

## Docker Desktop and Minikube Setup

For local Kubernetes distributions:

### Minikube

```bash
# Install ArgoCD with insecure mode
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Enable insecure mode
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge \
  -p '{"data":{"server.insecure":"true"}}'
kubectl rollout restart deployment argocd-server -n argocd

# Use Minikube tunnel or service URL
minikube service argocd-server -n argocd --url
```

### Kind

```bash
# Create a Kind cluster with port mapping
cat <<EOF | kind create cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 30080
        hostPort: 8080
        protocol: TCP
EOF

# Install ArgoCD and create a NodePort service
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Enable insecure mode
kubectl patch configmap argocd-cmd-params-cm -n argocd --type merge \
  -p '{"data":{"server.insecure":"true"}}'
kubectl rollout restart deployment argocd-server -n argocd

# Create NodePort service
kubectl patch svc argocd-server -n argocd --type merge \
  -p '{"spec":{"type":"NodePort","ports":[{"name":"http","port":80,"targetPort":8080,"nodePort":30080}]}}'

# Access at http://localhost:8080
```

## Security Considerations

Running insecure mode has these implications:

1. **Traffic in the cluster is unencrypted**: Anyone who can sniff cluster network traffic can see ArgoCD credentials and manifests
2. **No certificate verification**: CLI clients cannot verify they are talking to the real ArgoCD server
3. **Credentials sent in cleartext**: Unless an external TLS terminator is in front

Mitigations:

- Always use an ingress or load balancer with TLS in front of insecure ArgoCD
- Use Kubernetes network policies to restrict who can reach ArgoCD
- Consider Istio or Linkerd for mTLS within the cluster
- Never expose insecure ArgoCD directly to the internet

```yaml
# Network policy to restrict ArgoCD access
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: argocd-server-access
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 8080
          protocol: TCP
  policyTypes:
    - Ingress
```

## Switching Back to Secure Mode

To re-enable TLS on the ArgoCD server:

```bash
# Remove the insecure flag
kubectl patch configmap argocd-cmd-params-cm -n argocd --type json \
  -p '[{"op": "remove", "path": "/data/server.insecure"}]'

# Restart the server
kubectl rollout restart deployment argocd-server -n argocd

# Update your ingress to use HTTPS backend
# Change backend-protocol to "HTTPS" and port to 443
```

For production ingress configurations, see [ArgoCD with Nginx Ingress](https://oneuptime.com/blog/post/2026-02-26-argocd-nginx-ingress/view) and [TLS termination at load balancer](https://oneuptime.com/blog/post/2026-02-26-argocd-tls-termination-load-balancer/view).
