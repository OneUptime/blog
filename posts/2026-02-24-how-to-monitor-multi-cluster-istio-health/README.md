# How to Monitor Multi-Cluster Istio Health

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Multi-Cluster, Monitoring, Observability, Kubernetes

Description: How to set up monitoring and health checks for a multi-cluster Istio mesh covering control plane, data plane, and cross-cluster connectivity.

---

Monitoring a single-cluster Istio mesh is straightforward. Monitoring a multi-cluster mesh is a different beast. You need to track the health of each cluster's control plane, verify that cross-cluster service discovery is working, detect when failover happens, and catch configuration drift between clusters. This guide covers the essential health checks and monitoring setup.

## What to Monitor

In a multi-cluster Istio mesh, there are several layers to watch:

1. **Control plane health**: Is istiod running and responding in each cluster?
2. **Data plane health**: Are sidecar proxies connected to their control plane?
3. **Cross-cluster connectivity**: Can the east-west gateways reach each other?
4. **Service discovery**: Does each cluster see endpoints from other clusters?
5. **Certificate health**: Are mTLS certificates valid and not expired?

## Control Plane Health Checks

Check istiod in each cluster:

```bash
# Basic health check

for ctx in cluster1 cluster2; do
  echo "=== ${ctx} ==="
  kubectl --context=${ctx} get pods -n istio-system -l app=istiod
  kubectl --context=${ctx} exec -n istio-system deploy/istiod -- \
    pilot-discovery request GET /ready
done
```

Monitor istiod metrics with Prometheus. Key metrics to track:

```yaml
# Prometheus alerting rules for Istio control plane
groups:
  - name: istio-control-plane
    rules:
      - alert: IstiodDown
        expr: up{job="istiod"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Istiod is not responding in {{ $labels.cluster }}"

      - alert: IstiodHighPushLatency
        expr: histogram_quantile(0.99, sum by (le, cluster) (rate(pilot_proxy_convergence_time_bucket[5m]))) > 10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Istiod configuration push latency is high"

      - alert: IstiodConfigRejections
        expr: rate(pilot_total_xds_rejects[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Istiod is rejecting proxy configurations"
```

## Data Plane Health (Proxy Status)

Check if all proxies are connected and have up-to-date configuration:

```bash
# Check proxy status in each cluster
for ctx in cluster1 cluster2; do
  echo "=== ${ctx} ==="
  istioctl --context=${ctx} proxy-status
done
```

Look for proxies with `STALE` status, which means istiod sent an update but has not received an acknowledgement from Envoy.

Automate this check:

```bash
#!/bin/bash
# check-proxy-status.sh
for ctx in cluster1 cluster2; do
  STALE_COUNT=$(istioctl --context=${ctx} proxy-status 2>/dev/null | grep -c STALE)
  if [ "${STALE_COUNT}" -gt 0 ]; then
    echo "WARNING: ${STALE_COUNT} stale proxies in ${ctx}"
  else
    echo "OK: All proxies synced in ${ctx}"
  fi
done
```

## Cross-Cluster Connectivity

The east-west gateways are critical for multi-network setups. Monitor them:

```bash
# Check east-west gateway health
for ctx in cluster1 cluster2; do
  echo "=== ${ctx} east-west gateway ==="
  kubectl --context=${ctx} get svc -n istio-system istio-eastwestgateway

  # Check if the gateway pod is healthy
  kubectl --context=${ctx} get pods -n istio-system -l istio=eastwestgateway

  # Health check endpoint
  EW_ADDR=$(kubectl --context=${ctx} get svc -n istio-system istio-eastwestgateway \
    -o jsonpath='{.status.loadBalancer.ingress[0].ip}{.status.loadBalancer.ingress[0].hostname}')
  curl -s -o /dev/null -w "%{http_code}" http://${EW_ADDR}:15021/healthz/ready
  echo ""
done
```

For automated monitoring, create a cross-cluster connectivity test:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cross-cluster-health-check
  namespace: monitoring
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          labels:
            sidecar.istio.io/inject: "true"
        spec:
          containers:
            - name: checker
              image: curlimages/curl
              command:
                - /bin/sh
                - -c
                - |
                  # Try to reach a service in the other cluster
                  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
                    http://health-check.monitoring:8080/health)
                  if [ "$STATUS" != "200" ]; then
                    echo "Cross-cluster health check failed: $STATUS"
                    exit 1
                  fi
                  echo "Cross-cluster health check passed"
          restartPolicy: OnFailure
```

Deploy this in each cluster, pointing to a health check service in the other cluster.

## Service Discovery Monitoring

Verify that each cluster sees endpoints from other clusters:

```bash
# Check endpoint counts
for ctx in cluster1 cluster2; do
  echo "=== ${ctx} ==="
  istioctl --context=${ctx} proxy-config endpoints deployment/sleep -n sample | \
    grep "my-service" | wc -l
