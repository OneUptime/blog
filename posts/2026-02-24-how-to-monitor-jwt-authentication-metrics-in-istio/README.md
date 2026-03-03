# How to Monitor JWT Authentication Metrics in Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, JWT, Monitoring, Prometheus, Grafana, Observability

Description: Learn how to track JWT authentication success and failure rates using Istio's built-in metrics, Prometheus, and Grafana dashboards.

---

When you deploy JWT authentication across your Istio service mesh, you need visibility into what's happening. How many requests are getting rejected? Which services have the highest authentication failure rates? Are there sudden spikes in 401 errors that might indicate a misconfiguration or an attack?

Istio's Envoy sidecars expose metrics that let you track all of this. This post walks through setting up monitoring for JWT authentication using the metrics Istio already provides.

## What Metrics Istio Exposes

Istio's Envoy sidecars generate several metrics relevant to JWT authentication. The most important ones are the standard HTTP metrics that include response code labels:

- `istio_requests_total` - Total request count with labels for response code, source, destination, etc.
- `envoy_http_downstream_rq_xx` - Envoy's native request counters by response code class

When JWT validation fails, Istio returns specific HTTP status codes:
- **401 Unauthorized** - The JWT token is invalid (bad signature, expired, wrong issuer)
- **403 Forbidden** - The request doesn't have a required JWT token, or the AuthorizationPolicy denies access

You can filter on these response codes to track authentication failures.

## Querying JWT Failures with Prometheus

If you have Prometheus scraping your Istio mesh (which you should), you can query authentication failures directly.

To see the rate of 401 responses (invalid tokens) for a specific service:

```promql
sum(rate(istio_requests_total{
  destination_service_name="my-service",
  response_code="401"
}[5m]))
```

To see 403 responses (missing tokens or authorization denied):

```promql
sum(rate(istio_requests_total{
  destination_service_name="my-service",
  response_code="403"
}[5m]))
```

To get the authentication failure rate as a percentage of total traffic:

```promql
sum(rate(istio_requests_total{
  destination_service_name="my-service",
  response_code=~"401|403"
}[5m]))
/
sum(rate(istio_requests_total{
  destination_service_name="my-service"
}[5m]))
* 100
```

## Breaking Down by Source

One of the most useful things is seeing which callers are sending bad tokens. The `source_workload` label tells you where the request came from:

```promql
sum by (source_workload) (rate(istio_requests_total{
  destination_service_name="my-service",
  response_code="401"
}[5m]))
```

This helps you identify if a specific client service has a misconfigured token or an expired credential.

## Envoy-Level JWT Metrics

Beyond the standard Istio metrics, Envoy exposes more granular JWT-specific stats. These are available in the Envoy stats endpoint:

```bash
# Access Envoy stats for a specific pod
kubectl exec -n my-app deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep jwt
```

You'll see metrics like:

```text
http.inbound_0.0.0.0_8080.jwt_authn.allowed: 15234
http.inbound_0.0.0.0_8080.jwt_authn.cors_preflight_bypassed: 0
http.inbound_0.0.0.0_8080.jwt_authn.denied: 423
http.inbound_0.0.0.0_8080.jwt_authn.jwks_fetch_success: 12
http.inbound_0.0.0.0_8080.jwt_authn.jwks_fetch_failed: 0
```

These give you direct counts of JWT operations:
- `jwt_authn.allowed` - requests that passed JWT validation
- `jwt_authn.denied` - requests that failed JWT validation
- `jwt_authn.jwks_fetch_success` - successful JWKS key fetches from the provider
- `jwt_authn.jwks_fetch_failed` - failed JWKS key fetches (could indicate connectivity issues with your OIDC provider)

## Setting Up Custom Metrics with EnvoyFilter

To get the Envoy JWT stats into Prometheus, you can use Istio's telemetry configuration to surface them. First, check what stats are available:

```bash
kubectl exec -n my-app deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats/prometheus | grep jwt_authn
```

If you want these stats scraped by Prometheus, make sure your Prometheus config includes the Envoy stats endpoint. The standard Istio Prometheus configuration usually scrapes port 15020 which includes both Istio and Envoy metrics.

## Building a Grafana Dashboard

Here's a practical Grafana dashboard layout for JWT monitoring. You can create these panels:

**Panel 1: Authentication Success vs Failure Rate**

```promql
# Success rate
sum(rate(istio_requests_total{
  destination_service_name=~"$service",
  response_code!~"401|403"
}[5m]))

# Failure rate
sum(rate(istio_requests_total{
  destination_service_name=~"$service",
  response_code=~"401|403"
}[5m]))
```

