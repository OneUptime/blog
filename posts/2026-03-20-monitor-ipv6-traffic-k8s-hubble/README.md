# How to Monitor IPv6 Traffic in Kubernetes with Hubble

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, IPv6, Hubble, Cilium, Observability, Monitoring

Description: A guide to using Cilium Hubble to observe, filter, and analyze IPv6 traffic flows in a Kubernetes cluster in real time.

Hubble is the observability layer built into Cilium. It provides deep visibility into pod-to-pod traffic at the network and application layers, including full IPv6 flow data. This guide covers enabling Hubble and querying IPv6-specific traffic.

## Prerequisites

- A Kubernetes cluster running Cilium as the CNI
- `cilium` CLI and `hubble` CLI installed
- Cilium version 1.11 or later (for stable dual-stack support)

## Step 1: Enable Hubble in Cilium

```bash
# Enable Hubble via the Cilium CLI

cilium hubble enable --ui

# Verify Hubble is running
cilium status | grep Hubble

# Check that Hubble relay and UI pods are running
kubectl get pods -n kube-system -l app.kubernetes.io/name=hubble-relay
kubectl get pods -n kube-system -l app.kubernetes.io/name=hubble-ui
```

## Step 2: Install the Hubble CLI

```bash
# Download the Hubble CLI (Linux example)
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/master/stable.txt)
curl -L --remote-name-all \
  "https://github.com/cilium/hubble/releases/download/${HUBBLE_VERSION}/hubble-linux-amd64.tar.gz"
tar xzvf hubble-linux-amd64.tar.gz
sudo mv hubble /usr/local/bin/hubble

# Verify the installation
hubble version
```

## Step 3: Port-Forward to Hubble Relay

```bash
# Forward the Hubble relay port to your local machine
cilium hubble port-forward &

# Verify the relay is accessible
hubble status
```

## Step 4: Observe All IPv6 Traffic Flows

```bash
# Stream all flows and filter for IPv6 addresses
hubble observe --follow | grep -E "([0-9a-f:]{2,39})::"

# Or use Hubble's native filter for IPv6 addresses
hubble observe --follow --ip-version ipv6
```

## Step 5: Filter Traffic by IPv6 Source or Destination

```bash
# Show flows from a specific IPv6 source address
hubble observe --from-ip "fd00::10:244:1:5" --follow

# Show flows to a specific IPv6 destination
hubble observe --to-ip "fd00::10:96:0:1" --follow

# Filter by namespace and IPv6
hubble observe --namespace production --follow --ip-version ipv6
```

## Step 6: Analyze Dropped IPv6 Packets

```bash
# Show only dropped IPv6 flows (useful for debugging NetworkPolicy)
hubble observe --verdict DROPPED --ip-version ipv6 --follow

# Show the reason for each drop
hubble observe --verdict DROPPED --ip-version ipv6 --follow \
  | grep -E "drop_reason|policy"
```

## Step 7: Use the Hubble UI for IPv6 Traffic Visualization

```bash
# Port-forward the Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80 &

# Open in browser
open http://localhost:12000
```

In the UI, select a namespace and filter traffic by address family. IPv6 flows are displayed alongside IPv4 flows with full source/destination information.

## Step 8: Export IPv6 Flow Metrics to Prometheus

Cilium exposes Hubble flow metrics for Prometheus. To see IPv6-specific metrics:

```bash
# Port-forward the Hubble metrics endpoint
kubectl port-forward -n kube-system daemonset/cilium 9965:9965 &

# Check for IPv6-related metrics
curl -s http://localhost:9965/metrics | grep -i "ipv6\|ip6"
```

Hubble's per-flow visibility into IPv6 traffic makes it the most powerful tool available for understanding and debugging IPv6 connectivity in Cilium-based Kubernetes clusters.
