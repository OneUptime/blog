# How to Test Authorization Policies Before Enforcement in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Testing, Security, Kubernetes, Dry Run

Description: Techniques for testing and validating Istio authorization policies before enforcing them in production, including dry-run mode and shadow policies.

---

Deploying authorization policies directly into production is risky. One wrong rule and you could block legitimate traffic to a critical service. The safe approach is to test your policies before they start enforcing. Istio gives you several techniques for this, from dry-run mode to gradual rollouts. Here is how to use them.

## The Risk of Direct Enforcement

When you apply an `ALLOW` policy, it immediately starts denying traffic that does not match. There is no grace period. If your policy is missing a rule for a critical communication path, that path breaks instantly.

Common scenarios where things go wrong:

- Forgot to include a service account in the allowed principals list
- Missed a health check path that Kubernetes needs
- Did not account for traffic from the monitoring namespace
- Typo in a service account name or namespace

Testing before enforcement helps you catch these issues without impacting users.

## Method 1: Dry-Run with Istio Telemetry

Current Istio releases support an alpha dry-run mode for `ALLOW` and `DENY` authorization policies. You enable it by adding an annotation:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: test-policy
  namespace: default
  annotations:
    "istio.io/dry-run": "true"
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/backend/sa/api-gateway"
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
```

With dry-run enabled, the policy is loaded into the Envoy proxy but does not actually enforce. Instead, Istio exposes what the decision would have been through proxy debug logs, metrics, and tracing. Real traffic continues to flow unaffected.

Enable RBAC debug logging and check the Envoy proxy logs to see the dry-run results:

```bash
istioctl proxy-config log <pod-name> -n default --level "rbac:debug"
```

```bash
kubectl logs <pod-name> -c istio-proxy | grep "shadow"
```

The proxy log includes entries such as `shadow denied, matched policy ns[default]-policy[test-policy]-rule[0]`. Dry-run results are also available in Envoy RBAC metrics with labels such as `authz_dry_run_action` and `authz_dry_run_result`.

## Method 2: Monitoring-Only Rollout

If dry-run annotations are not available in your Istio version, you can use a monitoring-first approach. Apply the policy in a staging environment or a test namespace first.

Create a test namespace that mirrors production:

```bash
kubectl create namespace test-default
kubectl label namespace test-default istio-injection=enabled
```

Deploy the same workloads (or stubs) in the test namespace:

```bash
kubectl apply -f deployment-manifests/ -n test-default
```

Apply your authorization policy in the test namespace:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: test-policy
  namespace: test-default
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/test-default/sa/api-gateway"
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/*"]
```

Run your integration tests against the test namespace and check for 403 errors.

## Method 3: RBAC Debug Logging

Before applying a policy to production, enable RBAC debug logging on the target workload in dry-run mode, staging, or a canary rollout:

```bash
istioctl proxy-config log <pod-name> -n default --level rbac:debug
```

Then apply the dry-run, staging, or canary policy and monitor the logs:

```bash
kubectl logs <pod-name> -c istio-proxy -f | grep rbac
```

You will see entries like:

```text
rbac_log: enforced allowed, matched policy ns[default]-policy[test-policy]-rule[0]
rbac_log: enforced denied, no matched policy found
```

These tell you which requests are being allowed and denied, and which policy rules are responsible. If you apply a normal policy to a production workload, it will enforce immediately while you are watching the logs.

## Method 4: Start with DENY Instead of ALLOW

Instead of jumping straight to an ALLOW policy (which denies everything not explicitly allowed), start with targeted DENY policies. DENY policies are additive - they block specific traffic without changing the default behavior for everything else.

```yaml
# Step 1: Add a DENY policy for the specific thing you want to block

apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-external-to-internal
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
  action: DENY
  rules:
  - from:
    - source:
        notNamespaces:
        - "default"
        - "gateway"
    to:
    - operation:
        paths: ["/internal/*"]
```

This blocks access to internal paths from mesh namespaces other than `default` and `gateway` without affecting any other traffic. Namespace-based matches are derived from the peer certificate, so make sure mTLS is enabled for the traffic you expect to match. You can gradually add more DENY rules until you have covered all the cases, and then switch to an ALLOW-based approach.

## Method 5: Gradual Rollout with Workload Selectors

Instead of applying a policy to all workloads at once, target a single canary workload:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: canary-policy
  namespace: default
spec:
  selector:
    matchLabels:
      app: my-service
      version: canary
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - "cluster.local/ns/default/sa/api-gateway"
```

Only pods with both `app: my-service` and `version: canary` get this policy. Pods that do not match the selector are unaffected by this policy. If the canary works fine, expand the selector.

## Method 6: Use istioctl analyze

Before applying any policy, run `istioctl analyze` to catch configuration errors:

```bash
istioctl analyze authorization-policy.yaml
```

This checks for common issues like:

- Policies targeting workloads that do not exist
- Conflicting policies
- Invalid field values

It will not tell you if your rules are logically correct (that requires actual traffic testing), but it catches syntax and structural issues.

## Method 7: Simulate with istioctl x authz check

After applying a policy, use `istioctl x authz check` to inspect which authorization policies are loaded for a specific workload:

```bash
istioctl x authz check <pod-name> -n default
```

This shows the authorization policies loaded in the proxy and their rules. It is useful for checking policy propagation and manually tracing through the rules to predict whether a specific request would be allowed or denied.

## Building a Testing Workflow

Here is a practical workflow that combines several methods:

```bash
# 1. Validate the policy file
istioctl analyze authorization-policy.yaml

# 2. Apply with dry-run annotation
kubectl apply -f authorization-policy.yaml  # with istio.io/dry-run: "true"

# 3. Generate test traffic (use your integration tests or manual curl)
kubectl exec deploy/test-client -- curl http://my-service:8080/api/test

# 4. Check dry-run results
kubectl logs deploy/my-service -c istio-proxy | grep shadow

# 5. If results look good, remove the dry-run annotation
kubectl annotate authorizationpolicy test-policy -n default istio.io/dry-run-

# 6. Monitor for 403 errors after enforcement
kubectl logs deploy/my-service -c istio-proxy | grep "403"
```

## Monitoring After Enforcement

Even after testing, keep a close eye on things after enforcement. Set up a Prometheus alert:

```yaml
groups:
- name: istio-authz-alerts
  rules:
  - alert: UnexpectedAuthorizationDenials
    expr: |
      increase(istio_requests_total{response_code="403",reporter="destination"}[5m]) > 0
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "Authorization denials detected for {{ $labels.destination_workload }}"
```

Check the rate of 403 responses using PromQL:

```text
sum(rate(istio_requests_total{response_code="403"}[5m])) by (destination_workload, source_workload)
```

This shows you which source-destination pairs are seeing denials, helping you quickly identify missing ALLOW rules.

## Rollback Plan

Always have a rollback plan. If a policy causes issues, the fastest fix is to delete it:

```bash
kubectl delete authorizationpolicy test-policy -n default
```

Traffic will return to normal within seconds as the Envoy proxies pick up the configuration change. Keep the YAML file around so you can re-apply it after fixing the issue.

Testing authorization policies before enforcement takes a bit more time upfront, but it prevents outages caused by misconfigured rules. Use dry-run mode when available, start with targeted DENY policies, roll out gradually with selectors, and always monitor after enforcement.