**Panel 2: Auth Failure Breakdown by Service**

```promql
sum by (destination_service_name) (rate(istio_requests_total{
  response_code=~"401|403",
  destination_service_namespace="$namespace"
}[5m]))
```

**Panel 3: Top Sources of Failed Auth**

```promql
topk(10,
  sum by (source_workload, source_workload_namespace) (
    rate(istio_requests_total{
      response_code=~"401|403",
      destination_service_namespace="$namespace"
    }[5m])
  )
)
```

**Panel 4: Auth Failure Percentage per Service**

```promql
sum by (destination_service_name) (rate(istio_requests_total{
  response_code=~"401|403",
  destination_service_namespace="$namespace"
}[5m]))
/
sum by (destination_service_name) (rate(istio_requests_total{
  destination_service_namespace="$namespace"
}[5m]))
* 100
```

## Setting Up Alerts

You probably want to be alerted when authentication failures spike. Here's a PrometheusRule for that:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: jwt-auth-alerts
  namespace: monitoring
spec:
  groups:
    - name: jwt-authentication
      rules:
        - alert: HighJWTAuthFailureRate
          expr: |
            sum by (destination_service_name, destination_service_namespace) (
              rate(istio_requests_total{response_code=~"401|403"}[5m])
            )
            /
            sum by (destination_service_name, destination_service_namespace) (
              rate(istio_requests_total{}[5m])
            )
            > 0.1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High JWT auth failure rate for {{ $labels.destination_service_name }}"
            description: "More than 10% of requests to {{ $labels.destination_service_name }} in {{ $labels.destination_service_namespace }} are failing authentication over the last 5 minutes."

        - alert: JWKSFetchFailure
          expr: |
            increase(envoy_http_jwt_authn_jwks_fetch_failed[5m]) > 0
          for: 2m
          labels:
            severity: critical
          annotations:
            summary: "JWKS fetch failures detected"
            description: "The Envoy sidecar is unable to fetch JWKS keys from the OIDC provider. JWT validation may be failing for all requests."

        - alert: SuddenAuthFailureSpike
          expr: |
            sum by (destination_service_name) (
              rate(istio_requests_total{response_code=~"401|403"}[5m])
            )
            > 3 *
            sum by (destination_service_name) (
              rate(istio_requests_total{response_code=~"401|403"}[1h])
            )
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "Sudden spike in auth failures for {{ $labels.destination_service_name }}"
            description: "Auth failure rate in the last 5 minutes is 3x the hourly average."
```

## Using Access Logs for Detailed Investigation

When metrics tell you something is wrong, access logs help you figure out exactly what. Enable access logging to get per-request details:

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

Then search the logs for authentication failures:

```bash
kubectl logs -n my-app deploy/my-service -c istio-proxy | grep " 401 " | tail -20
kubectl logs -n my-app deploy/my-service -c istio-proxy | grep " 403 " | tail -20
```

The access logs include the source IP, request path, and response code, which helps you pinpoint exactly which requests are failing and why.

## Monitoring JWKS Key Rotation

OIDC providers rotate their signing keys periodically. During rotation, there's a brief window where things can go wrong if the JWKS cache is stale. Monitor the JWKS fetch metrics to catch these issues:

```bash
# Check JWKS fetch stats
kubectl exec -n my-app deploy/my-service -c istio-proxy -- \
  curl -s localhost:15000/stats | grep jwks_fetch
```

A healthy system shows `jwks_fetch_success` incrementing periodically and `jwks_fetch_failed` staying at zero.

## Practical Tips

A few things I've learned from running JWT auth monitoring in production:

1. **Baseline your failure rate first.** Some level of 401/403 is normal - bots, misconfigured clients, expired sessions. Know what your normal rate is before setting alert thresholds.

2. **Separate 401 from 403 in your dashboards.** 401 means the token itself is bad. 403 means the token is valid but the request isn't authorized. These are different problems with different fixes.

3. **Watch for gradual increases.** A slow increase in auth failures over days might indicate a certificate rotation issue or a client library bug in a new deployment.

4. **Monitor from the client side too.** Track how many retries your clients are doing due to auth failures. A client that silently retries on 401 might be masking a problem.

Good monitoring turns JWT authentication from a black box into something you can confidently operate in production. The combination of Prometheus metrics, Grafana dashboards, and alerting rules gives you full visibility into your mesh's authentication layer.
