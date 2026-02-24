# How to Create Runbook for Istio Network Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Kubernetes, Runbook, Networking, Troubleshooting

Description: A runbook for diagnosing and fixing network connectivity issues in Istio service mesh including DNS failures, routing problems, and connection resets.

---

Network issues in Istio are frustrating because there are so many layers involved. Traffic goes through iptables rules, Envoy sidecars, Kubernetes services, and the actual network fabric. When something breaks, figuring out where the problem is takes a methodical approach. This runbook gives you the diagnostic steps to isolate and fix the most common network problems in an Istio mesh.

## Runbook: Istio Network Issues

### Purpose
Diagnose and resolve network connectivity issues in the Istio service mesh.

### Common Symptoms

| Symptom | Likely Cause |
|---|---|
| Connection refused | Sidecar not injected, port mismatch |
| Connection reset | Timeout, circuit breaker, protocol mismatch |
| 503 errors | No healthy upstream, connection pool exhaustion |
| 404 errors | Route not configured, VirtualService mismatch |
| DNS resolution failure | DNS capture issue, ServiceEntry missing |
| Intermittent failures | Outlier detection, load balancing issues |

### Step 1: Verify Basic Connectivity

Start by determining whether the issue is inside or outside the mesh:

```bash
# Test from inside the sidecar (through the mesh)
kubectl exec <pod> -c <app-container> -- \
  curl -s -o /dev/null -w "HTTP Status: %{http_code}\nTime: %{time_total}s\n" \
  http://<service>:<port>/health

# Test bypassing the sidecar (direct to pod IP)
DEST_IP=$(kubectl get pod <dest-pod> -n <namespace> -o jsonpath='{.status.podIP}')
kubectl exec <source-pod> -c <app-container> -- \
  curl -s -o /dev/null -w "HTTP Status: %{http_code}\n" \
  http://$DEST_IP:<container-port>/health

# If direct works but mesh traffic fails, the issue is in Istio/Envoy configuration
```

### Step 2: Check Sidecar Status

```bash
# Verify sidecar is injected (should show 2/2 containers)
kubectl get pod <pod> -n <namespace>

# Check sidecar is healthy
kubectl exec <pod> -n <namespace> -c istio-proxy -- \
  curl -s localhost:15021/healthz/ready

# Check sidecar sync status
istioctl proxy-status | grep <pod>
# Should show SYNCED for all columns
```

If the sidecar is not injected:

```bash
# Check namespace label
kubectl get namespace <namespace> --show-labels | grep istio

# Check for injection exceptions on the pod
kubectl get pod <pod> -n <namespace> -o jsonpath='{.metadata.annotations}' | grep sidecar

# Check if the webhook is present
kubectl get mutatingwebhookconfiguration | grep istio
```

### Step 3: Diagnose DNS Issues

DNS problems are a common source of connectivity failures in Istio:

```bash
# Test DNS resolution from the app container
kubectl exec <pod> -c <app-container> -- nslookup <service>.<namespace>.svc.cluster.local

# Test DNS resolution from the sidecar
kubectl exec <pod> -c istio-proxy -- curl -s localhost:15000/config_dump | \
  grep -A 5 "dns_table"

# Check if DNS capture is enabled
istioctl proxy-config bootstrap <pod> -n <namespace> | grep DNS_CAPTURE
```

For external services, check if a ServiceEntry exists:

```bash
# List ServiceEntries
kubectl get serviceentries --all-namespaces

# If external service is not reachable, create a ServiceEntry
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: <namespace>
spec:
  hosts:
    - api.external-service.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
EOF
```

### Step 4: Diagnose Routing Issues

```bash
# Check what routes the proxy knows about
istioctl proxy-config route <pod> -n <namespace>

# Check for the specific destination
istioctl proxy-config route <pod> -n <namespace> --name <port>

# Check listener configuration
istioctl proxy-config listener <pod> -n <namespace>

# Check endpoints for the destination service
istioctl proxy-config endpoint <pod> -n <namespace> --cluster "outbound|<port>||<service>.<namespace>.svc.cluster.local"
```

If endpoints are empty, the issue is likely with service discovery:

```bash
# Check the Kubernetes service exists
kubectl get svc <service> -n <namespace>

# Check endpoints exist
kubectl get endpoints <service> -n <namespace>

# Check that pods match the service selector
kubectl get pods -n <namespace> -l <selector-labels>
```

### Step 5: Diagnose 503 Errors

503 errors from Envoy come with response flags that tell you why:

```bash
# Check access logs for response flags
kubectl logs <pod> -n <namespace> -c istio-proxy --tail=100 | grep "503"

# Common response flags:
# UF = upstream connection failure
# UO = upstream overflow (circuit breaker)
# NR = no route configured
# DC = downstream connection termination
# URX = upstream retry limit exceeded
```

