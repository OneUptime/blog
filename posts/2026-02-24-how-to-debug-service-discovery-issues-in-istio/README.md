# How to Debug Service Discovery Issues in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Discovery, Debugging, Kubernetes, Troubleshooting

Description: A systematic approach to diagnosing and fixing service discovery problems in Istio including missing endpoints, stale configs, and proxy issues.

---

Service discovery issues in Istio can be maddening. Your service exists, the pod is running, the Kubernetes Service is defined, but something in the mesh can't find it. Or worse, it finds it sometimes but not others. These problems usually come down to a small set of root causes, and knowing where to look makes debugging much faster.

## The Service Discovery Chain

To debug effectively, you need to understand how service discovery works in Istio:

1. Kubernetes registers services and endpoints in its API server
2. Istiod watches the Kubernetes API and builds an internal service registry
3. Istiod pushes the registry (as Envoy xDS configuration) to every sidecar proxy
4. The sidecar proxy uses this configuration to route traffic

A break at any point in this chain causes service discovery failures. The debugging strategy is to check each step.

## Step 1: Verify the Kubernetes Service and Endpoints

Start with the basics. Is the Kubernetes Service correctly defined?

```bash
kubectl get svc my-service -n backend -o yaml
```

Check that:
- The selector labels match the pod labels
- The ports are correctly defined
- The service type is appropriate (ClusterIP for mesh-internal services)

Check the endpoints:

```bash
kubectl get endpoints my-service -n backend
```

If the endpoints list is empty, the service selector doesn't match any running pods. Compare labels:

```bash
kubectl get pods -n backend --show-labels | grep my-service
```

Make sure the pod labels match the service selector exactly. A common mistake is a typo in a label value.

## Step 2: Check Sidecar Injection

If the pod doesn't have an Istio sidecar, it won't participate in the mesh's service discovery.

```bash
kubectl get pods my-service-pod -n backend -o jsonpath='{.spec.containers[*].name}'
```

You should see `istio-proxy` in the container list. If it's missing:

```bash
kubectl get namespace backend -o jsonpath='{.metadata.labels}'
```

Make sure the namespace has `istio-injection: enabled` or the appropriate revision label.

## Step 3: Verify Istiod Has the Service

Check if istiod knows about the service:

```bash
istioctl proxy-status
```

This shows all proxies connected to istiod and their sync status. Look for your service's proxy. If it says `STALE`, the proxy hasn't received the latest configuration.

Check the service in istiod's registry:

```bash
kubectl exec deploy/istiod -n istio-system -- curl -s localhost:15014/debug/registryz | python3 -m json.tool | grep -A 10 "my-service"
```

If the service isn't in the registry, istiod hasn't picked it up from the Kubernetes API. Check istiod logs:

```bash
kubectl logs deploy/istiod -n istio-system | grep "my-service"
```

## Step 4: Check the Proxy Configuration

The proxy configuration is what Envoy actually uses for routing. Even if istiod has the service, the proxy might not.

Check if the destination service appears in the proxy's cluster configuration:

```bash
istioctl proxy-config cluster deploy/caller-service -n frontend | grep my-service
```

If it's not listed, a Sidecar resource might be filtering it out:

```bash
kubectl get sidecar -n frontend -o yaml
```

Look at the egress hosts. If the Sidecar limits egress to specific hosts and `my-service.backend.svc.cluster.local` isn't included, the proxy won't have a route for it.

Check the endpoints:

```bash
istioctl proxy-config endpoint deploy/caller-service -n frontend | grep my-service
```

You should see the IP addresses of the pods running `my-service`. If the endpoints are empty but the cluster exists, there's a problem with endpoint synchronization.

## Step 5: Check Listeners and Routes

Verify the listener configuration:

```bash
istioctl proxy-config listener deploy/caller-service -n frontend --port 8080
```

And the route configuration:

```bash
istioctl proxy-config route deploy/caller-service -n frontend -o json | python3 -m json.tool | grep -A 20 "my-service"
```

If the route doesn't exist, check for conflicting VirtualService configurations:

```bash
kubectl get virtualservice -A | grep my-service
```

A VirtualService that matches the same host but with incorrect routing can override the default service discovery behavior.

## Step 6: Test Connectivity

Try a direct call from the caller pod:

```bash
kubectl exec deploy/caller-service -n frontend -- curl -v http://my-service.backend.svc.cluster.local:8080/health
```

Look at the response:

- **Connection refused**: The proxy doesn't have a route for this destination, or the target pod isn't listening
- **503 Service Unavailable**: The proxy has the route but can't reach any healthy endpoints
- **404 Not Found**: The connection worked but the service returned a 404 (application issue, not discovery)
- **403 Forbidden**: An authorization policy is blocking the request
- **Connection timed out**: Network-level issue, possibly a NetworkPolicy or firewall

## Common Issues and Fixes

**Issue: Service shows in Kubernetes but not in proxy config**

This usually means a Sidecar resource is limiting visibility. Either remove the Sidecar resource or add the service to the egress hosts:

```yaml
apiVersion: networking.istio.io/v1
kind: Sidecar
metadata:
  name: caller-sidecar
  namespace: frontend
spec:
  egress:
  - hosts:
    - "./*"
    - "backend/*"
    - "istio-system/*"
```

**Issue: Endpoints are empty in proxy config**

Check if the pods are ready:

```bash
kubectl get pods -n backend -l app=my-service -o wide
```

Pods must be in the `Running` state with all containers ready. If the istio-proxy container isn't ready, the pod won't appear as an endpoint.

Check istiod's endpoint debug info:

```bash
kubectl exec deploy/istiod -n istio-system -- curl -s localhost:15014/debug/endpointz | python3 -m json.tool | grep -B 5 -A 10 "my-service"
```

**Issue: Intermittent discovery failures**

If service discovery works sometimes but not others, it might be a DNS issue. Check CoreDNS:

```bash
kubectl logs -l k8s-app=kube-dns -n kube-system
```

Or it could be a timing issue where the proxy configuration hasn't propagated yet. Check the sync status:

```bash
istioctl proxy-status deploy/caller-service -n frontend
```

Look at the CDS (Cluster Discovery Service) and EDS (Endpoint Discovery Service) columns. They should show `SYNCED`.

**Issue: Service discovery works within namespace but not across namespaces**

The DNS format for cross-namespace calls is `service-name.namespace.svc.cluster.local`. Make sure you're using the full FQDN:

```bash
kubectl exec deploy/caller -n frontend -- curl http://my-service.backend.svc.cluster.local:8080/health
```

Short names like `my-service` only work within the same namespace.

## Using istioctl analyze

Run the built-in analyzer to catch common issues:

```bash
istioctl analyze -n backend
```

This catches things like:

- VirtualServices referencing non-existent gateways
- DestinationRules referencing non-existent subsets
- Services without matching workloads
- Missing sidecars

## Enabling Debug Logging

For really tricky issues, enable debug logging on the proxy:

```bash
istioctl proxy-config log deploy/caller-service -n frontend --level=debug
```

Then check the proxy logs:

```bash
kubectl logs deploy/caller-service -c istio-proxy -n frontend --tail=200
```

Look for connection errors, DNS resolution failures, or cluster selection issues. Remember to turn debug logging off when you're done:

```bash
istioctl proxy-config log deploy/caller-service -n frontend --level=warning
```

Service discovery debugging in Istio follows a systematic path: Kubernetes resources, istiod registry, proxy configuration, and then connectivity. Most issues are caused by label mismatches, Sidecar resource restrictions, or pods that aren't ready. Going through the chain step by step will get you to the root cause faster than guessing.
