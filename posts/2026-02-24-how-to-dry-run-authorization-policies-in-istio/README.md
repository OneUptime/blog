# How to Dry-Run Authorization Policies in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Authorization, Dry Run, Security, Kubernetes, Testing

Description: How to use Istio's dry-run mode for authorization policies to test access control rules in production without actually blocking traffic.

---

Rolling out authorization policies to production is nerve-wracking. One misconfigured rule and you've blocked legitimate traffic, causing an outage. Istio's dry-run mode lets you test authorization policies in production without enforcing them. The policies are evaluated, results are logged, but traffic flows through regardless of the verdict. This gives you confidence that your policies work correctly before you flip the switch to enforcement.

## How Dry-Run Works

When you enable dry-run mode on an authorization policy, Istio's Envoy sidecar evaluates the policy against every matching request but doesn't enforce the result. Instead, it:

1. Evaluates the policy rules against the incoming request
2. Logs the result (would-be-allowed or would-be-denied) in the Envoy access log
3. Records metrics for the dry-run evaluation
4. Allows the request to pass through regardless

This is similar to how a firewall's "audit mode" works - you get to see what would happen without actually impacting traffic.

## Enabling Dry-Run Mode

Add the `istio.io/dry-run` annotation to your AuthorizationPolicy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: test-policy
  namespace: my-app
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
            namespaces: ["frontend", "backend"]
      to:
        - operation:
            methods: ["GET", "POST"]
            paths: ["/api/*"]
```

Apply it:

```bash
kubectl apply -f test-policy.yaml
```

The policy is active (being evaluated) but not enforced (not blocking traffic).

## Checking Dry-Run Results in Logs

Dry-run results appear in the Envoy access logs. To see them, you need to have access logging enabled:

```yaml
apiVersion: telemetry.istio.io/v1
kind: Telemetry
metadata:
  name: access-logging
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  accessLogging:
    - providers:
        - name: envoy
```

Check the logs for dry-run results:

```bash
kubectl logs -n my-app deploy/my-service -c istio-proxy | grep "shadow"
```

Dry-run policy results appear in the `rbac_access_logged_only` response flag. You'll see entries like:

```
[2026-02-24T10:15:30.000Z] "GET /api/users HTTP/1.1" 200 - via_upstream - "-" 0 1234 15 14 "-" "curl/7.68.0" "abc-123" "my-service:8080" "10.0.0.5:8080" inbound|8080|| 10.0.0.1:54321 10.0.0.5:8080 10.0.0.1:54321 - default ALLOW shadow_denied
```

The `shadow_denied` flag indicates the dry-run policy would have denied this request. `shadow_allowed` means it would have been allowed.

## Monitoring Dry-Run Metrics

Istio exposes metrics for dry-run policy evaluations:

```promql
# Requests that would be denied by dry-run policies
sum(rate(istio_requests_total{
  destination_service_name="my-service",
  response_flags=~".*shadow_denied.*"
}[5m]))
```

```promql
# Dry-run deny rate as percentage of total traffic
sum(rate(istio_requests_total{
  destination_service_name="my-service",
  response_flags=~".*shadow_denied.*"
}[5m]))
/
sum(rate(istio_requests_total{
  destination_service_name="my-service"
}[5m]))
* 100
```

## Step-by-Step Dry-Run Workflow

Here's the recommended process for safely rolling out authorization policies:

### Step 1: Deploy the Policy in Dry-Run Mode

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: backend-access-control
  namespace: backend
  annotations:
    "istio.io/dry-run": "true"
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["frontend", "backend"]
    - from:
        - source:
            namespaces: ["monitoring"]
      to:
        - operation:
            paths: ["/metrics"]
            methods: ["GET"]
```

### Step 2: Monitor for False Positives

Wait for a meaningful traffic period (at least one business day) and check for traffic that would be denied:

```bash
# Check how many requests would be denied
kubectl logs -n backend deploy/api-service -c istio-proxy --since=1h | grep "shadow_denied" | wc -l

# See the details of would-be-denied requests
kubectl logs -n backend deploy/api-service -c istio-proxy --since=1h | grep "shadow_denied" | head -20
```

