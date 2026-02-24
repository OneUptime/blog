# How to Debug Storage Connectivity Issues with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Storage, Debugging, Kubernetes, Troubleshooting

Description: Step-by-step guide to diagnosing and fixing storage connectivity problems caused by Istio sidecar proxy interception and mesh configuration.

---

You deploy a storage system in your Kubernetes cluster, everything works fine, and then you enable Istio sidecar injection. Suddenly your application can't connect to the database. Or writes are timing out. Or replication between storage nodes is broken. This is a frustratingly common experience, and debugging it requires understanding how Istio intercepts traffic and where things can go wrong.

## Step 1: Confirm Istio is Actually the Problem

Before going down the Istio rabbit hole, verify that the issue is actually caused by the mesh. The quickest way is to temporarily disable sidecar injection on the storage pod and see if the problem goes away:

```bash
# Check if the sidecar is injected
kubectl get pod -n storage -l app=postgres -o jsonpath='{.items[0].spec.containers[*].name}'
```

If you see `istio-proxy` in the container list, the sidecar is active. Try running a test pod without the sidecar:

```bash
kubectl run debug-pod --image=postgres:15 -n storage \
  --annotations="sidecar.istio.io/inject=false" \
  --rm -it -- psql -h postgres.storage.svc.cluster.local -U admin -d mydb
```

If the connection works without the sidecar but fails with it, you've confirmed Istio is involved. Now you can dig into the specifics.

## Step 2: Check Proxy Status and Sync

The Istio sidecar needs to have the correct configuration synced from the control plane. If it's out of sync, routing breaks:

```bash
# Check proxy sync status
istioctl proxy-status

# Look for pods with status other than SYNCED
istioctl proxy-status | grep -v SYNCED
```

If your storage pods show `STALE` or `NOT SENT`, the control plane isn't reaching them properly. Check that istiod is healthy and that there are no network policies blocking communication between the sidecar and the control plane.

## Step 3: Examine the Proxy Configuration

Look at what Envoy thinks it should be doing with your storage traffic:

```bash
# Check listeners - these control what traffic the proxy intercepts
istioctl proxy-config listeners deploy/myapp -n default

# Check clusters - these are the upstream destinations
istioctl proxy-config clusters deploy/myapp -n default | grep postgres

# Check routes for HTTP services
istioctl proxy-config routes deploy/myapp -n default
```

For TCP services like databases, focus on the listeners and clusters output. The listener should be bound to the storage service's ClusterIP and port, and the cluster should show the correct endpoints.

```bash
# Get detailed cluster info
istioctl proxy-config clusters deploy/myapp -n default \
  --fqdn postgres.storage.svc.cluster.local -o json
```

## Step 4: Verify Protocol Detection

Istio needs to know whether traffic is HTTP or TCP. If it guesses wrong, connections break. Storage protocols are almost always TCP, so your service ports need to be named correctly:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: postgres
  namespace: storage
spec:
  ports:
  - name: tcp-postgres    # Must start with "tcp-" for TCP protocol
    port: 5432
    targetPort: 5432
  selector:
    app: postgres
```

If the port is named `postgres` without the `tcp-` prefix, Istio might try to parse it as HTTP and corrupt the database wire protocol. This is probably the single most common cause of storage connectivity issues with Istio.

Check what protocol Istio detected:

```bash
istioctl proxy-config clusters deploy/myapp -n default \
  --fqdn postgres.storage.svc.cluster.local -o json | \
  jq '.[0].metadata'
```

## Step 5: Check mTLS Configuration

mTLS mismatches between source and destination cause silent connection failures. The storage pod might expect plain TCP but the client's sidecar is sending mTLS, or vice versa:

```bash
# Check what mTLS mode is active for the storage service
istioctl authn tls-check deploy/myapp.default postgres.storage.svc.cluster.local
```

The output shows the client-side and server-side TLS settings. If they don't match, connections will fail. Fix it with a PeerAuthentication resource:

```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: storage-mtls
  namespace: storage
spec:
  selector:
    matchLabels:
      app: postgres
  mtls:
    mode: PERMISSIVE
```

PERMISSIVE mode accepts both plaintext and mTLS, which is a good starting point for debugging. Once things work, you can switch to STRICT.

## Step 6: Look at Proxy Logs

The Envoy sidecar logs are incredibly useful for debugging, but you need to increase the log level first:

```bash
# Increase log level for the proxy on your app pod
istioctl proxy-config log deploy/myapp -n default --level debug

# Now tail the logs
kubectl logs deploy/myapp -n default -c istio-proxy -f

# After debugging, set it back to warning
istioctl proxy-config log deploy/myapp -n default --level warning
```

Look for these common patterns in the logs:

- `upstream connect error or disconnect/reset before headers` - the storage service rejected the connection or isn't reachable
- `no healthy upstream` - Envoy can't find any healthy endpoints for the storage service
- `connection timeout` - the storage service isn't responding in time
- `protocol error` - Istio is trying to parse the traffic as the wrong protocol

## Step 7: Test from Inside the Sidecar

You can exec into the sidecar container itself and test connectivity:

```bash
# Get a shell in the istio-proxy container
kubectl exec -n default deploy/myapp -c istio-proxy -- \
  curl -v telnet://postgres.storage.svc.cluster.local:5432

# Check what endpoints Envoy knows about
kubectl exec -n default deploy/myapp -c istio-proxy -- \
  pilot-agent request GET /clusters | grep postgres
```

The `/clusters` endpoint on the admin interface shows you the actual upstream endpoints and their health status. If the storage endpoints show `unhealthy`, Envoy won't send traffic to them.

## Step 8: Check Init Container and iptables Rules

Istio uses an init container to set up iptables rules that redirect traffic through the sidecar. If these rules are wrong, traffic either bypasses the sidecar entirely or gets stuck in a redirect loop:

```bash
# Check the iptables rules inside the pod
kubectl exec -n default deploy/myapp -c istio-proxy -- \
  iptables -t nat -L -n -v
```

Look for rules that redirect traffic on port 5432 (or whatever your storage port is) to the Envoy listener port (typically 15001 for outbound). If the rules are missing, the init container might have failed.

## Step 9: Verify DNS Resolution

Sometimes the issue is simply DNS. The sidecar needs to resolve the storage service's hostname:

```bash
# Test DNS from the app container
kubectl exec -n default deploy/myapp -c myapp -- \
  nslookup postgres.storage.svc.cluster.local

# Check if the resolved IP matches the service
kubectl get svc postgres -n storage -o jsonpath='{.spec.clusterIP}'
```

## Step 10: Check for Network Policies

Kubernetes NetworkPolicies can block traffic between the sidecar and the storage pods. If you have network policies, make sure they allow traffic from the application namespace to the storage namespace on the required ports:

```bash
# List network policies in the storage namespace
kubectl get networkpolicy -n storage

# Describe them to see the rules
kubectl describe networkpolicy -n storage
```

## Common Quick Fixes

If you're in a hurry and need storage to work right now, here are the most common fixes:

1. Rename the service port to start with `tcp-`
2. Set PeerAuthentication to PERMISSIVE for the storage namespace
3. Add port exclusion annotations for non-standard storage ports
4. Check that `holdApplicationUntilProxyStarts` is true in your mesh config

These won't solve every problem, but they cover about 80% of the storage connectivity issues people run into with Istio. Once your storage is working, go back and tighten the configuration to match your security requirements.
