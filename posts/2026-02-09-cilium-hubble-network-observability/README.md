# How to use Cilium Hubble for network flow observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Cilium, Hubble, Network Observability, eBPF

Description: Learn how to leverage Cilium Hubble for deep network flow visibility and troubleshooting in Kubernetes clusters using eBPF-based observability.

---

Network observability is critical for understanding application behavior, troubleshooting connectivity issues, and enforcing security policies. Cilium Hubble provides deep visibility into network flows using eBPF, offering insights without the performance overhead of traditional packet capture tools. This guide shows you how to deploy and use Hubble for comprehensive network observability.

## Understanding Cilium Hubble

Hubble is the observability layer built into Cilium, leveraging eBPF to capture network flow data directly in the kernel. Unlike traditional monitoring tools that tap network interfaces, Hubble sees every packet at the socket level with full context about source and destination pods, namespaces, and security identities.

Hubble provides visibility into service dependencies, network policies, DNS queries, HTTP requests, and dropped packets - all with minimal performance impact.

## Installing Cilium with Hubble

Deploy Cilium with Hubble enabled using Helm:

```bash
# Add Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with Hubble enabled
helm install cilium cilium/cilium --version 1.14.5 \
  --namespace kube-system \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,icmp,http}"

# Verify installation
kubectl -n kube-system get pods -l k8s-app=cilium
kubectl -n kube-system get pods -l k8s-app=hubble-relay
kubectl -n kube-system get pods -l k8s-app=hubble-ui
```

Wait for all pods to reach Running state before proceeding.

## Installing Hubble CLI

The Hubble CLI provides command-line access to flow data:

```bash
# Download Hubble CLI
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --remote-name-all https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-amd64.tar.gz{,.sha256sum}
sha256sum --check hubble-linux-amd64.tar.gz.sha256sum
sudo tar xzvfC hubble-linux-amd64.tar.gz /usr/local/bin
rm hubble-linux-amd64.tar.gz{,.sha256sum}

# Verify installation
hubble version
```

## Accessing Hubble

Enable port forwarding to access Hubble:

```bash
# Port forward Hubble Relay
kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &

# Test connection
hubble status

# Output shows:
# Healthcheck (via localhost:4245): Ok
# Current/Max Flows: 8192/8192
# Flows/s: 25.00
```

## Observing Network Flows

View real-time network flows in your cluster:

```bash
# Watch all flows
hubble observe

# Filter flows by namespace
hubble observe --namespace default

# Filter by pod
hubble observe --pod my-app

# Filter by source and destination
hubble observe --from-pod frontend --to-pod backend
```

Example output:

```
Dec  9 10:15:42.123: default/frontend-7d4f8b9c-xk2lp:45678 -> default/backend-6c8b7d5f-9qw4x:8080 to-endpoint FORWARDED (TCP Flags: SYN)
Dec  9 10:15:42.124: default/backend-6c8b7d5f-9qw4x:8080 -> default/frontend-7d4f8b9c-xk2lp:45678 to-endpoint FORWARDED (TCP Flags: SYN, ACK)
Dec  9 10:15:42.125: default/frontend-7d4f8b9c-xk2lp:45678 -> default/backend-6c8b7d5f-9qw4x:8080 to-endpoint FORWARDED (TCP Flags: ACK)
```

## Advanced Flow Filtering

Hubble supports powerful filtering options:

```bash
# Filter by protocol
hubble observe --protocol tcp
hubble observe --protocol udp

# Filter by port
hubble observe --port 443
hubble observe --port 8080

# Filter by verdict (forwarded, dropped, etc)
hubble observe --verdict DROPPED
hubble observe --verdict FORWARDED

# Combine filters
hubble observe --namespace default --protocol tcp --port 80 --verdict FORWARDED

# Filter by IP address
hubble observe --ip 10.244.1.5

# Filter by DNS query
hubble observe --protocol dns --type request
```

## Troubleshooting Connectivity Issues

Use Hubble to diagnose why traffic is failing:

```bash
# Find dropped packets
hubble observe --verdict DROPPED --last 100

# Output shows:
# Dec  9 10:20:15.456: default/app-pod:54321 -> default/db-pod:5432 to-endpoint DROPPED (Policy denied)

# See policy denials in detail
hubble observe --verdict DROPPED --json | jq '.flow.drop_reason_desc'

# Trace specific connection
hubble observe --from-pod app-pod --to-pod db-pod -f
```

When you see DROPPED verdicts, check which policy caused the drop:

```bash
# View network policies
kubectl get netpol -A

# Describe specific policy
kubectl describe netpol my-policy
```

## Analyzing Service Dependencies

Discover service communication patterns:

```bash
# Show all connections from a specific pod
hubble observe --from-pod frontend --last 1000

# Group by destination service
hubble observe --from-namespace default --last 5000 | \
  awk '{print $3}' | sort | uniq -c | sort -rn

# Find which services a pod connects to
hubble observe --from-pod frontend --protocol tcp --last 1000 | \
  grep -oP 'default/\K[^:]+' | sort -u
```

## DNS Query Monitoring

Track DNS queries and responses:

```bash
# Watch DNS queries
hubble observe --protocol dns

# Find DNS lookup failures
hubble observe --protocol dns --json | \
  jq 'select(.flow.l7.dns.rcode != 0) | {pod: .flow.source.pod_name, query: .flow.l7.dns.query, rcode: .flow.l7.dns.rcode}'

# Most queried domains
hubble observe --protocol dns --type request --last 10000 | \
  grep -oP 'DNS Query \K[^ ]+' | sort | uniq -c | sort -rn | head -20
```

