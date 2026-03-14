# How to Monitor Network Traffic on Talos Linux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Network Monitoring, Kubernetes, Cilium, EBPF, Prometheus, Network Policy

Description: Learn how to monitor and analyze network traffic on Talos Linux Kubernetes clusters using Cilium Hubble, Prometheus, and network observability tools.

---

Network visibility is one of the harder things to get right on Kubernetes. Pods communicate with each other, with external services, and through ingress controllers, and all of this traffic happens on a virtual network that is invisible unless you set up the right tools. On Talos Linux, where you cannot install traditional network monitoring tools on the host, you need Kubernetes-native solutions. This guide covers how to monitor network traffic on Talos Linux using Cilium Hubble, Prometheus network metrics, and other observability tools.

## The Challenge of Kubernetes Networking on Talos

Talos Linux is immutable. You cannot SSH in and run tcpdump, iftop, or any of the traditional network debugging tools. The OS does not have a package manager. This means all network monitoring must happen through:

1. Kubernetes-native tools running as pods
2. The Talos API (talosctl) for node-level network information
3. CNI plugin observability features

The good news is that modern CNI plugins like Cilium provide network observability features that are actually better than what you get with traditional tools.

## Step 1: Using talosctl for Basic Network Info

Start with what Talos gives you out of the box:

```bash
# View network interfaces on a node
talosctl get addresses --nodes 10.0.0.10

# View routing tables
talosctl get routes --nodes 10.0.0.10

# Check network connectivity
talosctl netstat --nodes 10.0.0.10

# View network link status
talosctl get links --nodes 10.0.0.10

# Check DNS resolver configuration
talosctl get resolvers --nodes 10.0.0.10
```

These commands give you basic network state, but not traffic flow information.

## Step 2: Enable Cilium Hubble for Network Observability

If your Talos Linux cluster uses Cilium as the CNI (which is the default for many Talos deployments), Hubble is the best network monitoring tool available. Hubble provides deep visibility into network flows, DNS queries, and HTTP requests.

Enable Hubble in your Cilium configuration:

```yaml
# cilium-hubble-values.yaml
hubble:
  enabled: true
  relay:
    enabled: true
    replicas: 2
  ui:
    enabled: true
    replicas: 1
  metrics:
    enabled:
      - dns
      - drop
      - tcp
      - flow
      - icmp
      - http
    serviceMonitor:
      enabled: true
      labels:
        release: prometheus-stack
```

If Cilium is already installed, upgrade it:

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --values cilium-hubble-values.yaml
```

Verify Hubble is running:

```bash
# Check Hubble pods
kubectl get pods -n kube-system -l k8s-app=hubble-relay
kubectl get pods -n kube-system -l k8s-app=hubble-ui

# Install the Hubble CLI
curl -L --remote-name-all https://github.com/cilium/hubble/releases/latest/download/hubble-linux-amd64.tar.gz
tar xzvf hubble-linux-amd64.tar.gz
sudo mv hubble /usr/local/bin/
```

## Step 3: Observe Network Flows with Hubble

Port-forward to the Hubble relay and observe live traffic:

```bash
# Port-forward to Hubble Relay
kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &

# Set up Hubble CLI to use the relay
export HUBBLE_SERVER=localhost:4245

# Watch all network flows in real-time
hubble observe --follow

# Filter by namespace
hubble observe --namespace default --follow

# Filter by pod
hubble observe --pod default/my-app --follow

# Show only dropped packets
hubble observe --verdict DROPPED --follow

# Show only DNS queries
hubble observe --protocol dns --follow

# Show HTTP traffic with status codes
hubble observe --protocol http --follow

# Show traffic between two specific pods
hubble observe --from-pod default/frontend --to-pod default/backend --follow
```

## Step 4: Access the Hubble UI

The Hubble UI provides a visual service map showing how your pods communicate:

```bash
# Port-forward to the Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80
```

Open http://localhost:12000 in your browser. You will see:

- A service dependency graph showing which services talk to each other
- Traffic flow rates between services
- DNS query patterns
- Dropped packet information
- HTTP request/response details

## Step 5: Collect Network Metrics with Prometheus

Hubble exports metrics that Prometheus can scrape. Here are the key network metrics to monitor:

```promql
# Network flow rate by source and destination
sum(rate(hubble_flows_processed_total[5m])) by (source, destination, type)

# DNS query rate
sum(rate(hubble_dns_queries_total[5m])) by (query, rcode)

# DNS query latency
histogram_quantile(0.99, rate(hubble_dns_response_types_total[5m]))

# Dropped packets by reason
sum(rate(hubble_drop_total[5m])) by (reason)

# TCP connection rate
sum(rate(hubble_tcp_flags_total{flag="SYN"}[5m])) by (source, destination)

