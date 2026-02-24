# How to Set Up Istio Alerts in OneUptime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, OneUptime, Alerts, Monitoring, Incident Response

Description: Configure meaningful alerts for Istio service mesh metrics in OneUptime to catch problems before they impact users.

---

Having metrics flowing from Istio into OneUptime is only half the battle. You need smart alerts that tell you when something is actually wrong without drowning you in false positives. Here's how to set up alerts that matter for an Istio service mesh.

## Alert Design Principles

Before jumping into configuration, let's cover some ground rules for good alerting:

1. **Alert on symptoms, not causes**. Users care about error rates and latency, not CPU usage on a specific pod.
2. **Use multiple severity levels**. Not everything needs to wake someone up at 3 AM.
3. **Set appropriate thresholds**. Base them on your actual baseline, not arbitrary numbers.
4. **Include enough context**. The alert should tell you where to start investigating.
5. **Avoid alert fatigue**. If people start ignoring alerts, the whole system is useless.

## Critical Alerts: Page Someone

These alerts indicate problems that are actively affecting users and need immediate attention.

### High Error Rate Alert

This fires when a significant percentage of requests to a service are failing:

```yaml
# OneUptime alert configuration concept:
# Metric: istio_requests_total
# Condition: Error rate > 5% for 5 minutes
# Severity: Critical

# The query you'd use:
# Error rate =
#   sum(rate(istio_requests_total{response_code=~"5.*", destination_service=~".*"}[5m]))
#   /
#   sum(rate(istio_requests_total{destination_service=~".*"}[5m]))
#   > 0.05
```

Configure this in OneUptime:
- **Name**: High Error Rate - Service Mesh
- **Metric**: `istio_requests_total` with response_code filter
- **Threshold**: Error rate > 5%
- **Duration**: 5 minutes sustained
- **Severity**: Critical
- **Notification**: PagerDuty / Phone call to on-call

### Complete Service Outage

When a service is returning zero successful responses:

```yaml
# Condition: Success rate = 0% for 2 minutes
# This means every single request is failing

# Query concept:
# sum(rate(istio_requests_total{response_code="200", destination_service="critical-service.default.svc.cluster.local"}[2m])) == 0
# AND
# sum(rate(istio_requests_total{destination_service="critical-service.default.svc.cluster.local"}[2m])) > 0
```

The second condition is important. You don't want to alert when there's simply no traffic (like during a deployment or maintenance window).

### Control Plane Down

If istiod goes down, the mesh will continue to work with its last known configuration, but no new changes will be applied and certificate rotation will stop:

```yaml
# Monitor istiod pod readiness
# Condition: istiod ready replicas = 0 for 2 minutes
# Severity: Critical

# Also monitor:
# pilot_xds_pushes with type="cds" - if this drops to 0, istiod isn't pushing config
```

## High Severity Alerts: Notify the Team

These indicate degraded performance that needs attention but isn't a full outage.

### Elevated Latency

```yaml
# Condition: P99 latency > 2x normal baseline for 10 minutes
# Severity: High

# Query concept:
# histogram_quantile(0.99,
#   sum(rate(istio_request_duration_milliseconds_bucket{
#     destination_service="api-service.default.svc.cluster.local"
#   }[5m])) by (le)
# ) > 1000  # 1 second threshold, adjust to your baseline
```

Set this per-service based on each service's normal latency profile. A 500ms p99 is fine for a database-heavy service but terrible for a cache lookup.

### mTLS Certificate Issues

Certificate problems can cause sudden service-to-service communication failures:

```yaml
# Monitor certificate expiration
# Condition: citadel_server_root_cert_expiry_timestamp - time() < 604800
# (less than 7 days until expiration)
# Severity: High

# Also watch for mTLS handshake failures
# Condition: Rate of connection failures with security policy violations > 0
```

### Sidecar Injection Failures

When pods come up without sidecars in namespaces that should have injection enabled:

```bash
# You can create a periodic check that runs:
kubectl get pods -n default -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.spec.containers[*].name}{"\n"}{end}' | grep -v istio-proxy
```