done
```

In a same-network mesh, if cluster1 has 3 pods and cluster2 has 3 pods of my-service, each cluster should show 6 workload endpoints. In a multi-network mesh, remote endpoints may be represented through the remote network's east-west gateway, so verify that the expected remote gateway endpoint appears instead of expecting every remote pod IP directly.

Monitor with Prometheus:

```yaml
- alert: CrossClusterEndpointsMissing
  expr: |
    sum(pilot_services{cluster="cluster1"}) != sum(pilot_services{cluster="cluster2"})
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "Service count mismatch between clusters - possible discovery issue"
```

## Certificate Monitoring

mTLS certificates expire, and when they do, cross-cluster communication breaks. Check certificate expiry:

```bash
# Check the root CA expiry
for ctx in cluster1 cluster2; do
  echo "=== ${ctx} ==="
  kubectl --context=${ctx} get secret cacerts -n istio-system -o jsonpath='{.data.root-cert\.pem}' | \
    base64 -d | openssl x509 -noout -dates
done
```

Check workload certificates:

```bash
# Get the certificate from a sidecar
istioctl --context=cluster1 proxy-config secret deployment/my-app -n production
```

## Unified Dashboard

Set up Grafana dashboards that show all clusters side by side. If you're running Prometheus in each cluster, use Thanos or Prometheus federation to aggregate metrics:

```yaml
# Thanos sidecar configuration for Istio's Prometheus
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-thanos
  namespace: istio-system
data:
  thanos.yaml: |
    type: S3
    config:
      bucket: istio-metrics
      endpoint: s3.amazonaws.com
      region: us-east-1
```

With aggregated metrics, create dashboards that compare:

- Request rates per cluster
- Error rates per cluster
- P99 latency per cluster
- Active connections per cluster
- Proxy sync status per cluster

## Alerting for Multi-Cluster Issues

Here are the essential alerts for multi-cluster health:

```yaml
groups:
  - name: istio-multi-cluster
    rules:
      - alert: EastWestGatewayDown
        expr: |
          kube_deployment_status_replicas_available{
            deployment="istio-eastwestgateway",
            namespace="istio-system"
          } == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "East-west gateway is down in {{ $labels.cluster }}"

      - alert: CrossClusterTrafficDrop
        expr: |
          (
            sum(rate(istio_requests_total{source_cluster="cluster1",destination_cluster="cluster2"}[5m])) +
            sum(rate(istio_requests_total{source_cluster="cluster2",destination_cluster="cluster1"}[5m]))
          ) == 0
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "No cross-cluster traffic detected"

      - alert: RemoteClusterSyncTimeout
        expr: |
          increase(remote_cluster_sync_timeouts_total[10m]) > 0
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Istiod is timing out while syncing a remote cluster"
```

## Quick Health Check Script

Here's a comprehensive health check script you can run manually or in CI:

```bash
#!/bin/bash
CLUSTERS="cluster1 cluster2"
PASS=0
FAIL=0

for ctx in ${CLUSTERS}; do
  echo "========================================="
  echo "Checking ${ctx}"
  echo "========================================="

  # Istiod running
  if kubectl --context=${ctx} get pods -n istio-system -l app=istiod | grep -q Running; then
    echo "  [PASS] istiod is running"
    ((PASS++))
  else
    echo "  [FAIL] istiod is NOT running"
    ((FAIL++))
  fi

  # East-west gateway running
  if kubectl --context=${ctx} get pods -n istio-system -l istio=eastwestgateway | grep -q Running; then
    echo "  [PASS] east-west gateway is running"
    ((PASS++))
  else
    echo "  [FAIL] east-west gateway is NOT running"
    ((FAIL++))
  fi

  # Remote secrets present
  REMOTE_SECRETS=$(kubectl --context=${ctx} get secrets -n istio-system -l istio/multiCluster=true --no-headers 2>/dev/null | wc -l)
  if [ "${REMOTE_SECRETS}" -gt 0 ]; then
    echo "  [PASS] ${REMOTE_SECRETS} remote secret(s) found"
    ((PASS++))
  else
    echo "  [FAIL] No remote secrets found"
    ((FAIL++))
  fi

  # No stale proxies
  STALE=$(istioctl --context=${ctx} proxy-status 2>/dev/null | grep -c STALE || true)
  if [ "${STALE}" -eq 0 ]; then
    echo "  [PASS] No stale proxies"
    ((PASS++))
  else
    echo "  [WARN] ${STALE} stale proxies"
    ((FAIL++))
  fi
done

echo ""
echo "Results: ${PASS} passed, ${FAIL} failed"
```

Monitoring a multi-cluster Istio mesh requires checking more than just "is it running." You need to verify cross-cluster connectivity, service discovery, certificate health, and configuration sync. Build automated checks for all of these and alert aggressively on failures, because problems in the multi-cluster layer are the ones that bite hardest in production.