### Step 3: Analyze the Results

Look at the denied requests. Are they legitimate traffic you forgot to account for? Common findings:

- Traffic from the `istio-system` namespace (ingress gateway) that you didn't include
- Health check probes from `kube-system`
- Traffic from a service you didn't know about
- Monitoring tools using unexpected paths

### Step 4: Adjust the Policy

Update the policy while keeping dry-run mode:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: backend-access-control
  namespace: backend
  annotations:
    "istio.io/dry-run": "true"
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["frontend", "backend", "istio-system"]
    - from:
        - source:
            namespaces: ["monitoring"]
      to:
        - operation:
            paths: ["/metrics"]
            methods: ["GET"]
    - to:
        - operation:
            paths: ["/healthz", "/ready"]
```

### Step 5: Re-Monitor

Check that the shadow_denied count drops to near zero (or an acceptable level):

```bash
# Should show very few or zero denials now
kubectl logs -n backend deploy/api-service -c istio-proxy --since=1h | grep "shadow_denied" | wc -l
```

### Step 6: Enable Enforcement

Remove the dry-run annotation to enforce the policy:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: backend-access-control
  namespace: backend
  # No more dry-run annotation
spec:
  selector:
    matchLabels:
      app: api-service
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["frontend", "backend", "istio-system"]
    - from:
        - source:
            namespaces: ["monitoring"]
      to:
        - operation:
            paths: ["/metrics"]
            methods: ["GET"]
    - to:
        - operation:
            paths: ["/healthz", "/ready"]
```

## Dry-Running DENY Policies

Dry-run is equally valuable for DENY policies. You want to make sure a DENY policy doesn't accidentally block legitimate traffic:

```yaml
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: deny-external-writes
  namespace: production
  annotations:
    "istio.io/dry-run": "true"
spec:
  action: DENY
  rules:
    - from:
        - source:
            notNamespaces: ["production"]
      to:
        - operation:
            methods: ["POST", "PUT", "PATCH", "DELETE"]
```

Monitor to see if any legitimate cross-namespace write traffic would be blocked before enforcing this.

## Alerting on Dry-Run Results

Set up alerts to catch unexpected dry-run denials:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dry-run-alerts
  namespace: monitoring
spec:
  groups:
    - name: authz-dry-run
      rules:
        - alert: HighDryRunDenyRate
          expr: |
            sum by (destination_service_name) (
              rate(istio_requests_total{
                response_flags=~".*shadow_denied.*"
              }[5m])
            ) > 10
          for: 10m
          labels:
            severity: info
          annotations:
            summary: "High dry-run deny rate for {{ $labels.destination_service_name }}"
            description: "The dry-run authorization policy is denying more than 10 requests per second. Review the policy before enabling enforcement."
```

## Combining Dry-Run with Enforced Policies

You can have both dry-run and enforced policies on the same workload. This is useful for testing a new policy while existing policies are already active:

```yaml
# Enforced policy (currently active)
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: current-policy
  namespace: my-app
spec:
  selector:
    matchLabels:
      app: my-service
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: ["my-app"]
---
# Dry-run policy (testing stricter rules)
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: stricter-policy
  namespace: my-app
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
            principals: ["cluster.local/ns/my-app/sa/frontend"]
```

The current policy enforces namespace-level access. The dry-run policy tests a stricter service-account-level restriction without affecting traffic.

## Tips for Effective Dry-Run Testing

1. **Run dry-run during peak hours.** You want to capture the full range of traffic patterns, including background jobs, cron tasks, and peak-hour traffic.

2. **Test for at least 24 hours.** Some traffic patterns only occur during specific times of day.

3. **Check both directions.** If you're applying policies to multiple services, dry-run all of them. A policy on service A might block traffic from service B that you didn't expect.

4. **Review with the team.** Share the dry-run results with service owners before enforcement. They might know about traffic flows you don't.

5. **Have a rollback plan.** Even after dry-run testing, have a quick way to disable the policy if something goes wrong after enforcement.

Dry-run mode takes the fear out of deploying authorization policies to production. Spend the extra time testing, and you'll avoid the midnight pages from accidentally blocking production traffic.
