# How to Debug Data Plane Configuration Issues

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Data Plane, Debugging, Envoy, Kubernetes, Troubleshooting

Description: Practical techniques for diagnosing and fixing data plane configuration problems in Istio including proxy status checks, config dumps, and common pitfalls.

---

When traffic is not flowing the way you expect in Istio, the problem is almost always in the data plane configuration. The Envoy sidecars may have stale config, conflicting rules, or missing endpoints. Figuring out what went wrong takes a systematic approach, and Istio gives you some solid tools to do it.

## Start with Proxy Status

The first thing to check when something seems off is whether all your proxies are in sync with the control plane. Run:

```bash
istioctl proxy-status
```

This gives you a table showing every proxy in the mesh and its sync status. The columns that matter are CDS, LDS, EDS, and RDS (the xDS protocols). Each should show `SYNCED`. If you see `STALE`, it means that proxy has not picked up the latest configuration from istiod.

Common reasons for STALE status:
- Network connectivity issues between the proxy and istiod
- The proxy is overloaded and cannot process config updates fast enough
- istiod is under heavy load and cannot push updates to all proxies

If a proxy shows `NOT SENT`, it means istiod has not sent any configuration to it yet, which could indicate the proxy just started or there is a registration issue.

## Check the Proxy Configuration

Once you know a proxy is in sync (or not), the next step is to look at what configuration it actually has. The `istioctl proxy-config` command is your primary debugging tool.

### Listeners

Check what listeners are configured:

```bash
istioctl proxy-config listeners deploy/my-app -n default
```

If you are expecting traffic on a certain port but it is not working, look for a listener on that port. If there is no listener, the traffic is probably going to the PassthroughCluster (if mesh outbound traffic policy is set to ALLOW_ANY) or getting dropped (if set to REGISTRY_ONLY).

### Routes

Check the routing configuration:

```bash
istioctl proxy-config routes deploy/my-app -n default --name 8080 -o json
```

This shows you the full route configuration for port 8080. You can see which virtual hosts are configured and what route rules are applied. If your VirtualService is not taking effect, the route output will tell you why.

### Clusters

Check the upstream clusters:

```bash
istioctl proxy-config clusters deploy/my-app -n default --fqdn service-b.default.svc.cluster.local
```

This shows you the cluster configuration for a specific service. You can see the load balancing policy, connection pool settings, and outlier detection config.

### Endpoints

Check that endpoints are populated:

```bash
istioctl proxy-config endpoints deploy/my-app -n default --cluster "outbound|8080||service-b.default.svc.cluster.local"
```

If this returns no endpoints, Envoy has nowhere to send traffic. This usually means the target service has no healthy pods, or the service discovery is not working correctly.

## Analyze with istioctl analyze

Before digging into proxy configs manually, try the analyzer:

```bash
istioctl analyze -n default
```

This checks for common misconfigurations like:
- VirtualServices referencing gateways that do not exist
- DestinationRules referencing subsets that do not have matching pods
- Conflicting VirtualService rules
- Missing sidecar injection

The output includes specific error codes and suggestions for fixes.

You can also analyze the entire mesh:

```bash
istioctl analyze --all-namespaces
```

## Compare Expected vs Actual Config

A powerful debugging technique is to compare what istiod thinks a proxy should have versus what the proxy actually has. You can do this with:

```bash
istioctl proxy-config all deploy/my-app -n default -o json > actual.json
```

Then look at the istiod debug endpoint:

```bash
kubectl exec -n istio-system deploy/istiod -- curl -s localhost:15014/debug/configz | python3 -m json.tool > expected.json
```

If there are differences, you may have a config push issue.

## Check Envoy Access Logs

Access logs are invaluable for understanding what Envoy is doing with each request. If access logging is enabled, check them:

```bash
kubectl logs deploy/my-app -c istio-proxy -n default --tail=50
```

The default access log format includes:
- Response code
- Response flags (important for debugging)
- Upstream cluster
- Route name
- Duration

Pay attention to the response flags. Some common ones:
- `NR` - No route configured
- `UH` - No healthy upstream
- `UF` - Upstream connection failure
- `UC` - Upstream connection termination
- `DC` - Downstream connection termination
- `URX` - Upstream retry limit exceeded
- `RL` - Rate limited

If you see `NR`, it means Envoy received the request but had no matching route. This points to a VirtualService or routing configuration issue.

If you see `UH`, check the endpoints for that cluster. Likely there are no healthy backends.

## Common Configuration Issues

### Missing Sidecar Injection

If a pod does not have the istio-proxy sidecar, it will not participate in the mesh. Check:

```bash
kubectl get pod my-app-xyz -o jsonpath='{.spec.containers[*].name}'
```

If you only see your application container, the sidecar was not injected. Make sure the namespace has the injection label:

```bash
kubectl label namespace default istio-injection=enabled
```

Then restart the pod.

### Port Naming

Istio requires service ports to follow a naming convention. The port name should be prefixed with the protocol:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: http-web
    port: 8080
    targetPort: 8080
  - name: grpc-api
    port: 9090
    targetPort: 9090
```

If you name a port just `web` instead of `http-web`, Istio treats it as plain TCP and you lose HTTP-level features like retries, header-based routing, and fault injection.

You can also use the `appProtocol` field:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
  - name: web
    port: 8080
    appProtocol: http
```

### Conflicting VirtualServices

If you have multiple VirtualServices for the same host, they can conflict. Check for duplicates:

```bash
kubectl get virtualservices --all-namespaces -o json | jq '.items[] | {name: .metadata.name, namespace: .metadata.namespace, hosts: .spec.hosts}'
```

### DestinationRule Subsets Without Labels

A common mistake is defining a subset in a DestinationRule but having no pods that match the subset labels:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: my-service
spec:
  host: my-service
  subsets:
  - name: v2
    labels:
      version: v2
```

If no pods have the label `version: v2`, any traffic routed to the v2 subset will get a 503 error.

Check which pods match:

```bash
kubectl get pods -l version=v2 -n default
```

## Using Envoy Admin Interface Directly

For deeper debugging, you can hit the Envoy admin interface:

```bash
# Full config dump
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/config_dump > config.json

# Check cluster health
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/clusters | grep service-b

# Check stats for errors
kubectl exec deploy/my-app -c istio-proxy -- curl -s localhost:15000/stats | grep -i error

# Reset stats for a clean test
kubectl exec deploy/my-app -c istio-proxy -- curl -s -X POST localhost:15000/reset_counters
```

## Enabling Debug Logging

If you need even more detail, you can temporarily increase the log level on a specific proxy:

```bash
istioctl proxy-config log deploy/my-app --level debug
```

This produces a lot of output, so only enable it temporarily. To set it back:

```bash
istioctl proxy-config log deploy/my-app --level warning
```

You can also target specific Envoy components:

```bash
istioctl proxy-config log deploy/my-app --level connection:debug,router:debug
```

Debugging Istio data plane issues comes down to understanding what configuration the proxy has and what it is doing with traffic. Start with `proxy-status`, then drill into `proxy-config`, check access logs for response flags, and use `istioctl analyze` to catch common mistakes. Most issues boil down to missing routes, empty endpoints, or misconfigured resources.