Configure OneUptime to run this check and alert when pods are found without the `istio-proxy` container.

## Medium Severity Alerts: Slack Notification

These are things the team should look at during business hours.

### Configuration Sync Issues

When proxies are out of sync with the control plane:

```yaml
# Monitor pilot_proxy_convergence_time
# Condition: Average convergence time > 30 seconds for 15 minutes
# Severity: Medium

# Also monitor for rejected configurations:
# pilot_total_xds_rejects > 0
```

### Elevated Retry Rate

A high retry rate indicates upstream services are struggling:

```yaml
# Condition: Retry rate > 10% of total requests for 15 minutes
# This means Envoy is having to retry a lot of requests

# Query concept:
# sum(rate(envoy_cluster_upstream_rq_retry{cluster_name=~"outbound.*"}[5m]))
# /
# sum(rate(envoy_cluster_upstream_rq_total{cluster_name=~"outbound.*"}[5m]))
# > 0.10
```

### Circuit Breaker Tripping

When circuit breakers are actively rejecting requests:

```yaml
# Monitor envoy circuit breaker metrics
# Condition: envoy_cluster_circuit_breakers_default_cx_open > 0 for 5 minutes
# Severity: Medium

# This indicates persistent upstream service issues
```

## Low Severity Alerts: Log for Review

These don't need immediate attention but should be tracked.

### Resource Usage Trending

```yaml
# Monitor Envoy proxy resource consumption
# Condition: Average istio-proxy container memory > 150Mi across all pods
# Severity: Low

# High proxy memory often indicates too many endpoints or complex routing rules
```

### Deprecated Configuration Detected

Set up a periodic job that runs `istioctl analyze` and alerts on warnings:

```bash
# Run analysis and capture output
istioctl analyze --all-namespaces -o json 2>&1

# Parse the output for warnings and errors
# Alert if any IST-level messages are found
```

## Organizing Alerts with Notification Rules

Structure your notifications based on severity:

| Severity | Channel | Timing |
|---|---|---|
| Critical | PagerDuty + Phone | Immediate, 24/7 |
| High | Slack #incidents + Email | Immediate, business hours. PagerDuty after hours |
| Medium | Slack #monitoring | Business hours only |
| Low | OneUptime dashboard only | Weekly review |

## Alert Runbooks

Every alert should link to a runbook that tells the responder what to do. Here's a template:

```markdown
## Alert: High Error Rate - Service Mesh

### Quick Check
1. Run `istioctl proxy-status` to see if proxies are in sync
2. Check `kubectl get pods -n <namespace>` for crashing pods
3. Look at `kubectl logs <pod> -c istio-proxy` for error messages

### Common Causes
- Deployment in progress (check recent deployments)
- Upstream service outage (check dependent services)
- mTLS misconfiguration (check PeerAuthentication)
- Resource exhaustion (check pod resource limits)

### Resolution Steps
1. If deployment-related: Check rollout status, consider rollback
2. If upstream: Escalate to the owning team
3. If mTLS: Verify PeerAuthentication and DestinationRule settings
4. If resources: Scale up or increase limits
```

## Testing Your Alerts

Don't wait for a real incident to find out your alerts don't work. Test them deliberately:

```bash
# Inject faults to trigger error rate alerts
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: test-fault
spec:
  hosts:
  - httpbin
  http:
  - fault:
      abort:
        percentage:
          value: 50
        httpStatus: 500
    route:
    - destination:
        host: httpbin
EOF

# Generate traffic to trigger the alert
for i in $(seq 1 200); do
  kubectl exec deploy/sleep -- curl -s http://httpbin:8000/get > /dev/null
done

# Clean up after testing
kubectl delete virtualservice test-fault
```

Verify that the alert fires, the notification reaches the right channel, and the runbook link works. Do this for every critical and high severity alert at least once.

Good alerting takes iteration. Start with the critical alerts, let them run for a few weeks, tune the thresholds based on real data, and then add more alerts as you learn what matters for your specific environment.
