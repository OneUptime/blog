# How to Quickly Check Authorization Policy Evaluation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Security, RBAC, Kubernetes, Service Mesh

Description: How to debug and verify Istio AuthorizationPolicy evaluation to understand why requests are allowed or denied in your mesh.

---

AuthorizationPolicy is how you control access between services in Istio. When a request gets denied with "RBAC: access denied" or when a request that should be blocked gets through, you need to understand how authorization policies are evaluated. Debugging authorization can be tricky because multiple policies might apply to the same workload, and the evaluation logic has specific precedence rules.

Here is how to quickly figure out what is going on with your authorization policies.

## Understanding Evaluation Order

Before debugging, you need to know how Istio evaluates authorization policies:

1. If any CUSTOM action policy matches, delegate to the external authorizer
2. If any DENY policy matches, deny the request
3. If there are no ALLOW policies, allow the request
4. If any ALLOW policy matches, allow the request
5. If no ALLOW policy matches, deny the request

The key takeaway: DENY policies are evaluated before ALLOW policies. And if you have any ALLOW policies, requests that do not match any ALLOW rule are denied (implicit deny).

## List All Authorization Policies

Start by seeing what policies exist:

```bash
kubectl get authorizationpolicies -A
```

For a specific namespace:

```bash
kubectl get authorizationpolicies -n default -o yaml
```

Check for mesh-wide policies in istio-system:

```bash
kubectl get authorizationpolicies -n istio-system
```

A policy in `istio-system` with no selector applies to the entire mesh.

## Check Which Policies Apply to a Workload

Use `istioctl x authz check` to see which policies affect a specific workload:

```bash
istioctl x authz check deploy/my-app.default
```

This shows:

```
LISTENER[FilterChain]     HTTP ROUTE     AUTHZ POLICY                     ACTION
virtualInbound[0]         inbound|80     deny-all.default                 DENY
virtualInbound[0]         inbound|80     allow-frontend.default           ALLOW
```

This tells you exactly which policies are attached to the workload and in what order they are evaluated.

## Simulate a Request

You can test authorization by sending a request and checking the response:

```bash
kubectl exec deploy/frontend -n default -- \
  curl -s -o /dev/null -w "%{http_code}" http://my-app.default:8080/api/data
```

If you get `403`, the request was denied by an authorization policy. If you get `200`, it was allowed.

For more detail, add verbose output:

```bash
kubectl exec deploy/frontend -n default -- \
  curl -v http://my-app.default:8080/api/data 2>&1
```

Look for the `RBAC: access denied` message in the response body, which confirms the denial came from Istio authorization (not the application itself).

## Check Envoy RBAC Logs

Enable debug logging for the RBAC filter to see detailed evaluation:

```bash
istioctl proxy-config log deploy/my-app -n default --level rbac:debug
```

Now make a request and check the proxy logs:

```bash
kubectl logs deploy/my-app -n default -c istio-proxy --tail=20
```

You will see log lines like:

```
enforced denied, matched policy deny-all
```

or

```
enforced allowed, matched policy allow-frontend
```

This tells you exactly which policy matched (or did not match) for each request.

Do not forget to reset the log level when you are done:

```bash
istioctl proxy-config log deploy/my-app -n default --level rbac:warning
```

## Common Debugging Scenarios

### Scenario 1: All Traffic Denied After Adding a Policy

You added an ALLOW policy, and now everything is broken. This usually happens because adding any ALLOW policy triggers implicit deny for non-matching requests.

For example, this policy allows only frontend to access my-app:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: allow-frontend
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/default/sa/frontend-sa"
```

Now any other service calling my-app gets denied. This is by design. If you want to also allow another service, add it to the rules:

```yaml
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/default/sa/frontend-sa"
              - "cluster.local/ns/monitoring/sa/prometheus-sa"
```

### Scenario 2: Policy Not Taking Effect

You created an authorization policy but it does not seem to do anything. Check the selector:

```yaml
spec:
  selector:
    matchLabels:
      app: my-app  # Must match the pod labels
```

Verify the pod actually has this label:

```bash
kubectl get pods -n default -l app=my-app
```

If no pods match the selector, the policy does not apply to anything.

Also check the namespace. A policy in namespace `default` only applies to workloads in `default`:

```bash
kubectl get authorizationpolicy allow-frontend -n default -o jsonpath='{.metadata.namespace}'
```

### Scenario 3: DENY Policy Not Working

If a DENY policy is not blocking traffic, make sure the match conditions are correct. DENY policies require ALL conditions to match:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-external
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  action: DENY
  rules:
    - from:
        - source:
            notNamespaces: ["default", "backend"]
      to:
        - operation:
            paths: ["/admin/*"]
```

This denies requests from outside `default` and `backend` namespaces to `/admin/*` paths. Both conditions must match for the deny to trigger.

## Check Principal and Namespace Identity

Authorization policies match on SPIFFE identities. Check what identity the calling service has:

```bash
istioctl proxy-config secret deploy/frontend -n default -o json | \
  python3 -c "
import sys, json, base64, subprocess
data = json.load(sys.stdin)
for s in data.get('dynamicActiveSecrets', []):
    if s['name'] == 'default':
        cert = base64.b64decode(s['secret']['tlsCertificate']['certificateChain']['inlineBytes'])
        proc = subprocess.run(['openssl', 'x509', '-text', '-noout'], input=cert, capture_output=True)
        for line in proc.stdout.decode().split('\n'):
            if 'URI:' in line:
                print(line.strip())
"
```

This prints the SPIFFE URI like `spiffe://cluster.local/ns/default/sa/frontend-sa`. Use this exact value in your policy's `principals` field.

## Check Stats for RBAC Decisions

Envoy tracks authorization statistics:

```bash
kubectl exec deploy/my-app -n default -c istio-proxy -- \
  curl -s localhost:15000/stats | grep rbac
```

Key stats:

```
rbac.allowed: 150     # Requests that passed authorization
rbac.denied: 23       # Requests denied by authorization
rbac.shadow_allowed: 0  # Would-be-allowed in shadow mode
rbac.shadow_denied: 0   # Would-be-denied in shadow mode
```

## Using Dry Run Mode

You can test authorization policies without actually enforcing them using the `AUDIT` action:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: test-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-app
  action: AUDIT
  rules:
    - from:
        - source:
            namespaces: ["frontend"]
```

AUDIT policies log whether the request would have matched without actually allowing or denying it. Check the Envoy access logs for the RBAC audit result.

## Viewing the RBAC Filter Configuration

To see the actual RBAC configuration in the Envoy proxy:

```bash
istioctl proxy-config listener deploy/my-app -n default -o json | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
for listener in data:
    for fc in listener.get('filterChains', []):
        for f in fc.get('filters', []):
            for hf in f.get('typedConfig', {}).get('httpFilters', []):
                if 'rbac' in hf.get('name', ''):
                    print(json.dumps(hf, indent=2))
"
```

This shows you the raw RBAC filter configuration, including all the rules and their match conditions, which is the ground truth of what Envoy is enforcing.

## Summary

Debugging authorization policies requires understanding the evaluation order (CUSTOM, then DENY, then ALLOW with implicit deny), checking which policies apply to your workload, verifying SPIFFE identities, and using RBAC debug logging to see per-request decisions. The `istioctl x authz check` command is your best starting point, and RBAC debug logs give you the detailed per-request information when you need it.
