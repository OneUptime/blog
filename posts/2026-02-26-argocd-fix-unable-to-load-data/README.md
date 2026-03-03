# How to Fix 'Unable to load data' Error in ArgoCD UI

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, UI

Description: Diagnose and resolve the 'Unable to load data' error in the ArgoCD web UI, covering API server issues, authentication problems, and network configuration fixes.

---

The "Unable to load data" error in the ArgoCD UI is one of those vague messages that can mean dozens of different things. You open the ArgoCD dashboard, try to view your applications or click on a resource, and instead of useful information you get a blank screen or a red toast notification saying "Unable to load data." There is no stack trace, no helpful hint - just a dead end.

This guide covers the most common reasons behind this error and gives you concrete steps to fix each one.

## Understanding the Error

The ArgoCD UI is a single-page application that communicates with the ArgoCD API server over gRPC-web and REST endpoints. When you see "Unable to load data," it means the frontend could not successfully complete an API call to the backend. This could be caused by:

- The API server being down or unhealthy
- Authentication token expiration
- Network or ingress misconfiguration
- CORS or TLS issues
- The API server being overloaded

## Step 1: Check the ArgoCD API Server Health

First, verify the API server pod is running and healthy:

```bash
# Check pod status
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server

# Check for restarts or crash loops
kubectl describe pod -n argocd -l app.kubernetes.io/name=argocd-server
```

If the pod is in a `CrashLoopBackOff` or `Error` state, check the logs:

```bash
kubectl logs -n argocd deployment/argocd-server --tail=200
```

Common issues include:
- Missing or corrupted TLS certificates
- Unable to connect to the Redis cache
- Unable to connect to the repo server
- Database connection failures in HA mode

## Step 2: Verify Your Authentication Token

A very common reason for this error is an expired or invalid authentication token. The ArgoCD UI stores a JWT token in your browser's local storage, and when it expires, API calls fail silently with "Unable to load data."

**Quick fix - log out and log back in:**

1. Click on the user icon in the top left of the ArgoCD UI
2. Click **Log Out**
3. Log back in with your credentials or SSO

If you cannot even reach the login page, clear your browser's local storage for the ArgoCD domain:

```text
# In browser DevTools (F12) > Application > Local Storage
# Delete the 'token' entry for your ArgoCD domain
```

**Check token validity from CLI:**

```bash
# Try authenticating via CLI
argocd account get-user-info

# If the token is expired, re-login
argocd login argocd.example.com --username admin --password <password>
```

## Step 3: Check Ingress and Network Configuration

If you access ArgoCD through an ingress controller or load balancer, misconfigurations can cause intermittent "Unable to load data" errors, especially around gRPC communication.

**Common Nginx Ingress issues:**

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-ingress
  namespace: argocd
  annotations:
    # These annotations are critical for ArgoCD
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
    nginx.ingress.kubernetes.io/ssl-passthrough: "true"
    # Increase timeouts to prevent premature disconnects
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
spec:
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
```

**If using gRPC (which ArgoCD UI uses internally):**

ArgoCD uses gRPC-Web for real-time data streaming. If your load balancer does not support HTTP/2 or gRPC, you need to split the ingress into two:

```yaml
# HTTP ingress for the UI and REST API
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-http
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "HTTPS"
spec:
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
---
# gRPC ingress for the CLI and real-time streaming
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server-grpc
  namespace: argocd
  annotations:
    nginx.ingress.kubernetes.io/backend-protocol: "GRPC"
spec:
  rules:
    - host: grpc.argocd.example.com
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

## Step 4: Check for TLS Certificate Issues

TLS mismatches between the ingress and the ArgoCD server cause silent failures:

```bash
# Check if the ArgoCD server is running in insecure mode
kubectl get deployment argocd-server -n argocd -o yaml | grep -A5 "args:"
```

If you are terminating TLS at the load balancer, run ArgoCD in insecure mode:

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"
```

Then restart the server:

```bash
kubectl rollout restart deployment argocd-server -n argocd
```

## Step 5: Check Redis Connectivity

The ArgoCD API server relies on Redis for caching. If Redis is down or unreachable, API responses can fail:

```bash
# Check Redis pod status
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-redis

# Check Redis connectivity from the API server
kubectl exec -n argocd deployment/argocd-server -- \
  redis-cli -h argocd-redis.argocd.svc.cluster.local ping
```

You should see `PONG` as the response. If Redis is down, restart it:

```bash
kubectl rollout restart deployment argocd-redis -n argocd
```

## Step 6: Check Browser Console for Details

Open your browser's Developer Tools (F12) and check the Console and Network tabs:

1. **Console tab**: Look for JavaScript errors or failed API calls
2. **Network tab**: Filter by XHR/Fetch requests and look for failed calls (status 401, 403, 500, or network errors)

Common patterns you might see:

- **401 Unauthorized**: Token expired, log back in
- **403 Forbidden**: RBAC policy preventing access to the resource
- **502/504 Gateway errors**: Ingress or load balancer cannot reach the API server
- **CORS errors**: The ArgoCD server URL does not match the URL in the browser

**Fix CORS issues by setting the server URL:**

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.rootpath: ""
  server.basehref: "/"
```

## Step 7: Check RBAC Restrictions

If the "Unable to load data" error only appears for certain resources or applications, the problem might be RBAC. Your user may not have permission to read the specific resource.

```bash
# Test RBAC policies
argocd admin settings rbac can my-user get applications '*/*' \
  --policy-file argocd-rbac-cm.yaml
```

Check the RBAC ConfigMap for overly restrictive policies:

```bash
kubectl get configmap argocd-rbac-cm -n argocd -o yaml
```

## Step 8: API Server Overload

If you have hundreds or thousands of applications, the API server might struggle under load:

```bash
# Check API server resource usage
kubectl top pods -n argocd -l app.kubernetes.io/name=argocd-server

# Scale up the API server
kubectl scale deployment argocd-server -n argocd --replicas=3
```

Also consider increasing resource limits:

```yaml
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "2"
    memory: "2Gi"
```

## Quick Diagnostic Checklist

Run through this checklist when you encounter "Unable to load data":

1. Is the ArgoCD API server pod running? Check `kubectl get pods -n argocd`
2. Can you authenticate via CLI? Run `argocd account get-user-info`
3. Are there errors in the browser console? Open DevTools (F12)
4. Is Redis up? Check `kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-redis`
5. Is the ingress healthy? Check `kubectl describe ingress -n argocd`
6. Have you tried logging out and back in?

## Summary

The "Unable to load data" error in ArgoCD is almost always a communication problem between the UI frontend and the API server backend. Start by checking the API server health and your authentication token, then work through ingress configuration, TLS settings, and Redis connectivity. The browser's Developer Tools are your best friend for narrowing down the specific API call that is failing.
