# How to Fix 'upstream connect error' When Accessing ArgoCD UI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Ingress

Description: Diagnose and fix the common 'upstream connect error or disconnect/reset before headers' error when accessing ArgoCD through an ingress controller.

---

The "upstream connect error or disconnect/reset before headers" message is one of the most frustrating errors you will encounter when setting up ArgoCD behind an ingress. The UI shows a blank page or error, and the message gives you almost no clue about what went wrong. This guide breaks down every cause of this error and shows you how to fix each one.

## What This Error Means

The error originates from the Envoy proxy (used by Istio) or the ingress controller's proxy layer. It means the proxy tried to connect to the ArgoCD server backend but failed. The connection was either refused, timed out, or was reset by the backend before any HTTP headers were sent.

The full error usually looks like:

```
upstream connect error or disconnect/reset before headers.
reset reason: connection failure, transport failure reason:
delayed connect error: 111
```

## Cause 1: ArgoCD Server Pod Not Running

The most basic cause. If the ArgoCD server pod crashed or is not ready, the ingress has no backend to connect to.

Check the pod status:

```bash
# Check if ArgoCD server is running
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server

# Check pod logs for errors
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-server --tail=50

# Check pod events
kubectl describe pod -n argocd -l app.kubernetes.io/name=argocd-server
```

Common reasons the server pod fails:

- Out of memory (increase resource limits)
- Failed to connect to Redis
- Failed to connect to the repo server
- TLS certificate issues

Fix resource issues:

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
          resources:
            requests:
              cpu: 100m
              memory: 256Mi
            limits:
              cpu: 500m
              memory: 512Mi
```

## Cause 2: TLS Protocol Mismatch

This is the most common cause. The ingress expects to talk to the backend using one protocol, but ArgoCD is configured for a different one.

**Scenario A**: Ingress sends HTTP but ArgoCD expects HTTPS (default).

```yaml
# WRONG - ingress sends HTTP to a backend expecting HTTPS
annotations:
  nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
# But ArgoCD server.insecure is NOT set to "true"
```

**Fix**: Either set ArgoCD to insecure mode:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"
```

Or tell the ingress to use HTTPS backend:

```yaml
annotations:
  nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
```

**Scenario B**: Ingress sends HTTPS but ArgoCD is in insecure mode.

```yaml
# WRONG - ingress sends HTTPS but ArgoCD is running insecure
annotations:
  nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
# And server.insecure: "true" is set
```

**Fix**: Match the backend protocol to the ArgoCD configuration:

```yaml
annotations:
  nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
```

## Cause 3: Wrong Service Port

The ingress is pointing to the wrong port on the ArgoCD service. ArgoCD server exposes two ports:

- Port 80 (HTTP) - used when `server.insecure` is true
- Port 443 (HTTPS) - used when ArgoCD handles its own TLS

```bash
# Check what ports the ArgoCD server service exposes
kubectl get svc argocd-server -n argocd -o yaml
```

Make sure your ingress backend port matches:

```yaml
# For insecure mode
backend:
  service:
    name: argocd-server
    port:
      number: 80  # Use 80 when server.insecure is true

# For TLS passthrough
backend:
  service:
    name: argocd-server
    port:
      number: 443  # Use 443 when ArgoCD handles TLS
```

## Cause 4: Istio Sidecar Conflicts

If you are using Istio and the ArgoCD namespace has sidecar injection enabled, the Envoy sidecar can intercept traffic and cause connection issues.

Check if ArgoCD has sidecars:

```bash
# Check if pods have 2/2 containers (indicates sidecar)
kubectl get pods -n argocd
```

Fix options:

```yaml
# Option 1: Disable sidecar for ArgoCD server
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-server
  namespace: argocd
spec:
  template:
    metadata:
      annotations:
        sidecar.istio.io/inject: "false"
```

```yaml
# Option 2: Configure peer authentication
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: argocd-server
  namespace: argocd
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  mtls:
    mode: PERMISSIVE
```

## Cause 5: Network Policies Blocking Traffic

If your cluster has NetworkPolicies, they might block traffic from the ingress controller namespace to the ArgoCD namespace.

Check for network policies:

```bash
kubectl get networkpolicies -n argocd
```

Create a policy that allows ingress traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-to-argocd
  namespace: argocd
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: argocd-server
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              # Label on your ingress controller namespace
              kubernetes.io/metadata.name: ingress-nginx
      ports:
        - port: 8080
          protocol: TCP
```

## Cause 6: Health Check Failures

The ingress controller marks the ArgoCD backend as unhealthy and refuses to route traffic.

Check health check status:

```bash
# For Nginx Ingress
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx | grep "argocd"

# Direct health check test
kubectl exec -n argocd deploy/argocd-server -- curl -s localhost:8080/healthz
```

## Cause 7: Proxy Buffer Too Small

ArgoCD can return large responses, especially for applications with many resources. If the proxy buffer is too small, the connection is reset.

Fix for Nginx:

```yaml
annotations:
  nginx.ingress.kubernetes.io/proxy-buffer-size: "64k"
  nginx.ingress.kubernetes.io/proxy-buffers-number: "4"
  nginx.ingress.kubernetes.io/proxy-body-size: "10m"
```

## Systematic Debugging Approach

When you encounter this error, work through this checklist:

```bash
# Step 1: Is ArgoCD server running?
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server

# Step 2: Can you access ArgoCD directly (bypassing ingress)?
kubectl port-forward svc/argocd-server -n argocd 8080:80
# Visit http://localhost:8080

# Step 3: Is the service reachable from within the cluster?
kubectl run test --rm -it --image=curlimages/curl -- \
  curl -v http://argocd-server.argocd.svc.cluster.local:80/healthz

# Step 4: Check ingress controller logs
kubectl logs -n ingress-nginx -l app.kubernetes.io/name=ingress-nginx --tail=100

# Step 5: Check ingress resource status
kubectl describe ingress -n argocd

# Step 6: Verify TLS configuration matches
kubectl get configmap argocd-cmd-params-cm -n argocd -o yaml
```

If port-forwarding works but the ingress does not, the problem is in the ingress configuration. If port-forwarding also fails, the problem is with ArgoCD itself.

## Quick Fix Summary

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| All requests fail | Pod not running | Check pod status and logs |
| Intermittent failures | Health check failing | Fix health check configuration |
| Only gRPC fails | Protocol mismatch | Use `--grpc-web` or fix backend protocol |
| Works locally, fails via ingress | TLS mismatch | Match `server.insecure` with backend-protocol |
| Works then stops | Resource limits | Increase memory/CPU limits |

For more on ArgoCD ingress configuration, see [configuring ArgoCD with Nginx Ingress](https://oneuptime.com/blog/post/2026-02-26-argocd-nginx-ingress/view) and [configuring gRPC and HTTPS Ingress](https://oneuptime.com/blog/post/2026-02-26-argocd-grpc-https-ingress/view).
