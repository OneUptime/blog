# How to Fix Connection Refused Errors in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Connection Refused, Troubleshooting, Networking, Envoy

Description: Diagnose and resolve connection refused errors in Istio service mesh caused by port mismatches, sidecar issues, mTLS conflicts, and network policies.

---

"Connection refused" in an Istio mesh means something very different from a typical Kubernetes networking problem. In a normal setup, connection refused means the target pod is not listening on that port. With Istio, the sidecar proxy sits in the middle, so connection refused could mean the sidecar is not ready, the port mapping is wrong, mTLS handshake failed, or half a dozen other things.

This guide covers every scenario where you might see connection refused errors and how to track down the real cause.

## Understanding Connection Refused in Istio

When a request flows through the mesh, it hits several components:

1. The source application sends to localhost (intercepted by iptables)
2. The source sidecar (Envoy) picks up the request
3. The source sidecar connects to the destination sidecar
4. The destination sidecar forwards to the destination application

A connection refused can happen at any of these steps. The trick is figuring out which one.

## Check the Sidecar Proxy Logs

Start with the access logs on both sides:

```bash
# Check the client sidecar logs
kubectl logs <client-pod> -c istio-proxy -n production --tail=50

# Check the server sidecar logs
kubectl logs <server-pod> -c istio-proxy -n production --tail=50
```

Look for entries with response flags like:

- `UF` - Upstream connection failure
- `DC` - Downstream connection termination
- `UC` - Upstream connection termination

## Cause 1: Application Not Listening on the Right Port

The most basic cause. Your application might be listening on `localhost:8080` instead of `0.0.0.0:8080`. With the sidecar, the destination proxy forwards traffic to `127.0.0.1:<port>`, so the application needs to listen on localhost or all interfaces.

```bash
# Check what the application is listening on
kubectl exec <pod-name> -c my-app -n production -- ss -tlnp

# You should see something like:
# LISTEN 0 128 *:8080 *:*
# Not:
# LISTEN 0 128 192.168.1.5:8080 *:*  (bound to a specific IP)
```

If the app is bound to a pod IP, it might not accept connections from the sidecar on 127.0.0.1. Fix the application to listen on `0.0.0.0` or `127.0.0.1`.

## Cause 2: Sidecar Not Ready

The sidecar proxy takes a moment to start. If your application starts sending requests before the sidecar is ready, those requests will be refused.

Check if the pod has the readiness probe for the sidecar:

```bash
kubectl get pod <pod-name> -n production -o yaml | grep -A 10 "istio-proxy"
```

You can configure the pod to wait for the sidecar to be ready using `holdApplicationUntilProxyStarts`:

```yaml
apiVersion: v1
kind: Pod
metadata:
  annotations:
    proxy.istio.io/config: |
      holdApplicationUntilProxyStarts: true
```

Or set it globally in the mesh config:

```yaml
meshConfig:
  defaultConfig:
    holdApplicationUntilProxyStarts: true
```

## Cause 3: Port Mismatch in Service Definition

The Kubernetes Service port must correctly map to the container port:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: orders-service
spec:
  ports:
    - name: http
      port: 8080       # What clients connect to
      targetPort: 8080  # What the container listens on
  selector:
    app: orders-service
```

If `targetPort` does not match what the application actually listens on, the sidecar will forward traffic to the wrong port and get a connection refused.

Check the mismatch:

```bash
# What port does the service map to?
kubectl get svc orders-service -n production -o jsonpath='{.spec.ports[*].targetPort}'

# What port is the container listening on?
kubectl exec <pod-name> -c orders-service -n production -- ss -tlnp
```

## Cause 4: mTLS Mode Mismatch

If the client expects plaintext but the server requires mTLS (or vice versa), the connection will be refused:

```bash
# Check mTLS status
istioctl authn tls-check <client-pod>.production orders-service.production.svc.cluster.local
```

The output shows whether the client and server agree on TLS mode. Fix mismatches by aligning PeerAuthentication and DestinationRule settings:

```yaml
# If the server requires STRICT mTLS
apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: default
  namespace: production
spec:
  mtls:
    mode: STRICT

# The client DestinationRule should use ISTIO_MUTUAL
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: orders-service
  namespace: production
spec:
  host: orders-service
  trafficPolicy:
    tls:
      mode: ISTIO_MUTUAL
```

If the destination does not have a sidecar, you need PERMISSIVE mode on the destination or DISABLE in the client DestinationRule.

## Cause 5: Network Policies Blocking Traffic

Kubernetes NetworkPolicies can block traffic between the sidecar and istiod, or between sidecars:

```bash
# Check for network policies
kubectl get networkpolicies -n production

# See the details
kubectl get networkpolicies -n production -o yaml
```

If you have a default deny policy, you need to allow:

- Traffic on port 15012 (istiod control plane)
- Traffic on port 15017 (istiod webhook)
- Traffic between sidecars on the application ports

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-istio-traffic
  namespace: production
spec:
  podSelector: {}
  ingress:
    - ports:
        - port: 15012
        - port: 15017
        - port: 15090
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: istio-system
      ports:
        - port: 15012
        - port: 15017
```

## Cause 6: Init Container Failed

If the `istio-init` container fails, iptables rules are not set up correctly. Traffic will not be intercepted by the sidecar, and depending on the configuration, connections might be refused:

```bash
# Check init container status
kubectl describe pod <pod-name> -n production | grep -A 5 "istio-init"

# Check init container logs
kubectl logs <pod-name> -c istio-init -n production
```

Common init container failures include missing NET_ADMIN capability or PodSecurityPolicy restrictions:

```bash
# Check for security context issues
kubectl get pod <pod-name> -n production -o jsonpath='{.spec.initContainers[?(@.name=="istio-init")].securityContext}'
```

## Cause 7: Service Entry Missing for External Services

If you are calling an external service and get connection refused, you might need a ServiceEntry:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: ServiceEntry
metadata:
  name: external-api
  namespace: production
spec:
  hosts:
    - api.external-service.com
  location: MESH_EXTERNAL
  ports:
    - number: 443
      name: https
      protocol: TLS
  resolution: DNS
```

Check if outbound traffic policy is set to REGISTRY_ONLY (which blocks undefined external services):

```bash
kubectl get configmap istio -n istio-system -o yaml | grep outboundTrafficPolicy
```

If it is REGISTRY_ONLY, all external services need a ServiceEntry.

## Debugging Steps Summary

Run through this sequence when you see connection refused:

```bash
# 1. Is the application listening?
kubectl exec <pod> -c app -n production -- ss -tlnp

# 2. Is the sidecar running?
kubectl get pod <pod> -n production -o jsonpath='{.status.containerStatuses[?(@.name=="istio-proxy")].ready}'

# 3. Can the sidecar reach the destination?
kubectl exec <pod> -c istio-proxy -n production -- curl -v http://destination:8080/health

# 4. mTLS status?
istioctl authn tls-check <pod>.production destination.production.svc.cluster.local

# 5. Network policies?
kubectl get networkpolicies -n production

# 6. Envoy endpoint health?
istioctl proxy-config endpoints <pod> -n production | grep destination

# 7. Init container ok?
kubectl logs <pod> -c istio-init -n production
```

Connection refused errors in Istio always have a concrete cause. Work through the layers systematically, from the application listening configuration to the sidecar proxy to the network policies, and you will find it.
