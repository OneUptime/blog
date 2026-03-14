# How to Access ArgoCD UI Through kubectl Port-Forward

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kubectl, Networking

Description: Learn how to access the ArgoCD web UI and API through kubectl port-forward for development, debugging, and when no ingress is available.

---

kubectl port-forward is the quickest way to access ArgoCD without setting up an ingress controller. It creates a tunnel from your local machine directly to the ArgoCD server pod or service inside the cluster. This is ideal for development environments, initial setup, debugging, and situations where you do not have or need an ingress.

## When to Use Port-Forward

Port-forward is the right choice when:

- You just installed ArgoCD and want to verify it works
- You are developing locally on Minikube, Kind, or K3s
- You need temporary access for debugging
- Your cluster does not have an ingress controller
- You want to access ArgoCD without exposing it publicly

It is not suitable for:

- Team-wide access (everyone needs to run their own port-forward)
- CI/CD pipelines that need programmatic access
- Production environments where stable URLs are needed

## Basic Port-Forward to ArgoCD Service

The simplest approach forwards a local port to the ArgoCD server service:

```bash
# Forward local port 8080 to ArgoCD server service port 443
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Then access the UI at:
# https://localhost:8080
```

You can also forward to port 80 if ArgoCD is running in insecure mode:

```bash
# Forward to HTTP port (if server.insecure is true)
kubectl port-forward svc/argocd-server -n argocd 8080:80

# Access at http://localhost:8080
```

## Port-Forward to a Specific Pod

If you need to target a specific pod (useful when running multiple replicas):

```bash
# Get the ArgoCD server pod name
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server

# Forward to a specific pod
kubectl port-forward pod/argocd-server-abc123def4-xyz56 -n argocd 8080:8080
```

## Getting the Initial Admin Password

When you first access ArgoCD, you need the admin password. Retrieve it:

```bash
# Get the initial admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Login with username: admin and the retrieved password
```

## Using Port-Forward with the ArgoCD CLI

The CLI can connect through port-forward too:

```bash
# Start port-forward in the background
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# Login to ArgoCD CLI through the forwarded port
argocd login localhost:8080 --insecure

# Now you can use CLI commands
argocd app list
argocd app sync my-app
argocd cluster list
```

The `--insecure` flag is needed because ArgoCD's self-signed certificate does not match `localhost`.

## Running Port-Forward in the Background

For a better development experience, run port-forward in the background:

```bash
# Run in background with nohup
nohup kubectl port-forward svc/argocd-server -n argocd 8080:443 > /dev/null 2>&1 &

# Save the PID to stop it later
echo $! > /tmp/argocd-pf.pid

# Stop port-forward when done
kill $(cat /tmp/argocd-pf.pid)
```

Or use a simple shell script:

```bash
#!/bin/bash
# argocd-forward.sh - Start ArgoCD port-forward with auto-restart

while true; do
  echo "Starting ArgoCD port-forward..."
  kubectl port-forward svc/argocd-server -n argocd 8080:443
  echo "Port-forward disconnected. Reconnecting in 3 seconds..."
  sleep 3
done
```

This script automatically reconnects if the port-forward drops, which happens frequently when your laptop sleeps or the pod restarts.

## Port-Forward with Address Binding

By default, port-forward only listens on localhost (127.0.0.1). To make it accessible from other machines on your network:

```bash
# Listen on all interfaces
kubectl port-forward svc/argocd-server -n argocd 8080:443 --address 0.0.0.0

# Listen on a specific interface
kubectl port-forward svc/argocd-server -n argocd 8080:443 --address 192.168.1.100
```

Be careful with `0.0.0.0` as it exposes ArgoCD to your entire network.

## Port-Forward Multiple ArgoCD Services

If you need to access multiple ArgoCD components for debugging, forward each in a separate terminal or background process:

```bash
# ArgoCD Server UI and API
kubectl port-forward svc/argocd-server -n argocd 8080:443 &

# ArgoCD Repo Server (for debugging manifest generation)
kubectl port-forward svc/argocd-repo-server -n argocd 8081:8081 &

# ArgoCD Redis (for debugging cache issues)
kubectl port-forward svc/argocd-redis -n argocd 6379:6379 &

# ArgoCD Dex Server (for debugging SSO)
kubectl port-forward svc/argocd-dex-server -n argocd 5556:5556 &
```

## Using Port-Forward with VS Code

If you use VS Code with the Kubernetes extension, you can set up port-forward through the UI:

1. Open the Kubernetes panel
2. Navigate to Namespaces > argocd > Services > argocd-server
3. Right-click and select "Port Forward"
4. Enter the local port (8080)

This creates a managed port-forward that you can start and stop from the VS Code panel.

## Common Issues and Fixes

**"Unable to listen on port"**: The port is already in use.

```bash
# Find what is using port 8080
lsof -i :8080

# Use a different port
kubectl port-forward svc/argocd-server -n argocd 9090:443
```

**Connection drops frequently**: This is a known kubectl limitation. The connection drops after a period of inactivity or when the pod restarts.

```bash
# Use the auto-restart script shown above, or try:
while true; do kubectl port-forward svc/argocd-server -n argocd 8080:443; sleep 1; done
```

**"error: unable to forward port because pod is not running"**: The ArgoCD server pod is not in Running state.

```bash
# Check pod status
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server
kubectl describe pod -n argocd -l app.kubernetes.io/name=argocd-server
```

**Slow Performance**: Port-forward adds latency because all traffic goes through the Kubernetes API server. For better performance, consider setting up a proper ingress.

**Certificate Warnings in Browser**: Expected behavior since ArgoCD's self-signed cert does not match localhost. Click through the warning or use `--insecure` with curl.

## Alternatives to Port-Forward

If port-forward is not working well for your use case, consider these alternatives:

1. **NodePort Service**: Expose ArgoCD on a node port for simple cluster access
2. **Ingress**: Set up proper ingress for production
3. **LoadBalancer Service**: Create a LoadBalancer service for cloud environments

```yaml
# NodePort service example
apiVersion: v1
kind: Service
metadata:
  name: argocd-server-nodeport
  namespace: argocd
spec:
  type: NodePort
  ports:
    - port: 443
      targetPort: 8080
      nodePort: 30443
  selector:
    app.kubernetes.io/name: argocd-server
```

For setting up proper ingress access, see our guides on [Nginx Ingress for ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-nginx-ingress/view) and [configuring ArgoCD with custom domains](https://oneuptime.com/blog/post/2026-02-26-argocd-custom-domain/view).