# HTTP request rate by status code
sum(rate(hubble_http_requests_total[5m])) by (method, status, source, destination)

# HTTP request latency
histogram_quantile(0.95, rate(hubble_http_request_duration_seconds_bucket[5m]))
```

## Step 6: Monitor Node-Level Network Metrics

Even without Hubble, node-exporter provides network interface metrics:

```promql
# Network bandwidth per node (bytes per second)
rate(node_network_receive_bytes_total{device!="lo"}[5m])
rate(node_network_transmit_bytes_total{device!="lo"}[5m])

# Network errors per interface
rate(node_network_receive_errs_total[5m])
rate(node_network_transmit_errs_total[5m])

# Dropped packets at the interface level
rate(node_network_receive_drop_total[5m])
rate(node_network_transmit_drop_total[5m])

# TCP connection states
node_netstat_Tcp_CurrEstab
node_netstat_Tcp_ActiveOpens
```

## Step 7: Set Up Network Alerts

Create alerting rules for network anomalies:

```yaml
# network-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: network-alerts
  namespace: monitoring
  labels:
    release: prometheus-stack
spec:
  groups:
    - name: network-monitoring
      rules:
        # Alert on high packet drop rate
        - alert: HighPacketDropRate
          expr: sum(rate(hubble_drop_total[5m])) > 100
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High packet drop rate detected"
            description: "The cluster is dropping {{ $value }} packets per second. Check network policies and pod connectivity."

        # Alert on DNS failures
        - alert: DNSResolutionFailures
          expr: sum(rate(hubble_dns_queries_total{rcode!="NOERROR"}[5m])) > 10
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "DNS resolution failures detected"
            description: "{{ $value }} DNS queries per second are failing. Check CoreDNS health and configuration."

        # Alert on network interface errors
        - alert: NetworkInterfaceErrors
          expr: rate(node_network_receive_errs_total[5m]) + rate(node_network_transmit_errs_total[5m]) > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Network errors on {{ $labels.instance }} interface {{ $labels.device }}"
            description: "Network interface {{ $labels.device }} on {{ $labels.instance }} is experiencing errors."

        # Alert on high network bandwidth usage
        - alert: HighNetworkBandwidth
          expr: |
            (rate(node_network_receive_bytes_total{device!="lo"}[5m])
            + rate(node_network_transmit_bytes_total{device!="lo"}[5m]))
            / 1024 / 1024 > 800
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "High network bandwidth on {{ $labels.instance }}"
            description: "Network interface {{ $labels.device }} on {{ $labels.instance }} is using {{ $value }}MB/s."

        # Alert on HTTP 5xx errors
        - alert: HighHTTP5xxRate
          expr: sum(rate(hubble_http_requests_total{status=~"5.."}[5m])) by (source, destination) > 1
          for: 5m
          labels:
            severity: warning
          annotations:
            summary: "High HTTP 5xx error rate from {{ $labels.source }} to {{ $labels.destination }}"
            description: "{{ $value }} HTTP 5xx errors per second between {{ $labels.source }} and {{ $labels.destination }}."
```

```bash
kubectl apply -f network-alerts.yaml
```

## Step 8: Network Policy Monitoring

If you are using network policies to restrict pod communication, monitor their effectiveness:

```bash
# View active network policies
kubectl get networkpolicies --all-namespaces

# Use Hubble to verify policy enforcement
hubble observe --verdict DROPPED --follow

# Check which pods are affected by policies
hubble observe --from-pod default/untrusted-app --verdict DROPPED
```

Create a dashboard panel showing policy-related drops:

```promql
# Drops due to network policy
sum(rate(hubble_drop_total{reason="POLICY_DENIED"}[5m])) by (source, destination)
```

## Using Packet Capture on Talos

For deep debugging, Talos supports packet capture through the API:

```bash
# Capture packets on a specific node (outputs pcap format)
talosctl pcap --nodes 10.0.0.10 --interface eth0 --duration 30s -o capture.pcap

# Analyze the capture with tcpdump or Wireshark
tcpdump -r capture.pcap

# Filter for specific traffic
talosctl pcap --nodes 10.0.0.10 --interface eth0 --bpf-filter "port 80" --duration 10s
```

## Conclusion

Monitoring network traffic on Talos Linux requires a different approach than traditional Linux systems, but the tools available are actually more powerful. Cilium Hubble gives you service-level network visibility with flow data, DNS monitoring, and HTTP-aware metrics that traditional tcpdump never provided. Combined with node-exporter network metrics and proper alerting rules, you get comprehensive network observability for your Talos Linux cluster. Start with Hubble for flow-level visibility, add Prometheus metrics for historical analysis, and use talosctl packet capture for deep debugging when needed.
