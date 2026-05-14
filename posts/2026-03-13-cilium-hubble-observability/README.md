# Hubble Observability in Cilium

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, Hubble, Observability, eBPF

Description: Deploy and use Hubble, Cilium's built-in distributed observability platform, to gain deep visibility into network flows, security policy decisions, and service dependencies across your cluster.

---

## Introduction

Hubble is Cilium's built-in observability layer, built on top of eBPF's ability to observe network flows in the kernel without packet sampling or full packet-capture overhead. Unlike traditional network monitoring that captures packets at the NIC level and sends them to a collection system, Hubble observes flows at the eBPF level and generates structured flow events with full Kubernetes context - pod names, namespaces, labels, service names, and policy verdicts.

The architecture of Hubble is a distributed system: each Cilium node runs a Hubble server that exposes a gRPC API for real-time flow queries. A Hubble relay aggregates streams from all nodes into a single API endpoint, and the Hubble CLI and UI connect to the relay for cluster-wide visibility. This design means you can query flows from any node without SSH access, filter by namespace or pod label, and see whether policy allowed or denied each connection.

This guide covers deploying Hubble, using the CLI for real-time flow observation, and setting up the Hubble UI for visual service dependency mapping.

## Prerequisites

- Cilium v1.19+ installed
- Helm v3+
- `kubectl` installed
- `cilium` CLI installed

## Step 1: Enable Hubble

```bash
helm upgrade cilium cilium/cilium \
  --namespace kube-system \
  --reuse-values \
  --set hubble.enabled=true \
  --set hubble.relay.enabled=true \
  --set hubble.ui.enabled=true \
  --set hubble.metrics.enableOpenMetrics=true \
  --set hubble.metrics.enabled="{dns,drop,tcp,flow,port-distribution,icmp,httpV2}"
```

Verify Hubble is running:

```bash
cilium status | grep Hubble
kubectl get pods -n kube-system -l k8s-app=hubble-relay
```

## Step 2: Install Hubble CLI

```bash
HUBBLE_VERSION=$(curl -s https://raw.githubusercontent.com/cilium/hubble/main/stable.txt)
HUBBLE_ARCH=amd64
if [ "$(uname -m)" = "aarch64" ]; then HUBBLE_ARCH=arm64; fi
curl -L --fail --remote-name-all \
  https://github.com/cilium/hubble/releases/download/${HUBBLE_VERSION}/hubble-linux-${HUBBLE_ARCH}.tar.gz{,.sha256sum}
sha256sum --check hubble-linux-${HUBBLE_ARCH}.tar.gz.sha256sum
sudo tar xzvfC hubble-linux-${HUBBLE_ARCH}.tar.gz /usr/local/bin
rm hubble-linux-${HUBBLE_ARCH}.tar.gz{,.sha256sum}

# Configure Hubble CLI to connect through port-forward

kubectl port-forward -n kube-system svc/hubble-relay 4245:80 &
export HUBBLE_SERVER=localhost:4245
```

## Step 3: Observe Live Flows

```bash
# Observe all flows in the cluster
hubble observe --follow

# Filter by namespace
hubble observe --namespace production --follow

# Filter by verdict
hubble observe --verdict DROPPED --follow

# Filter by source pod
hubble observe --from-pod production/frontend --follow

# Filter by protocol
hubble observe --protocol http --follow
```

## Step 4: Query Buffered Flows

```bash
# Last 100 buffered flows from default namespace
hubble observe --namespace default --last 100

# HTTP flows with status codes
hubble observe --protocol http --last 50

# Policy drops from the flow buffer since the last 10 minutes
hubble observe --verdict DROPPED --since 10m
```

## Step 5: Access Hubble UI

```bash
# Port-forward the Hubble UI
kubectl port-forward -n kube-system svc/hubble-ui 12000:80

# Open browser at http://localhost:12000
# Navigate to a namespace to see the service dependency map
```

## Hubble Architecture

```mermaid
flowchart TD
    A[eBPF Programs\non each node] -->|Flow events| B[Hubble Server\nper node :4244]
    B --> C[Hubble Relay\ncluster-wide :4245]
    C --> D[Hubble CLI]
    C --> E[Hubble UI]
    B --> F[Prometheus Metrics\n:9965]
    F --> G[Grafana Dashboard]
```

## Conclusion

Hubble transforms eBPF's kernel-level network visibility into actionable, Kubernetes-aware network intelligence. The combination of real-time flow filtering with the Hubble UI's service dependency mapping gives you unprecedented visibility into how your services actually communicate. Hubble's policy verdict events are particularly valuable for security - you can see whether policy allowed or denied each connection, making policy debugging and compliance auditing dramatically more efficient than analyzing iptables logs or tcpdump captures.
