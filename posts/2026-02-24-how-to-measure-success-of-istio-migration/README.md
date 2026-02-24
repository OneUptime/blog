# How to Measure Success of Istio Migration

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Service Mesh, Metrics, Observability, Kubernetes

Description: How to define and measure success metrics for your Istio migration to know whether the service mesh is delivering the value you expected.

---

You migrated to Istio. The sidecars are running, mTLS is enabled, and nobody is paging you at 2am. But is the migration actually successful? Without defined metrics, you are just guessing.

Measuring Istio migration success requires looking at it from multiple angles: operational health, security posture, developer experience, and business impact. Here is how to set up concrete measurements for each.

## Baseline Metrics Before Migration

You cannot measure improvement without a baseline. Capture these metrics before you start:

```bash
# Record current error rates
kubectl top pods --all-namespaces --sort-by=cpu > baseline-resource-usage.txt

# Export Prometheus metrics snapshot
curl -G http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=rate(http_requests_total{code=~"5.*"}[24h])' \
  > baseline-error-rates.json

# Record current latencies (if you have existing metrics)
curl -G http://prometheus:9090/api/v1/query \
  --data-urlencode 'query=histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[24h]))' \
  > baseline-latencies.json
```

## Metric Category 1: Operational Health

These metrics tell you if Istio is running well and not causing problems.

### Sidecar Injection Success Rate

Every pod in a labeled namespace should have a sidecar. Track the injection success rate:

```bash
# Count pods with and without sidecars in meshed namespaces
TOTAL=$(kubectl get pods -l 'security.istio.io/tlsMode=istio' --all-namespaces --no-headers | wc -l)
INJECTED=$(kubectl get pods --all-namespaces -o json | \
  jq '[.items[] | select(.spec.containers[].name == "istio-proxy")] | length')

echo "Injection rate: $INJECTED / $TOTAL"
```

Set up a Prometheus query to track this over time:

```promql
# Pods with sidecars vs total pods in meshed namespaces
sum(kube_pod_container_info{container="istio-proxy"}) /
sum(kube_pod_info{namespace=~"production|staging|backend"})
```

### Control Plane Health

Monitor istiod for errors and resource consumption:

```promql
# Pilot push errors
sum(rate(pilot_xds_push_errors[5m]))

# Configuration push latency
histogram_quantile(0.99, sum(rate(pilot_proxy_convergence_time_bucket[5m])) by (le))

# Istiod resource usage
container_memory_working_set_bytes{container="discovery", namespace="istio-system"}
```

### Error Rate Comparison

Compare error rates before and after migration:

```promql
# 5xx error rate from Istio telemetry
sum(rate(istio_requests_total{response_code=~"5.*"}[5m])) by (destination_service_name) /
sum(rate(istio_requests_total[5m])) by (destination_service_name)
```

Target: Error rates should remain equal to or lower than pre-migration baseline.

### Latency Overhead

Measure the actual latency impact of sidecars:

```promql
# P50 latency by service
histogram_quantile(0.5, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service_name))

# P99 latency by service
histogram_quantile(0.99, sum(rate(istio_request_duration_milliseconds_bucket[5m])) by (le, destination_service_name))
```

Target: P50 latency increase should be under 3ms per hop. P99 should be under 10ms per hop.

## Metric Category 2: Security Posture

One of the main reasons to adopt Istio is improved security. Measure it.

### mTLS Coverage

```promql
# Percentage of traffic using mTLS
sum(istio_requests_total{connection_security_policy="mutual_tls"}) /
sum(istio_requests_total) * 100
```

Target: 100% mTLS coverage for all in-mesh traffic.

Check for services still using plaintext:

```bash
# Find connections not using mTLS
istioctl proxy-config listeners -n production | grep -v "filterChainMatch"

# Check PeerAuthentication policies
kubectl get peerauthentication -A
```

### Authorization Policy Coverage

Track how many services have explicit authorization policies:

```bash
# Count services vs authorization policies
SERVICE_COUNT=$(kubectl get svc -n production --no-headers | wc -l)
AUTHZ_COUNT=$(kubectl get authorizationpolicy -n production --no-headers | wc -l)
echo "Authorization coverage: $AUTHZ_COUNT / $SERVICE_COUNT services"
```

## Metric Category 3: Observability Improvements

Istio should give you better visibility into your services.

### Metric Collection Completeness

Verify that Istio is generating metrics for all services:

```promql
# Count unique services reporting metrics
count(count by (destination_service_name) (istio_requests_total))
```

Compare this to the total number of services in the mesh.

### Distributed Tracing Coverage

If you set up tracing, measure the percentage of requests that generate traces:

```bash
# Check trace propagation
kubectl exec deploy/my-app -c istio-proxy -- \
  pilot-agent request GET stats | grep "tracing"
```

### Service Graph Completeness

Open Kiali and check that all services and their connections are visible:

```bash
istioctl dashboard kiali
```

The service graph should show every service in the mesh and the connections between them. Missing services or connections indicate a configuration issue.

## Metric Category 4: Resource Overhead

Track the cost of running Istio:

```promql
# Total CPU used by sidecars
sum(container_cpu_usage_seconds_total{container="istio-proxy"})

# Total memory used by sidecars
sum(container_memory_working_set_bytes{container="istio-proxy"})

# Control plane resource usage
sum(container_cpu_usage_seconds_total{namespace="istio-system"})
sum(container_memory_working_set_bytes{namespace="istio-system"})
```

Create a Grafana dashboard that tracks this over time:

```json
{
  "title": "Istio Resource Overhead",
  "panels": [
    {
      "title": "Sidecar CPU Usage (total)",
      "targets": [
        {
          "expr": "sum(rate(container_cpu_usage_seconds_total{container=\"istio-proxy\"}[5m]))"
        }
      ]
    },
    {
      "title": "Sidecar Memory Usage (total)",
      "targets": [
        {
          "expr": "sum(container_memory_working_set_bytes{container=\"istio-proxy\"})"
        }
      ]
    }
  ]
}
```

## Metric Category 5: Developer Experience

This is harder to measure with numbers but equally important.

Track these through surveys and feedback:

- Time to resolve networking issues (should decrease with better observability)
- Number of questions in the Istio support channel (should decrease over time)
- Developer confidence in deploying changes (survey quarterly)

You can also measure operational efficiency:

```bash
# Time to detect issues (mean time to detect)
# Compare incident response times before and after migration

# Number of networking-related incidents per month
# Should decrease as Istio handles retries, timeouts, and circuit breaking
```

## Building a Migration Scorecard

Combine all metrics into a simple scorecard:

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Sidecar injection rate | 100% | 98.5% | Needs work |
| mTLS coverage | 100% | 100% | Met |
| Error rate change | < +0.1% | +0.02% | Met |
| P99 latency overhead | < 10ms | 7ms | Met |
| Sidecar CPU overhead | < 15% total | 8% | Met |
| Sidecar memory overhead | < 20% total | 12% | Met |
| Services with authz policies | 100% | 65% | Needs work |
| Trace coverage | > 95% | 92% | Close |

Review this scorecard weekly during migration and monthly afterward. It gives you a concrete answer to the question "was this migration successful?" instead of relying on gut feeling.

Migration success is not a binary outcome. It is a spectrum, and these metrics tell you exactly where you are on it.
