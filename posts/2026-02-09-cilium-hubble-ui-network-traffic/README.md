# How to Use Cilium Hubble UI to Visualize Real-Time Network Traffic Between Kubernetes Pods

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Cilium, Hubble, Kubernetes, Networking, Observability

Description: Use Cilium Hubble UI to visualize real-time network traffic between Kubernetes pods, debug connectivity issues, and understand service dependencies with practical examples and configuration.

---

Understanding network traffic patterns in Kubernetes clusters is essential for debugging connectivity problems and optimizing service communication. Cilium Hubble provides powerful network observability with a visual interface that shows exactly how pods communicate.

Hubble UI displays real-time traffic flows between services, highlights connection failures, and helps identify bottlenecks. This guide shows you how to install Hubble, configure it for maximum visibility, and use it to solve real networking problems.

## Installing Cilium with Hubble

Install Cilium using Helm with Hubble enabled:

```bash
# Add Cilium repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with Hubble
helm install cilium cilium/cilium --version 1.14.5 \
  --namespace kube-system \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,icmp,http}" \
  --set prometheus.enabled=true \
  --set operator.prometheus.enabled=true
```

Verify the installation:

```bash
# Check Cilium status
cilium status --wait

# Verify Hubble is running
kubectl get pods -n kube-system -l k8s-app=hubble-relay
kubectl get pods -n kube-system -l k8s-app=hubble-ui
```

## Accessing Hubble UI

Port forward to access the UI:

```bash
cilium hubble ui
```

This automatically opens Hubble UI in your browser at `http://localhost:12000`.

Alternatively, create an ingress:

```yaml
# hubble-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: hubble-ui
  namespace: kube-system
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt
spec:
  tls:
  - hosts:
    - hubble.example.com
    secretName: hubble-tls
  rules:
  - host: hubble.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: hubble-ui
            port:
              number: 80
```

Apply the ingress:

```bash
kubectl apply -f hubble-ingress.yaml
```

## Understanding Hubble UI Features

The Hubble UI displays several key views:

**Service Map**: Visual representation of service-to-service communication
**Flow Table**: Detailed list of individual network flows
**Network Policies**: Applied policies affecting traffic
**Metrics**: Traffic statistics and performance data

Each flow shows:
- Source and destination pods
- Protocols (HTTP, TCP, UDP)
- Ports and directions
- Verdict (forwarded, dropped, denied)
- Labels and identities

## Using Hubble CLI for Deep Inspection

Install the Hubble CLI:

```bash
export HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --remote-name-all https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-amd64.tar.gz{,.sha256sum}
sha256sum --check hubble-linux-amd64.tar.gz.sha256sum
sudo tar xzvfC hubble-linux-amd64.tar.gz /usr/local/bin
rm hubble-linux-amd64.tar.gz{,.sha256sum}
```

Port forward to Hubble Relay:

```bash
cilium hubble port-forward &
```

View real-time flows:

```bash
# Watch all traffic
hubble observe

# Filter by namespace
hubble observe --namespace production

# Filter by pod
hubble observe --pod api-deployment-abc123

# Filter by HTTP traffic
hubble observe --protocol http

# Show only dropped packets
hubble observe --verdict DROPPED

# Follow traffic for a specific service
hubble observe --to-service api --follow
```

## Debugging Connection Failures

Find dropped connections:

```bash
# Show all dropped packets
hubble observe --verdict DROPPED

# Show dropped packets to a specific service
hubble observe --verdict DROPPED --to-service database

# Show dropped packets with reasons
hubble observe --verdict DROPPED -o json | jq '.flow.verdict, .flow.drop_reason'
```

Example output analysis:

```bash
# Identify policy denials
hubble observe --verdict DROPPED | grep "Policy denied"

# Find connection timeouts
hubble observe --verdict DROPPED | grep "connection timeout"

# Check for missing routes
hubble observe --verdict DROPPED | grep "no route"
```

## Analyzing HTTP Traffic

Filter and analyze HTTP flows:

```bash
# Show all HTTP traffic
hubble observe --protocol http

# Show HTTP errors (4xx, 5xx)
hubble observe --protocol http --http-status 500-599

# Show slow HTTP requests
hubble observe --protocol http --http-method GET | grep -E "latency=[0-9]{3,}"

# Monitor specific endpoint
hubble observe --protocol http --http-path "/api/users"
```

Export HTTP traffic to JSON for analysis:

```bash
hubble observe --protocol http -o json > http-traffic.json

# Analyze with jq
cat http-traffic.json | jq -r '.flow | "\(.source.pod_name) -> \(.destination.pod_name): \(.l7.http.url) (\(.l7.http.code))"'
```

## Creating Custom Flow Filters

Build complex filters for specific scenarios:

```bash
# Traffic from specific pod to service
hubble observe \
  --from-pod frontend-abc123 \
  --to-service api \
  --protocol http

# Cross-namespace traffic
hubble observe \
  --from-namespace production \
  --to-namespace data

# Traffic on specific port
hubble observe --port 5432

# UDP DNS queries
hubble observe --protocol udp --port 53

# TLS traffic
hubble observe --protocol tcp --port 443
```

## Integrating with Prometheus

Export Hubble metrics to Prometheus:

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: hubble-metrics
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: hubble
  endpoints:
  - port: hubble-metrics
    interval: 30s
```

Create Grafana dashboards for Hubble metrics:

```yaml
# Example PromQL queries
# DNS request rate
rate(hubble_dns_queries_total[5m])

# Dropped packets by reason
sum by (drop_reason) (rate(hubble_drop_total[5m]))

# HTTP response times
histogram_quantile(0.95, rate(hubble_http_request_duration_seconds_bucket[5m]))

# Top talkers by bytes
topk(10, sum by (source, destination) (rate(hubble_flows_processed_total[5m])))
```

## Troubleshooting Scenarios

**Scenario 1: API returns 500 errors intermittently**

```bash
# Find failing requests
hubble observe \
  --to-service api \
  --protocol http \
  --http-status 500-599 \
  -o jsonpb

# Check if specific pods are causing issues
hubble observe \
  --to-service api \
  --protocol http \
  --http-status 500-599 | \
  grep -oP 'destination=[^ ]+' | \
  sort | uniq -c | sort -rn
```

**Scenario 2: Database connections timing out**

```bash
# Watch database connections
hubble observe --to-service postgres --port 5432

# Check for connection resets
hubble observe --to-service postgres --port 5432 | grep RST

# Verify network policy allows connection
hubble observe --to-service postgres --verdict DROPPED
```

**Scenario 3: Service mesh issues**

```bash
# Check mTLS traffic
hubble observe --to-service api --port 15001

# Verify sidecars are communicating
hubble observe --from-label istio-proxy --to-label istio-proxy

# Find services without sidecars
hubble observe --protocol tcp --not --from-label istio-proxy
```

## Automating Flow Analysis

Create a script to detect anomalies:

```bash
#!/bin/bash
# detect-anomalies.sh

echo "Analyzing network flows for anomalies..."

# Check for excessive dropped packets
DROPPED=$(hubble observe --verdict DROPPED --since 5m --output jsonpb | wc -l)

if [ "$DROPPED" -gt 100 ]; then
    echo "WARNING: High number of dropped packets: $DROPPED"
    hubble observe --verdict DROPPED --since 5m | \
        grep -oP 'drop_reason_desc=[^ ]+' | \
        sort | uniq -c | sort -rn | head -5
fi

# Check for HTTP errors
ERRORS=$(hubble observe --protocol http --http-status 500-599 --since 5m --output jsonpb | wc -l)

if [ "$ERRORS" -gt 50 ]; then
    echo "WARNING: High number of HTTP errors: $ERRORS"
    hubble observe --protocol http --http-status 500-599 --since 5m | \
        grep -oP 'destination=[^ ]+' | \
        sort | uniq -c | sort -rn | head -5
fi

# Check for connection timeouts
TIMEOUTS=$(hubble observe --since 5m | grep -c "timeout")

if [ "$TIMEOUTS" -gt 20 ]; then
    echo "WARNING: High number of timeouts: $TIMEOUTS"
fi

echo "Analysis complete"
```

## Recording and Replaying Flows

Capture flows for later analysis:

```bash
# Record flows to file
hubble observe --output jsonpb > flows-$(date +%Y%m%d-%H%M%S).json

# Replay flows from file
cat flows-20240209-143000.json | jq -r '.flow | "\(.time) \(.source.pod_name) -> \(.destination.pod_name):\(.destination.port)"'

# Filter recorded flows
cat flows-20240209-143000.json | jq '.flow | select(.verdict == "DROPPED")'
```

## Setting Up Alerts

Configure alerts for network issues:

```yaml
# prometheusrule.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: hubble-alerts
  namespace: kube-system
spec:
  groups:
  - name: hubble
    interval: 30s
    rules:
    - alert: HighPacketDropRate
      expr: rate(hubble_drop_total[5m]) > 10
      for: 5m
      annotations:
        summary: "High packet drop rate detected"

    - alert: HTTPErrorRateHigh
      expr: rate(hubble_http_requests_total{status=~"5.."}[5m]) > 0.05
      for: 5m
      annotations:
        summary: "High HTTP error rate"

    - alert: NetworkPolicyDenials
      expr: increase(hubble_drop_total{drop_reason="Policy denied"}[5m]) > 100
      for: 2m
      annotations:
        summary: "High number of policy denials"
```

Hubble UI and CLI provide unmatched visibility into Kubernetes network traffic. Use them to debug connectivity issues, optimize service communication, and understand your application's network behavior in real time.