For each flag:

**UF (Upstream Failure):**
```bash
# Check if destination pods are healthy
kubectl get pods -n <dest-namespace> -l app=<dest-app>

# Check endpoint health in Envoy
kubectl exec <pod> -c istio-proxy -- \
  curl -s localhost:15000/clusters | grep <dest-service> | grep health
```

**UO (Upstream Overflow):**
```bash
# Check circuit breaker stats
kubectl exec <pod> -c istio-proxy -- \
  curl -s localhost:15000/stats | grep upstream_rq_pending_overflow

# Increase connection pool limits
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: increase-pool
  namespace: <namespace>
spec:
  host: <service>
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 1000
      http:
        maxRequestsPerConnection: 0
        maxRetries: 3
EOF
```

**NR (No Route):**
```bash
# Check VirtualService configuration
kubectl get virtualservices -n <namespace>

# Check Gateway configuration for ingress issues
kubectl get gateways --all-namespaces

# Run analysis
istioctl analyze -n <namespace>
```

### Step 6: Diagnose Connection Resets

Connection resets can be caused by protocol detection issues:

```bash
# Check if the service port is named correctly
kubectl get svc <service> -n <namespace> -o jsonpath='{.spec.ports[*].name}'
# Port names should follow convention: http-*, grpc-*, tcp-*

# If port name is wrong, fix it
kubectl patch svc <service> -n <namespace> --type=json \
  -p='[{"op": "replace", "path": "/spec/ports/0/name", "value": "http-web"}]'
```

Check for protocol mismatch:

```bash
# If your service uses HTTP/2 or gRPC, ensure DestinationRule specifies it
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: grpc-service
  namespace: <namespace>
spec:
  host: <service>
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
    portLevelSettings:
      - port:
          number: 8080
        connectionPool:
          http:
            h2UpgradePolicy: UPGRADE
EOF
```

### Step 7: Diagnose Ingress Gateway Issues

```bash
# Check the gateway is receiving traffic
kubectl logs -n istio-system deploy/istio-ingressgateway --tail=50

# Check listener configuration on the gateway
istioctl proxy-config listener deploy/istio-ingressgateway -n istio-system

# Check routes on the gateway
istioctl proxy-config route deploy/istio-ingressgateway -n istio-system

# Verify the Gateway resource matches the VirtualService
kubectl get gateway -A -o yaml | grep -A10 "servers:"
kubectl get virtualservice -A -o yaml | grep -A5 "gateways:"

# Test from outside the cluster
INGRESS_IP=$(kubectl get svc istio-ingressgateway -n istio-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -v http://$INGRESS_IP -H "Host: myapp.example.com"
```

### Step 8: Check iptables Rules

If sidecar is injected but traffic is not flowing through it:

```bash
# Check iptables rules in the pod
kubectl exec <pod> -c istio-proxy -- iptables -t nat -L -n -v

# Check the init container logs
kubectl logs <pod> -c istio-init
```

### Network Troubleshooting Decision Tree

```
Traffic not working?
├── Is sidecar injected? (kubectl get pod - look for 2/2)
│   ├── No → Check namespace label, webhook
│   └── Yes → Continue
├── Is sidecar synced? (istioctl proxy-status)
│   ├── STALE → Check istiod health
│   └── SYNCED → Continue
├── Can you reach the service directly (bypassing mesh)?
│   ├── No → Kubernetes/network issue, not Istio
│   └── Yes → Istio configuration issue
├── What HTTP status code?
│   ├── 503 → Check response flags (UF, UO, NR)
│   ├── 404 → Check routes (istioctl proxy-config route)
│   ├── 403 → Check AuthorizationPolicy
│   └── Connection reset → Check protocol, port naming
└── Is it intermittent?
    ├── Yes → Check outlier detection, load balancing
    └── No → Check config, endpoints, DNS
```

### Quick Reference

```bash
# The most useful diagnostic commands in order
istioctl proxy-status                           # Overview
istioctl analyze -n <namespace>                 # Config validation
istioctl proxy-config listener <pod>            # Listeners
istioctl proxy-config route <pod>               # Routes
istioctl proxy-config cluster <pod>             # Clusters
istioctl proxy-config endpoint <pod>            # Endpoints
kubectl logs <pod> -c istio-proxy --tail=100    # Sidecar logs
kubectl exec <pod> -c istio-proxy -- curl localhost:15000/stats  # Envoy stats
```

Keep this runbook handy. Network issues in a service mesh follow predictable patterns, and once you have diagnosed a few of them, the process becomes second nature.
