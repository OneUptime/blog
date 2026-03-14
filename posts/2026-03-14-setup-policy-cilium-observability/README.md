# How to Set Up Observability Policies in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Observability, Network Policy, Hubble, Monitoring

Description: A practical guide to configuring Cilium observability policies that provide visibility into network traffic, policy decisions, and application behavior without compromising security or performance.

---

## Introduction

Cilium's observability capabilities provide deep insight into network traffic flows, policy decisions, and application communication patterns. Setting up observability policies correctly ensures you have the visibility needed for security monitoring, troubleshooting, and compliance without generating excessive data or impacting performance.

Observability in Cilium is powered by Hubble, which provides flow-level visibility including L3/L4 network flows, L7 protocol details, DNS resolution, and policy verdict information. Proper policy configuration determines which flows are observed, at what detail level, and where the data is exported.

This guide walks through setting up Cilium observability policies from scratch, configuring Hubble, and integrating with monitoring infrastructure.

## Prerequisites

- Kubernetes cluster (1.21+)
- Helm 3 installed
- `kubectl` cluster admin access
- Basic understanding of Cilium network policies
- Familiarity with Prometheus and Grafana (for metrics export)

## Installing Cilium with Observability Enabled

Deploy Cilium with Hubble observability features:

```bash
# Add the Cilium Helm repository
helm repo add cilium https://helm.cilium.io/
helm repo update

# Install Cilium with Hubble enabled
helm install cilium cilium/cilium --version 1.15.0 \
    --namespace kube-system \
    --set hubble.enabled=true \
    --set hubble.relay.enabled=true \
    --set hubble.ui.enabled=true \
    --set hubble.metrics.enableOpenMetrics=true \
    --set hubble.metrics.enabled="{dns,drop,tcp,flow,port-distribution,icmp,httpV2:exemplars=true;labelsContext=source_ip\,source_namespace\,source_workload\,destination_ip\,destination_namespace\,destination_workload}"

# Verify Hubble is running
kubectl get pods -n kube-system -l k8s-app=hubble-relay
kubectl get pods -n kube-system -l k8s-app=hubble-ui
```

Install the Hubble CLI:

```bash
# Install Hubble CLI
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --remote-name-all https://github.com/cilium/hubble/releases/download/$HUBBLE_VERSION/hubble-linux-amd64.tar.gz
tar xzvf hubble-linux-amd64.tar.gz
sudo mv hubble /usr/local/bin/

# Verify connectivity
cilium hubble port-forward &
hubble status
```

## Configuring Flow Visibility Policies

Control which flows are visible through CiliumNetworkPolicy annotations:

```yaml
# visibility-policy.yaml
# This policy makes HTTP traffic to the frontend service visible at L7
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: frontend-visibility
  namespace: default
spec:
  endpointSelector:
    matchLabels:
      app: frontend
  ingress:
    - fromEndpoints:
        - {}
      toPorts:
        - ports:
            - port: "80"
              protocol: TCP
          rules:
            http:
              - method: "GET"
              - method: "POST"
```

For visibility without enforcement, use annotations:

```yaml
# Enable L7 visibility on a pod without enforcing policy
apiVersion: v1
kind: Pod
metadata:
  name: my-app
  annotations:
    policy.cilium.io/proxy-visibility: "<Ingress/80/TCP/HTTP>"
  labels:
    app: my-app
spec:
  containers:
    - name: app
      image: my-app:latest
      ports:
        - containerPort: 80
```

```mermaid
flowchart LR
    A[Traffic] --> B{Hubble Enabled?}
    B -->|No| C[No Visibility]
    B -->|Yes| D{L7 Policy/Annotation?}
    D -->|No| E[L3/L4 Flows Only]
    D -->|Yes| F[Full L7 Visibility]
    F --> G[Hubble Relay]
    E --> G
    G --> H[Hubble UI]
    G --> I[Hubble CLI]
    G --> J[Prometheus Metrics]
```

## Setting Up Hubble Metrics Export

Configure Hubble to export metrics to Prometheus:

```yaml
# hubble-metrics-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: hubble-metrics-config
  namespace: kube-system
data:
  metrics: |
    dns:query;ignoreAAAA
    drop:sourceContext=identity;destinationContext=identity
    tcp:sourceContext=identity;destinationContext=identity
    flow:sourceContext=identity;destinationContext=identity
    port-distribution:sourceContext=identity;destinationContext=identity
    httpV2:sourceContext=identity;destinationContext=identity;labelsContext=source_namespace,destination_namespace
```

Create a ServiceMonitor for Prometheus to scrape Hubble metrics:

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
      k8s-app: hubble
  endpoints:
    - port: hubble-metrics
      interval: 30s
```

## Observing Traffic Flows

Use Hubble to observe traffic with various filters:

```bash
# Observe all flows
hubble observe

# Filter by namespace
hubble observe --namespace default

# Filter by pod
hubble observe --pod default/frontend

# Filter by verdict (allowed/denied/dropped)
hubble observe --verdict DROPPED

# Filter by L7 protocol
hubble observe --type l7 --protocol HTTP

# Filter by HTTP status code
hubble observe --http-status-code 500

# Export to JSON for processing
hubble observe --namespace default -o json > flows.json

# Follow flows in real time
hubble observe --follow --namespace default
```

## Verification

Verify the observability setup is working:

```bash
# Check Hubble status
hubble status

# Verify flow observation works
hubble observe --last 10

# Check metrics are being exported
kubectl port-forward -n kube-system svc/hubble-metrics 9965:9965 &
curl -s http://localhost:9965/metrics | head -20

# Verify L7 visibility
hubble observe --type l7 --last 10

# Check Hubble UI is accessible
kubectl port-forward -n kube-system svc/hubble-ui 12000:80
echo "Open http://localhost:12000 in browser"
```

## Troubleshooting

**Problem: hubble status shows "Unavailable"**
Ensure Hubble relay is running: `kubectl get pods -n kube-system -l k8s-app=hubble-relay`. If not running, check that Hubble was enabled during Cilium installation.

**Problem: No L7 flows visible**
L7 visibility requires either an L7 network policy or the `proxy-visibility` annotation on the pod. L3/L4-only policies do not generate L7 flow data.

**Problem: Metrics not appearing in Prometheus**
Check that the ServiceMonitor is created and that Prometheus is configured to watch the kube-system namespace. Verify the metrics port is exposed.

**Problem: High CPU usage from Hubble**
Reduce the flow buffer size or enable sampling. Adjust `hubble.eventQueueSize` and `hubble.metricsServer.enabled` in Helm values.

## Conclusion

Setting up Cilium observability policies provides critical visibility into network traffic and policy enforcement. By enabling Hubble with appropriate metrics, configuring L7 visibility through policies or annotations, and integrating with Prometheus for metrics export, you build a comprehensive observability stack. Start with L3/L4 visibility for all traffic and add L7 visibility selectively for services that require deep inspection to balance visibility with performance.
