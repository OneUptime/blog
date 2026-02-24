# How to Debug Why Fault Injection is Not Working

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Fault Injection, Testing, Debugging, Kubernetes

Description: Troubleshooting guide for when Istio fault injection via VirtualService is not injecting delays or aborting requests as configured.

---

Fault injection is one of Istio's most useful features for chaos testing. You configure a VirtualService to inject delays or abort requests, but the faults never materialize. Requests go through normally, with no delays and no errors. This is surprisingly common, and the causes are usually related to how the VirtualService interacts with the proxy.

## How Fault Injection Works

Fault injection is configured in a VirtualService using the `fault` field:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: my-service-fault
  namespace: production
spec:
  hosts:
    - my-service.production.svc.cluster.local
  http:
    - fault:
        delay:
          percentage:
            value: 50
          fixedDelay: 5s
        abort:
          percentage:
            value: 10
          httpStatus: 503
      route:
        - destination:
            host: my-service.production.svc.cluster.local
```

The fault is injected by the client's sidecar proxy, not the server's. This is important because it means the fault configuration needs to reach the calling service's proxy.

## Step 1: Verify the VirtualService Exists

```bash
kubectl get virtualservice -n production
kubectl get virtualservice my-service-fault -n production -o yaml
```

Make sure the YAML looks correct and the fault block is at the right indentation level.

## Step 2: Check Where the Fault is Injected

Faults are injected at the client side. This means:

- The VirtualService must be visible to the client's proxy
- The client must have a sidecar
- The fault is applied when the client's sidecar processes the outbound request

Check the client proxy's route configuration:

```bash
istioctl proxy-config routes deploy/my-client -n production -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for rc in (data if isinstance(data, list) else [data]):
  config = rc.get('routeConfig', rc)
  for vh in config.get('virtualHosts', []):
    for route in vh.get('routes', []):
      decorator = route.get('decorator', {})
      typed_per_filter = route.get('typedPerFilterConfig', {})
      fault_config = typed_per_filter.get('envoy.filters.http.fault', {})
      if fault_config and 'my-service' in vh.get('name', ''):
        print(f\"Route: {decorator.get('operation', 'unknown')}\")
        print(f'  Fault config present: yes')
"
```

If no fault config is found, the VirtualService isn't reaching this proxy.

## Step 3: Verify the Client Has a Sidecar

Fault injection only works when the calling pod has an Istio sidecar:

```bash
kubectl get pod -n production -l app=my-client -o jsonpath='{.items[0].spec.containers[*].name}'
```

You need to see `istio-proxy` in the container list. If the client doesn't have a sidecar, faults won't be injected.

## Step 4: Check the Host Field

The `hosts` field in the VirtualService must match how the client addresses the service. If the client calls `http://my-service:8080` but the VirtualService host is `my-service.production.svc.cluster.local`, it should match since Kubernetes resolves the short name.

But there are edge cases. If the client is in a different namespace:

```yaml
# Client is in namespace "frontend", service is in "production"
# The client calls: http://my-service.production:8080

# VirtualService host must match:
hosts:
  - my-service.production.svc.cluster.local
```

Test the exact hostname the client uses:

```bash
kubectl exec deploy/my-client -n frontend -c my-client -- \
  curl -v my-service.production:8080/api
```

## Step 5: Check the Match Conditions

If the fault is inside a `match` block, the request must match all conditions for the fault to apply:

```yaml
http:
  - match:
      - headers:
          x-test:
            exact: "chaos"
    fault:
      delay:
        fixedDelay: 5s
        percentage:
          value: 100
    route:
      - destination:
          host: my-service.production.svc.cluster.local
  - route:
      - destination:
          host: my-service.production.svc.cluster.local
```

In this example, the fault only applies when the `x-test: chaos` header is present. Requests without the header take the second route (no fault).

Make sure your test requests include the required headers:

```bash
kubectl exec deploy/my-client -n production -c sleep -- \
  curl -H "x-test: chaos" my-service.production:8080/api
```

## Step 6: Check the Percentage

A fault with `percentage.value: 0.1` means only 0.1% of requests get the fault. That's 1 in 1000. If you're testing with a few requests, you might never see it:

```yaml
fault:
  delay:
    percentage:
      value: 0.1  # Only 0.1% of requests!
    fixedDelay: 5s
```

For testing, set the percentage to 100:

```yaml
fault:
  delay:
    percentage:
      value: 100  # All requests get the fault
    fixedDelay: 5s
```

## Step 7: Check for Conflicting VirtualServices

If another VirtualService for the same host takes priority, your fault injection VirtualService might be ignored:

```bash
kubectl get virtualservice -n production -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data['items']:
  hosts = item['spec'].get('hosts', [])
  if 'my-service' in str(hosts) or 'my-service.production.svc.cluster.local' in hosts:
    print(f\"{item['metadata']['name']}: hosts={hosts}\")
"
```

If there are multiple VirtualServices for the same host, Istio merges them. The merge order can be surprising, and your fault rules might end up after the normal routing rules, meaning they never match.

Consolidate into a single VirtualService:

```yaml
http:
  - fault:
      abort:
        httpStatus: 503
        percentage:
          value: 50
    route:
      - destination:
          host: my-service.production.svc.cluster.local
```

## Step 8: Verify with Access Logs

Send a request and check both the client and server access logs:

```bash
# Client proxy log
kubectl logs deploy/my-client -n production -c istio-proxy --tail=5

# Server proxy log
kubectl logs deploy/my-service -n production -c istio-proxy --tail=5
```

For delay injection, the client log should show a request that took longer than the fixedDelay value. For abort injection, the client log should show the abort status code (e.g., 503) and the server log should not show the request at all (because it was aborted before reaching the server).

If the server log shows the request arriving normally, the fault is not being injected at the client side.

## Step 9: Check for Sidecar Resources Blocking Configuration

If a Sidecar resource limits the outbound configuration scope, the VirtualService might not be applied:

```bash
kubectl get sidecar -n production -o yaml
```

If the Sidecar resource doesn't include the target host in its egress, the VirtualService won't affect the proxy.

## Step 10: Test with a Simple Fault

Strip everything down to the simplest possible fault injection to isolate the issue:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: simple-fault-test
  namespace: production
spec:
  hosts:
    - my-service.production.svc.cluster.local
  http:
    - fault:
        abort:
          httpStatus: 418
          percentage:
            value: 100
      route:
        - destination:
            host: my-service.production.svc.cluster.local
```

Apply it and test:

```bash
kubectl apply -f simple-fault-test.yaml
kubectl exec deploy/my-client -n production -c sleep -- \
  curl -s -o /dev/null -w "%{http_code}" my-service.production:8080/
```

You should get 418 (I'm a teapot). If you get 200, the fault injection is definitely not working and the issue is at the configuration level (wrong host, no sidecar, conflicting VirtualService).

Clean up:

```bash
kubectl delete virtualservice simple-fault-test -n production
```

## Step 11: Check Gateway vs Mesh Application

If you're trying to inject faults for traffic coming through the Istio gateway (external traffic), the VirtualService needs to reference the gateway:

```yaml
spec:
  hosts:
    - "api.example.com"
  gateways:
    - istio-system/main-gateway  # Required for gateway traffic
  http:
    - fault:
        delay:
          fixedDelay: 3s
          percentage:
            value: 100
      route:
        - destination:
            host: my-service.production.svc.cluster.local
```

Without the `gateways` field, the VirtualService only applies to mesh-internal traffic. And vice versa: with only the `gateways` field, it doesn't apply to mesh-internal traffic.

For both:

```yaml
gateways:
  - istio-system/main-gateway
  - mesh
```

## Common Issues Summary

| Problem | Cause | Fix |
|---------|-------|-----|
| No faults at all | Client has no sidecar | Enable sidecar injection |
| Faults only sometimes | Percentage too low | Increase for testing |
| Works in mesh but not gateway | Missing gateways field | Add gateway reference |
| Wrong route matched | Conflicting VirtualService | Consolidate VirtualServices |
| Faults on wrong service | Host mismatch | Use FQDN in hosts |
| Match conditions not met | Headers missing | Add required headers to requests |

Fault injection debugging starts with confirming the client has a sidecar, since that's where faults are injected. Then verify the VirtualService host matches, check for conflicting VirtualServices, and test with 100% percentage to eliminate probability as a factor. The simple 418 test is a quick way to confirm the basic mechanism works before adding complexity.
