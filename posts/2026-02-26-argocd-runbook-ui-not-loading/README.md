# ArgoCD Runbook: UI Not Loading

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Runbook, Troubleshooting

Description: A step-by-step operational runbook for diagnosing and fixing ArgoCD UI issues including blank pages, loading timeouts, WebSocket errors, and Ingress misconfigurations.

---

When the ArgoCD UI stops loading, developers lose visibility into their deployments. They cannot see application status, trigger syncs, or inspect resource details. While the CLI and API may still work, most teams rely heavily on the UI for day-to-day operations. This runbook covers the most common causes of UI failures and how to fix them.

## Symptoms

- The ArgoCD URL shows a blank page or endless loading spinner
- The browser shows "502 Bad Gateway" or "503 Service Unavailable"
- The UI partially loads but shows "Unable to connect to ArgoCD server"
- WebSocket connection errors appear in the browser console
- The login page loads but after authentication it redirects to a blank page

## Impact Assessment

**Severity:** P3 (CLI still works) to P2 (if the team has no CLI access configured)

**Impact:** Developers cannot visually inspect application status or trigger syncs through the UI. The CLI and API remain functional as alternatives.

## Diagnostic Steps

### Step 1: Check the API Server Pod

The ArgoCD UI is served by the API server (argocd-server).

```bash
# Check if the API server is running
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server

# Check for recent restarts
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server -o wide

# Check pod events
kubectl describe pod -n argocd -l app.kubernetes.io/name=argocd-server | tail -30

# Check API server logs
kubectl logs -n argocd deployment/argocd-server --tail=200
```

### Step 2: Test the Service Endpoint

```bash
# Check the Kubernetes service
kubectl get svc -n argocd argocd-server

# Test direct connectivity from within the cluster
kubectl run test-curl --rm -it --image=curlimages/curl --restart=Never -- \
  curl -kv https://argocd-server.argocd.svc.cluster.local:443/healthz

# Check the health endpoint
kubectl exec -n argocd deployment/argocd-server -- curl -k https://localhost:8080/healthz
```

### Step 3: Check Ingress or Load Balancer

```bash
# Check the Ingress resource
kubectl get ingress -n argocd

# Check Ingress details
kubectl describe ingress -n argocd argocd-server

# Check Ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=100 | grep argocd

# If using a load balancer, check its status
kubectl get svc -n argocd argocd-server -o jsonpath='{.status.loadBalancer}'
```

### Step 4: Check TLS Certificate

```bash
# Check TLS certificate on the Ingress
kubectl get secret -n argocd argocd-server-tls -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout | grep -A2 "Not"

# Test TLS from outside the cluster
openssl s_client -connect argocd.example.com:443 -servername argocd.example.com </dev/null 2>/dev/null | openssl x509 -noout -dates
```

### Step 5: Check Browser Console

Open the browser developer tools (F12) and check for errors.

Common error patterns:

- **Mixed content errors:** The UI is loaded over HTTPS but tries to connect to WebSocket over HTTP
- **CORS errors:** The API server is not configured for the correct hostname
- **WebSocket errors:** Ingress is not forwarding WebSocket connections
- **404 on API calls:** Base URL is misconfigured

## Root Causes and Resolutions

### Cause 1: API Server Not Running

```bash
# Check pod status
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-server

# If the pod is in CrashLoopBackOff, check logs
kubectl logs -n argocd deployment/argocd-server --previous --tail=100

# Common crash causes:
# - TLS certificate issues
# - Dex configuration errors
# - Redis connection failure

# Restart the API server
kubectl rollout restart deployment/argocd-server -n argocd
kubectl rollout status deployment/argocd-server -n argocd
```

### Cause 2: Ingress Not Forwarding WebSocket

The ArgoCD UI uses WebSocket for real-time updates. If the Ingress does not support WebSocket, the UI loads but shows stale data or connection errors.

