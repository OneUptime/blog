# How to Avoid Circular Dependencies in Istio Configuration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Configuration, Dependencies, Kubernetes, Troubleshooting

Description: Learn how to identify and prevent circular dependencies in Istio configuration that cause routing loops, infinite retries, and cascading failures.

---

Circular dependencies in Istio configuration are nasty bugs. They cause requests to loop between services, eat up resources, and eventually time out or crash. The worst part is that they are not always obvious from looking at individual configuration files. You have to understand the full picture of how VirtualServices, DestinationRules, and ServiceEntries interact.

Here is how to spot and prevent circular dependencies in your Istio setup.

## What Circular Dependencies Look Like

A circular dependency happens when Service A routes to Service B, which routes back to Service A (or through a longer chain that eventually loops back). In Istio, this can happen through VirtualService routing rules, delegation, or even through external service entries.

The simplest case:

```yaml
# Service A sends /api requests to Service B
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: service-a
spec:
  hosts:
    - service-a
  http:
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: service-b

---
# Service B sends /api requests back to Service A
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: service-b
spec:
  hosts:
    - service-b
  http:
    - match:
        - uri:
            prefix: /api
      route:
        - destination:
            host: service-a
```

A request to `service-a/api` goes to `service-b`, which sends it back to `service-a`, creating an infinite loop.

## Detecting Circular Routes

Build a dependency graph from your VirtualServices:

```bash
#!/bin/bash
echo "digraph istio_routes {"

kubectl get virtualservice -A -o json | jq -r '
  .items[] |
  .spec.hosts[] as $src |
  .spec.http[]?.route[]?.destination.host as $dst |
  select($dst != null) |
  "  \"\($src)\" -> \"\($dst)\";"
'

echo "}"
```

Save the output and look for cycles. You can use graphviz to visualize it:

```bash
bash detect-cycles.sh > routes.dot
dot -Tpng routes.dot -o routes.png
```

For automated cycle detection, use a simple script:

```bash
#!/bin/bash
# Build adjacency list and detect cycles
kubectl get virtualservice -A -o json | jq -r '
  .items[] |
  .spec.hosts[] as $src |
  .spec.http[]?.route[]?.destination.host as $dst |
  select($dst != null and $src != $dst) |
  "\($src) \($dst)"
' | while read src dst; do
  # Check if dst has a route back to src (direct cycle)
  REVERSE=$(kubectl get virtualservice -A -o json | jq -r "
    .items[] |
    select(.spec.hosts[] == \"$dst\") |
    .spec.http[]?.route[]?.destination.host" | grep "^${src}$")
  if [ -n "$REVERSE" ]; then
    echo "CIRCULAR DEPENDENCY: $src -> $dst -> $src"
  fi
done
```

## VirtualService Delegation Loops

Istio supports VirtualService delegation where a parent VirtualService delegates to child VirtualServices. Circular delegation is another source of loops:

```yaml
# Parent delegates to child
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: parent
spec:
  hosts:
    - api.example.com
  gateways:
    - production-gateway
  http:
    - match:
        - uri:
            prefix: /api
      delegate:
        name: child-vs
        namespace: production

---
# Child should NOT delegate back to parent
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: child-vs
  namespace: production
spec:
  http:
    - match:
        - uri:
            prefix: /api/v1
      route:
        - destination:
            host: api-v1
    - route:
        - destination:
            host: api-default
```

Check for delegation loops:

```bash
kubectl get virtualservice -A -o json | jq -r '
  .items[] |
  select(.spec.http[]?.delegate) |
  "\(.metadata.name) delegates to \(.spec.http[].delegate.name // "unknown")"
'
```

## Retry Amplification Loops

Even without routing loops, retries can create circular amplification. If Service A retries requests to Service B, and Service B retries requests to Service C, and Service C depends on Service A, failures cascade in a loop:

```yaml
# Each service retries 3 times
# A -> B (3 retries) -> C (3 retries) -> A (3 retries)
# Total requests to A: 3 * 3 * 3 = 27 for each original request
```

Prevent this by understanding your dependency chain and setting sensible retry budgets:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: service-b
spec:
  hosts:
    - service-b
  http:
    - route:
        - destination:
            host: service-b
      retries:
        attempts: 2
        perTryTimeout: 3s
        retryOn: gateway-error,connect-failure
      timeout: 10s
```

The key is the `timeout` field. It puts an absolute cap on how long a request can take, including all retries. Without it, retries across multiple hops compound.

## Mirror Traffic Loops

Traffic mirroring can accidentally create loops if the mirror target routes traffic back:

```yaml
# BAD: Mirroring to a service that calls the original service
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: api
spec:
  hosts:
    - api
  http:
    - route:
        - destination:
            host: api
            subset: v1
      mirror:
        host: api-shadow
      mirrorPercentage:
        value: 100.0
```

If `api-shadow` calls back to `api` as part of its processing, you have a mirror loop. Each request generates a mirrored copy, which generates another mirrored copy, and so on.

Make sure mirrored traffic is handled by a completely isolated copy of the service that does not call back into the mesh.

## ServiceEntry Loops

External service entries can create unexpected loops when combined with egress routing:

```yaml
# External service that resolves to an internal IP
apiVersion: networking.istio.io/v1
kind: ServiceEntry
metadata:
  name: external-api
spec:
  hosts:
    - api.example.com
  ports:
    - number: 443
      name: https
      protocol: HTTPS
  resolution: DNS
  location: MESH_EXTERNAL
```

If `api.example.com` resolves to a load balancer that routes back into your cluster, requests loop. Verify that external ServiceEntries actually point to external services:

```bash
for host in $(kubectl get serviceentry -A -o jsonpath='{.items[*].spec.hosts[*]}'); do
  IP=$(nslookup "$host" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $2}')
  echo "$host -> $IP"
done
```

Check these IPs against your cluster's service CIDR and node IPs.

## Prevention Strategies

### 1. Document Your Service Dependencies

Maintain a clear map of which services depend on which:

```bash
# Generate a service dependency map from VirtualServices
kubectl get virtualservice -A -o json | jq -r '
  .items[] |
  {
    source: .spec.hosts[0],
    destinations: [.spec.http[]?.route[]?.destination.host] | unique
  }
'
```

### 2. Use Timeouts on Everything

Timeouts are your safety net against loops:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: any-service
spec:
  hosts:
    - any-service
  http:
    - route:
        - destination:
            host: any-service
      timeout: 15s
```

### 3. Set Max Request Depth

While Istio does not have a built-in request depth limiter, you can implement one using headers. Your application reads and increments a depth header, and Istio can route based on it:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: service-a
spec:
  hosts:
    - service-a
  http:
    - match:
        - headers:
            x-request-depth:
              exact: "5"
      fault:
        abort:
          httpStatus: 508
          percentage:
            value: 100
    - route:
        - destination:
            host: service-a
```

### 4. Add Cycle Detection to CI/CD

Run the dependency graph analysis as part of your deployment pipeline:

```bash
#!/bin/bash
# Check for circular dependencies before deploying
CYCLES=$(bash detect-cycles.sh 2>&1 | grep "CIRCULAR")
if [ -n "$CYCLES" ]; then
  echo "ERROR: Circular dependencies detected:"
  echo "$CYCLES"
  exit 1
fi
```

Circular dependencies are architectural problems that manifest as configuration bugs. Fixing them requires understanding your service topology, not just tweaking YAML files. Take the time to map your dependencies and validate them regularly.