## HTTP Request Visibility

Enable Layer 7 visibility for HTTP:

```yaml
# http-visibility.yaml
apiVersion: "cilium.io/v2"
kind: CiliumNetworkPolicy
metadata:
  name: http-visibility
spec:
  endpointSelector:
    matchLabels:
      app: myapp
  egress:
  - toEndpoints:
    - matchLabels:
        app: backend
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
      rules:
        http:
        - method: "GET|POST|PUT|DELETE"
```

```bash
kubectl apply -f http-visibility.yaml

# Observe HTTP requests
hubble observe --protocol http

# Filter by HTTP method
hubble observe --protocol http --json | jq 'select(.flow.l7.http.method == "POST")'

# Find HTTP errors
hubble observe --protocol http --json | \
  jq 'select(.flow.l7.http.code >= 400) | {pod: .flow.source.pod_name, path: .flow.l7.http.url, code: .flow.l7.http.code}'

# Track API endpoint usage
hubble observe --protocol http --last 5000 | \
  grep -oP 'http://\K[^ ]+' | sort | uniq -c | sort -rn
```

## Using Hubble UI

Access the Hubble UI for visual flow inspection:

```bash
# Port forward Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80

# Open browser to http://localhost:12000
```

The Hubble UI provides:

- Interactive service maps showing traffic flow
- Real-time flow logs with filtering
- Visual representation of network policies
- Cluster-wide traffic patterns

Select a namespace to see service topology and click on flows to see detailed information.

## Monitoring Network Policy Enforcement

Verify network policies are working as expected:

```bash
# Create a test policy
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-external
  namespace: default
spec:
  podSelector:
    matchLabels:
      app: internal
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector: {}
EOF

# Watch for policy drops
hubble observe --verdict DROPPED --namespace default -f

# Test the policy from a pod
kubectl run test --image=curlimages/curl -it --rm --labels="app=internal" -- curl https://google.com

# You should see drops in Hubble output
```

## Exporting Flows to Prometheus

Configure Hubble metrics for Prometheus:

```bash
# Update Cilium with metrics configuration
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set hubble.metrics.enabled="{dns:query;ignoreAAAA,drop,tcp,flow,port-distribution,icmp,http}"

# Check metrics endpoint
kubectl port-forward -n kube-system ds/cilium 9090:9090 &
curl http://localhost:9090/metrics | grep hubble
```

Create ServiceMonitor for Prometheus Operator:

```yaml
# hubble-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: hubble-metrics
  namespace: kube-system
spec:
  selector:
    matchLabels:
      k8s-app: cilium
  endpoints:
  - port: hubble-metrics
    interval: 30s
```

Use these PromQL queries:

```promql
# Flow rate by namespace
rate(hubble_flows_processed_total[5m])

# Dropped packet rate
rate(hubble_drop_total[5m])

# DNS query rate
rate(hubble_dns_queries_total[5m])

# HTTP request rate by status code
rate(hubble_http_requests_total[5m])
```

## Creating Hubble Flow Logs

Export flows to files for analysis:

```bash
# Capture flows to JSON file
hubble observe --last 10000 --json > flows.json

# Analyze with jq
# Top talkers by source
cat flows.json | jq -r '.flow.source.pod_name' | sort | uniq -c | sort -rn | head

# Traffic by verdict
cat flows.json | jq -r '.flow.verdict' | sort | uniq -c

# Extract all dropped flows
cat flows.json | jq 'select(.flow.verdict == "DROPPED")'
```

## Performance Analysis

Identify network performance issues:

```bash
# Find TCP retransmissions
hubble observe --protocol tcp --json | \
  jq 'select(.flow.l4.TCP.flags.RST == true or .flow.l4.TCP.flags.FIN == true)'

# Monitor connection establishment times
hubble observe --protocol tcp --type trace:to-endpoint --json | \
  jq 'select(.flow.l4.TCP.flags.SYN == true) | {time: .time, src: .flow.source.pod_name, dst: .flow.destination.pod_name}'

# Find slow DNS queries (requires timestamp comparison)
hubble observe --protocol dns --json > dns-flows.json
# Analyze in separate script for query/response timing
```

## Troubleshooting Hubble Itself

If Hubble isn't showing flows:

```bash
# Check Cilium Hubble configuration
kubectl -n kube-system exec ds/cilium -- cilium status | grep -A 5 Hubble

# Verify Hubble is enabled
kubectl -n kube-system exec ds/cilium -- cilium config view | grep hubble

# Check flow buffer size
kubectl -n kube-system exec ds/cilium -- hubble stats

# Restart Cilium if needed
kubectl -n kube-system rollout restart ds/cilium
```

## Best Practices

Start with broad filters and narrow down when investigating issues. Use JSON output for automated analysis and alerting. Combine Hubble with Prometheus metrics for comprehensive monitoring. Enable Layer 7 visibility selectively to avoid performance impact. Regularly review dropped flows to identify misconfigured policies.

Cilium Hubble transforms network troubleshooting from guesswork into data-driven investigation. With eBPF-powered visibility into every network flow, you can quickly identify connectivity issues, validate security policies, and understand application communication patterns. These observability capabilities are essential for maintaining reliable and secure Kubernetes networks.
