# How to Inject Faults for Specific Users in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Fault Injection, Testing, VirtualService, Header Matching

Description: Learn how to use Istio header-based fault injection to target specific users or test accounts for fault testing without affecting production traffic.

---

When you want to test fault handling in a production environment, you can't just break things for everyone. Real users are using the system, and injecting faults across all traffic is a recipe for an incident. The solution is to inject faults only for specific users, test accounts, or request patterns while keeping production traffic running normally.

Istio makes this possible through header-based match conditions in VirtualService fault injection rules. This post shows how to set it up and walks through several real-world patterns.

## The Basic Pattern

The idea is simple: your application or API gateway adds a header to requests from specific users, and Istio's VirtualService matches on that header to decide whether to inject faults.

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - match:
        - headers:
            x-user-id:
              exact: "test-user-42"
      fault:
        abort:
          httpStatus: 503
          percentage:
            value: 100.0
      route:
        - destination:
            host: order-service
    - route:
        - destination:
            host: order-service
```

Requests with the header `x-user-id: test-user-42` get a 503 error. Everyone else's requests flow through normally.

## Setting Up User Identity Headers

For this to work, the user's identity needs to be in a header that Istio can match against. There are several ways to get it there.

### API Gateway Sets the Header

If you use an API gateway (Kong, Ambassador, or your own), configure it to extract the user ID from the JWT token or session and add it as a header:

```yaml
# Example: Envoy filter in the gateway to extract from JWT
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - match:
        - headers:
            x-user-type:
              exact: "internal-tester"
      fault:
        delay:
          fixedDelay: 5s
          percentage:
            value: 100.0
      route:
        - destination:
            host: order-service
    - route:
        - destination:
            host: order-service
```

### Application Propagates Headers

If your application already propagates user context headers through service-to-service calls, you can match on those directly. Istio requires header propagation for distributed tracing to work, so there's a good chance this is already in place.

Common headers to match on:

- `x-user-id`: User identifier
- `x-account-type`: Account tier (free, premium, enterprise)
- `x-request-id`: Specific request identifier
- `end-user`: A common header used in Istio examples
- `cookie`: Match on specific cookie values

### Using JWT Claims

If you're using Istio's RequestAuthentication, you can have it extract JWT claims into headers:

```yaml
apiVersion: security.istio.io/v1beta1
kind: RequestAuthentication
metadata:
  name: jwt-auth
  namespace: production
spec:
  jwtRules:
    - issuer: "https://auth.example.com"
      jwksUri: "https://auth.example.com/.well-known/jwks.json"
      outputClaimToHeaders:
        - header: x-user-role
          claim: role
```

Then match on the extracted claim:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - match:
        - headers:
            x-user-role:
              exact: "tester"
      fault:
        abort:
          httpStatus: 500
          percentage:
            value: 50.0
      route:
        - destination:
            host: order-service
    - route:
        - destination:
            host: order-service
```

## Testing Multiple User Segments

You might want different fault behavior for different user types:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: payment-service
  namespace: production
spec:
  hosts:
    - payment-service
  http:
    # Test account - always fails
    - match:
        - headers:
            x-account-type:
              exact: "test"
      fault:
        abort:
          httpStatus: 503
          percentage:
            value: 100.0
      route:
        - destination:
            host: payment-service
    # Internal QA - intermittent delays
    - match:
        - headers:
            x-account-type:
              exact: "qa"
      fault:
        delay:
          fixedDelay: 3s
          percentage:
            value: 30.0
      route:
        - destination:
            host: payment-service
    # Everyone else - normal
    - route:
        - destination:
            host: payment-service
```

## Matching Multiple Users with Regex

To target multiple specific users without creating a rule for each one, use regex matching:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: order-service
  namespace: production
spec:
  hosts:
    - order-service
  http:
    - match:
        - headers:
            x-user-id:
              regex: "test-user-(42|43|44|100)"
      fault:
        abort:
          httpStatus: 503
          percentage:
            value: 100.0
      route:
        - destination:
            host: order-service
    - route:
        - destination:
            host: order-service
```

Or match all users with a specific prefix:

```yaml
- match:
    - headers:
        x-user-id:
          prefix: "test-"
```

## End-to-End Example

Here's a complete walkthrough of setting up user-targeted fault injection.

**Step 1**: Create the VirtualService with header-based fault injection:

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: product-service
  namespace: production
spec:
  hosts:
    - product-service
  http:
    - match:
        - headers:
            x-chaos-user:
              exact: "enabled"
      fault:
        delay:
          fixedDelay: 5s
          percentage:
            value: 50.0
        abort:
          httpStatus: 500
          percentage:
            value: 25.0
      route:
        - destination:
            host: product-service
    - route:
        - destination:
            host: product-service
```

**Step 2**: Apply it:

```bash
kubectl apply -f product-service-fault.yaml
```

**Step 3**: Test with the targeted header:

```bash
# This request may be delayed or aborted
kubectl exec deploy/test-client -n production -- curl -H "x-chaos-user: enabled" -v http://product-service:8080/products

# This request is never affected
kubectl exec deploy/test-client -n production -- curl -v http://product-service:8080/products
```

**Step 4**: Run automated tests with the header:

```bash
# Run 100 requests and check error distribution
for i in $(seq 1 100); do
  kubectl exec deploy/test-client -n production -- curl -s -o /dev/null -w "%{http_code} %{time_total}\n" -H "x-chaos-user: enabled" http://product-service:8080/products
done | sort | uniq -c | sort -rn
```

**Step 5**: Clean up:

```bash
kubectl delete virtualservice product-service -n production
```

## Header Propagation Matters

For user-targeted fault injection to work across multiple service hops, the identifying header must be propagated through the call chain. If Service A calls Service B which calls Service C, and you want to inject faults on the call from B to C for a specific user, Service B must forward the user identity header.

Istio doesn't automatically propagate application headers. Your services need to do this. Most tracing-aware frameworks handle this for standard headers like `x-request-id`, `x-b3-traceid`, etc. For custom headers like `x-user-id`, you need to make sure your services propagate them.

```mermaid
graph LR
    A[Frontend<br/>x-user-id: test-42] -->|propagates header| B[API Gateway<br/>x-user-id: test-42]
    B -->|propagates header| C[Order Service<br/>x-user-id: test-42]
    C -->|propagates header| D[Payment Service<br/>Fault injected here]
```

If Service C doesn't propagate `x-user-id`, the fault injection rule on Payment Service won't match.

## Safety Considerations

A few things to keep in mind:

- Make sure your test user headers can't be set by external users. If `x-user-id` comes from the client and isn't validated, someone could trigger fault injection accidentally or maliciously.
- Use dedicated test accounts, not real user accounts, for fault injection testing.
- Keep the VirtualService rules version-controlled so you have a record of what was tested and when.
- Always have a cleanup process to remove fault injection rules after testing.

User-targeted fault injection gives you the best of both worlds: realistic testing in production environments without impacting real users. Set it up once, and you can run resilience tests any time you need to.
