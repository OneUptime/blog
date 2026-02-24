# How to Debug Why External Service is Not Reachable

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, ServiceEntry, External Services, Debugging, Kubernetes

Description: How to troubleshoot connectivity issues to external services from within an Istio mesh including ServiceEntry configuration and outbound policies.

---

You're inside the Istio mesh and trying to call an external API, a database, or some other service outside the cluster. It doesn't work. Maybe you get a connection refused, a 502 error, or the request just hangs. This happens because Istio's sidecar proxy intercepts all outbound traffic, and by default, it may block or mishandle requests to services it doesn't know about.

## How Istio Handles Outbound Traffic

By default, Istio's outbound traffic policy is `ALLOW_ANY`, which means the sidecar allows traffic to any external service. But this can be changed to `REGISTRY_ONLY`, which blocks traffic to any host not registered in the mesh's service registry.

Check your current policy:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep outboundTrafficPolicy
```

If you see `mode: REGISTRY_ONLY`, that's likely the problem. Only services registered via Kubernetes Services or Istio ServiceEntries will be accessible.

## Step 1: Check the Outbound Traffic Policy

```bash
istioctl proxy-config clusters deploy/my-app -n production | grep "PassthroughCluster"
```

If `PassthroughCluster` is present, the policy is `ALLOW_ANY` and unknown traffic is passed through. If it's missing or shows as blackhole, the policy is `REGISTRY_ONLY`.

## Step 2: Test Basic Connectivity

First, confirm the issue is Istio-related by testing from a pod without a sidecar:

```bash
# Create a pod without sidecar injection
kubectl run test-no-sidecar --image=curlimages/curl \
  --labels="sidecar.istio.io/inject=false" \
  --command -- sleep 3600

# Test from the pod
kubectl exec test-no-sidecar -- curl -v https://api.example.com/health
```

If this works but the same request from a pod with a sidecar doesn't, Istio is the problem.

```bash
# Test from a pod with sidecar
kubectl exec deploy/my-app -n production -c my-app -- curl -v https://api.example.com/health
```

## Step 3: Create a ServiceEntry

If the outbound policy is `REGISTRY_ONLY`, you need a ServiceEntry to register the external service:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: production
spec:
  hosts:
    - api.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
```

Apply it:

```bash
kubectl apply -f service-entry.yaml
```

For HTTP services:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-http-api
  namespace: production
spec:
  hosts:
    - httpbin.org
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
```

## Step 4: Check Port and Protocol Configuration

A common mistake is getting the port or protocol wrong in the ServiceEntry. If your app makes an HTTPS connection, the protocol should be `TLS` (not `HTTPS`), because from the sidecar's perspective it's seeing TLS traffic that it can't decrypt:

```yaml
# For HTTPS destinations where the app initiates TLS
ports:
  - number: 443
    name: https
    protocol: TLS

# For HTTP destinations where you want Istio to originate TLS
ports:
  - number: 443
    name: https
    protocol: HTTPS
```

The difference:

- `TLS`: The app handles TLS. The sidecar just passes the encrypted traffic through.
- `HTTPS`: The sidecar terminates TLS from the app and re-encrypts to the destination.

For most external services where your app already uses HTTPS, use `protocol: TLS`.

## Step 5: Check DNS Resolution

Istio's DNS proxy might interfere with external DNS resolution. Check if DNS is working from inside the sidecar:

```bash
kubectl exec deploy/my-app -n production -c istio-proxy -- \
  pilot-agent request GET "/dns?hostname=api.example.com"
```

If DNS resolution fails, check if Istio's DNS proxy is enabled:

```bash
kubectl get configmap istio -n istio-system -o jsonpath='{.data.mesh}' | grep -A 5 dnsRefreshRate
```

You can also check DNS from the application container:

```bash
kubectl exec deploy/my-app -n production -c my-app -- nslookup api.example.com
```

## Step 6: Check Envoy Listeners and Routes

See what the proxy does with traffic to the external host:

```bash
# Check if there's a listener for port 443
istioctl proxy-config listeners deploy/my-app -n production --port 443

# Check the clusters (upstream destinations)
istioctl proxy-config clusters deploy/my-app -n production | grep api.example.com

# Check the endpoints
istioctl proxy-config endpoints deploy/my-app -n production | grep api.example.com
```

If the external service doesn't appear in clusters or endpoints, the ServiceEntry might not be applied correctly.

## Step 7: Handle TLS Origination

If you want Istio to handle TLS (so your app can make plain HTTP calls that get upgraded to HTTPS by the sidecar), configure a DestinationRule:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: production
spec:
  hosts:
    - api.example.com
  location: MESH_EXTERNAL
  ports:
    - number: 80
      name: http
      protocol: HTTP
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: external-api-tls
  namespace: production
spec:
  host: api.example.com
  trafficPolicy:
    tls:
      mode: SIMPLE
    portLevelSettings:
      - port:
          number: 80
        tls:
          mode: SIMPLE
          sni: api.example.com
```

Now your app can call `http://api.example.com` and the sidecar will upgrade it to HTTPS.

## Step 8: Check for Network Policies

Kubernetes NetworkPolicies might be blocking outbound traffic:

```bash
kubectl get networkpolicy -n production
```

If you have a default-deny egress policy, you need to allow traffic to the external service:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-api
  namespace: production
spec:
  podSelector:
    matchLabels:
      app: my-app
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
      ports:
        - port: 443
          protocol: TCP
```

## Step 9: Check Sidecar Resource Scope

If you have a Sidecar resource that limits outbound traffic, it might be blocking external services:

```bash
kubectl get sidecar -n production -o yaml
```

Look at the egress hosts:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: Sidecar
metadata:
  name: default
  namespace: production
spec:
  egress:
    - hosts:
        - "production/*"
        - "istio-system/*"
        # External services need to be listed here too!
```

If external services aren't in the egress list, add them:

```yaml
egress:
  - hosts:
      - "production/*"
      - "istio-system/*"
      - "*/api.example.com"  # Allow this external host
```

## Step 10: Debug with Envoy Access Logs

Enable access logging and see what happens:

```bash
kubectl logs deploy/my-app -n production -c istio-proxy --tail=20
```

Look for the external host in the access logs. Common response flags:

- `UF` (Upstream connection Failure): Can't connect to the external service
- `UH` (Upstream Unhealthy): No healthy endpoints
- `NR` (No Route): No route configured for this destination
- `DC` (Downstream Connection termination): Client disconnected

If you see `NR`, the ServiceEntry is missing or misconfigured. If you see `UF`, there's a network-level issue (firewall, DNS, etc.).

## Quick Fix: Switch to ALLOW_ANY

If you need a quick fix while you figure out the root cause:

```bash
istioctl install --set meshConfig.outboundTrafficPolicy.mode=ALLOW_ANY
```

This lets all outbound traffic through without requiring ServiceEntries. It's less secure but removes Istio as the potential blocker.

External service connectivity issues in Istio almost always come down to the outbound traffic policy and missing ServiceEntries. Check the policy first, then create the right ServiceEntry with the correct protocol, and verify with `proxy-config` commands that the proxy knows about the external destination.
