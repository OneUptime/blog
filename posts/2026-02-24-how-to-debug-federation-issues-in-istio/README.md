# How to Debug Federation Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Federation, Debugging, Troubleshooting, Kubernetes

Description: Practical debugging techniques for common Istio federation problems including connectivity failures, discovery issues, and configuration mismatches.

---

Federation issues in Istio can be some of the most frustrating problems to debug. When something breaks, the failure could be in either mesh, in the gateway between them, in the trust configuration, in service discovery, or in a dozen other places. Knowing where to look and what tools to use saves hours of headache.

This post walks through the most common federation problems and how to systematically track them down.

## Start with the Basics: Connectivity Check

Before anything else, verify that the east-west gateways can actually reach each other. Get the gateway IPs:

```bash
kubectl get svc istio-eastwestgateway -n istio-system --context=cluster-west \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

kubectl get svc istio-eastwestgateway -n istio-system --context=cluster-east \
  -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```

Test connectivity from one cluster to the other gateway:

```bash
kubectl run --context=cluster-west -n istio-system --rm -it --image=busybox:1.36 \
  test-connectivity -- nc -zv <east-gateway-ip> 15443
```

If this times out, you have a network-level problem. Check firewall rules, security groups, and VPN connectivity. No amount of Istio debugging will help if the networks can't talk to each other.

## Debugging Service Discovery Failures

If services in mesh-west can't see services in mesh-east, check the remote secret first:

```bash
kubectl get secrets -n istio-system --context=cluster-west | grep istio-remote-secret
```

If the remote secret exists, check if istiod can actually use it to connect to the remote API server:

```bash
kubectl logs -n istio-system -l app=istiod --context=cluster-west | grep "remote cluster"
```

Look for messages like "Failed to connect to remote cluster" or "error listing services." These tell you that istiod has the secret but can't reach the remote API server.

Check what endpoints the proxy actually knows about:

```bash
istioctl proxy-config endpoints \
  $(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' \
  --context=cluster-west) \
  --context=cluster-west | grep -i "checkout"
```

If remote endpoints are missing, the discovery chain is broken somewhere.

## Debugging mTLS Handshake Failures

Cross-mesh mTLS failures usually show up as connection resets or "upstream connect error" messages. Start by checking the proxy logs on the client side:

```bash
kubectl logs $(kubectl get pod -n sample -l app=sleep \
  -o jsonpath='{.items[0].metadata.name}' --context=cluster-west) \
  -c istio-proxy --context=cluster-west --tail=50
```

Look for TLS-related errors like:

- `TLS error: 268435581:SSL routines:OPENSSL_internal:CERTIFICATE_VERIFY_FAILED`
- `upstream connect error or disconnect/reset before headers`

Check the certificate chain on both sides:

```bash
# Client side
istioctl proxy-config secret \
  $(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' \
  --context=cluster-west) --context=cluster-west

# Server side
istioctl proxy-config secret \
  $(kubectl get pod -n sample -l app=helloworld -o jsonpath='{.items[0].metadata.name}' \
  --context=cluster-east) --context=cluster-east
```

The output shows the root cert, cert chain, and expiry. Make sure:

1. The certificates are not expired
2. Both sides share the same root CA (or have each other's root in their trust bundle)
3. The SPIFFE trust domains match or aliases are configured

## Debugging Configuration Sync Issues

Sometimes the configuration is correct but istiod isn't pushing it to the proxies. Check the proxy sync status:

```bash
istioctl proxy-status --context=cluster-west
```

The output shows each proxy and whether it's `SYNCED`, `NOT SENT`, or `STALE`. If proxies are `STALE`, istiod is behind on pushing configurations.

Check istiod's push metrics:

```bash
kubectl exec -n istio-system \
  $(kubectl get pod -n istio-system -l app=istiod -o jsonpath='{.items[0].metadata.name}' \
  --context=cluster-west) --context=cluster-west \
  -- curl -s localhost:15014/metrics | grep pilot_xds_push
```

High push error counts indicate configuration problems. Look at the istiod logs for details:

```bash
kubectl logs -n istio-system -l app=istiod --context=cluster-west --tail=200 | grep -i error
```

## Debugging Gateway Issues

If services are discoverable but requests through the east-west gateway fail, check the gateway's listener configuration:

```bash
istioctl proxy-config listeners \
  $(kubectl get pod -n istio-system -l istio=eastwestgateway \
  -o jsonpath='{.items[0].metadata.name}' --context=cluster-west) \
  --context=cluster-west
```

You should see a listener on port 15443 with SNI-based routing. If it's missing, the Gateway resource might not be applied correctly.

Check the gateway's routes:

```bash
istioctl proxy-config routes \
  $(kubectl get pod -n istio-system -l istio=eastwestgateway \
  -o jsonpath='{.items[0].metadata.name}' --context=cluster-west) \
  --context=cluster-west
```

And check the clusters (upstream endpoints):

```bash
istioctl proxy-config clusters \
  $(kubectl get pod -n istio-system -l istio=eastwestgateway \
  -o jsonpath='{.items[0].metadata.name}' --context=cluster-west) \
  --context=cluster-west | grep checkout
```

If the target service doesn't appear in the clusters list, the gateway doesn't know how to route traffic to it.

## The Envoy Admin Interface

For deep debugging, use the Envoy admin interface directly. Port-forward to the sidecar:

```bash
kubectl port-forward -n sample \
  $(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' \
  --context=cluster-west) \
  15000:15000 --context=cluster-west
```

Then check the config dump:

```bash
curl -s localhost:15000/config_dump | python3 -m json.tool | less
```

This shows you the complete Envoy configuration, including all listeners, routes, clusters, and endpoints. Search for the remote service name to see exactly how it's configured.

Check the stats for specific clusters:

```bash
curl -s localhost:15000/stats | grep "cluster.outbound|8080||checkout.shop"
```

Look at counters like `upstream_cx_connect_fail`, `upstream_cx_connect_timeout`, and `upstream_rq_retry` to understand what's happening at the connection level.

## Common Issues and Quick Fixes

**"No healthy upstream"**: The remote endpoints are known but marked as unhealthy. Check outlier detection settings, they might be too aggressive. Also verify that health checks can actually reach the remote pods through the gateway.

**"Connection reset by peer"**: Usually an mTLS mismatch. One side expects mTLS and the other doesn't, or the certificates don't chain to a trusted root.

**"Request timeout"**: The default timeout might be too short for cross-mesh requests. Check your VirtualService timeout settings and increase them if needed.

**Services appear then disappear**: This is often a remote secret expiry issue. The Kubernetes token in the remote secret has a limited lifetime. Check if the token is still valid:

```bash
kubectl get secret -n istio-system --context=cluster-west \
  -o json | jq '.items[] | select(.metadata.name | startswith("istio-remote-secret")) | .metadata.annotations'
```

**Intermittent failures**: If cross-mesh requests work sometimes but not others, it could be a load balancing issue. Some endpoints might be local (working fine) while others are remote (failing). Check endpoint locality:

```bash
istioctl proxy-config endpoints \
  $(kubectl get pod -n sample -l app=sleep -o jsonpath='{.items[0].metadata.name}' \
  --context=cluster-west) --context=cluster-west \
  --cluster "outbound|8080||checkout.shop.svc.cluster.local" -o json
```

Look at the `locality` field for each endpoint to see which are local and which are remote.

## A Systematic Approach

When you hit a federation issue, work through these layers in order:

1. Network connectivity between gateways
2. Remote secret validity and API server access
3. Service discovery (are endpoints showing up in proxy config?)
4. Trust and mTLS (certificates valid and trusted?)
5. Authorization policies (is the request allowed?)
6. Traffic policies (timeouts, circuit breakers, retries)

Going through this systematically instead of jumping around randomly will save you time and sanity.