```yaml
# Nginx Ingress: Add WebSocket annotations
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: argocd-server
  namespace: argocd
  annotations:
    # Enable WebSocket support
    nginx.ingress.kubernetes.io/websocket-services: "argocd-server"
    # Increase timeouts for long-lived WebSocket connections
    nginx.ingress.kubernetes.io/proxy-read-timeout: "3600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "3600"
    # Required for gRPC (CLI uses gRPC through the same endpoint)
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
```

```bash
# Apply the fix
kubectl apply -f ingress.yaml

# Force Ingress controller to reload
kubectl rollout restart deployment/ingress-nginx-controller -n ingress-nginx
```

### Cause 3: Base URL Mismatch

If ArgoCD is behind a reverse proxy with a path prefix, the base URL must be configured.

```yaml
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Set the base URL if ArgoCD is not at the root path
  server.basehref: "/argocd"
  # Set the root path
  server.rootpath: "/argocd"
```

```bash
# Restart after changing the ConfigMap
kubectl rollout restart deployment/argocd-server -n argocd
```

### Cause 4: TLS Termination Misconfiguration

ArgoCD's API server serves HTTPS by default. If your Ingress also terminates TLS, you get double encryption which can cause issues.

```yaml
# Option 1: Disable TLS on the API server (let Ingress handle it)
# argocd-cmd-params-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.insecure: "true"  # Disable TLS on the API server
```

```yaml
# Then use HTTP backend in Ingress
annotations:
  nginx.ingress.kubernetes.io/backend-protocol: "HTTP"
```

```bash
# Option 2: Use passthrough TLS (Ingress passes encrypted traffic directly)
# This works with some Ingress controllers
annotations:
  nginx.ingress.kubernetes.io/ssl-passthrough: "true"
```

### Cause 5: Dex Server Down (SSO Login Failure)

If Dex is down, users cannot log in through SSO. The login page may load but authentication fails.

```bash
# Check Dex pod
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-dex-server

# Check Dex logs
kubectl logs -n argocd deployment/argocd-dex-server --tail=100

# Restart Dex
kubectl rollout restart deployment/argocd-dex-server -n argocd

# Workaround: use the local admin account
argocd login argocd.example.com --username admin --password $(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)
```

### Cause 6: Redis Down (Session Loss)

If Redis is down, existing sessions are lost and users are logged out.

```bash
# Check Redis
kubectl get pods -n argocd -l app.kubernetes.io/name=argocd-redis
kubectl exec -n argocd deployment/argocd-redis -- redis-cli ping

# If Redis is down, restart it
kubectl rollout restart deployment/argocd-redis -n argocd

# Then restart the API server to re-establish the connection
kubectl rollout restart deployment/argocd-server -n argocd
```

## Verification

```bash
# Verify the API server is responding
curl -k https://argocd.example.com/healthz
# Should return: "ok"

# Verify the API endpoint is working
curl -k https://argocd.example.com/api/version
# Should return JSON with version info

# Test CLI connectivity (verifies both gRPC and API)
argocd version --server argocd.example.com

# Open the UI in a browser and verify:
# 1. Login page loads
# 2. Authentication succeeds
# 3. Application list is visible
# 4. Real-time updates work (check WebSocket in browser dev tools)
```

## Prevention

1. Configure Ingress with WebSocket support from the start
2. Set up a health check that monitors the `/healthz` endpoint
3. Use separate Ingress rules for gRPC (CLI) and HTTPS (UI) if your Ingress controller requires it
4. Document the TLS termination strategy (at Ingress or at API server, not both)
5. Test the UI after every ArgoCD upgrade or Ingress change

## Escalation

If the UI still does not load after checking all the above:

- Check browser network tab for the specific failing requests
- Compare the working CLI configuration with the UI endpoint
- Check if a network policy is blocking traffic between the Ingress and ArgoCD namespace
- Escalate to the network/platform team with the specific HTTP error codes
