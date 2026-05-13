# Monitor Azure CNI with Cilium Cluster

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Cilium, Kubernetes, AKS, Azure, eBPF

Description: Learn how to monitor network health, connectivity, and policy enforcement in an Azure Kubernetes Service cluster using Azure CNI with Cilium as the networking and observability layer.

---

## Introduction

Azure CNI Powered by Cilium is a networking option available on AKS that combines Azure's native VNet IP management with Cilium's eBPF-based data plane and observability features. This combination provides both native Azure VNet routing for pods and, when Advanced Container Networking Services (ACNS) is enabled, Hubble-based observability for deep network visibility.

Monitoring an Azure CNI + Cilium cluster requires understanding both the Azure networking layer (VNet routes, NSGs, load balancers) and the Cilium data plane (Hubble flows, CiliumNetworkPolicy enforcement, eBPF metrics). The combination of Azure Monitor and ACNS Hubble tooling gives you comprehensive visibility into your cluster's network behavior.

This guide covers setting up monitoring for Azure CNI with Cilium clusters, using both Hubble for Cilium-specific metrics and Azure Monitor for infrastructure-level networking observability.

## Prerequisites

- AKS cluster with Azure CNI Powered by Cilium enabled
- Advanced Container Networking Services (ACNS) enabled for Hubble-based observability
- `kubectl` configured for the AKS cluster
- `cilium` CLI v0.15+ installed
- `hubble` CLI installed for on-demand flow inspection
- Azure CLI (`az`) authenticated
- Prometheus and Grafana (optional, for metrics dashboards)
- OneUptime account for external monitoring

## Step 1: Verify Cilium Status on Azure CNI Cluster

Confirm that Cilium is running correctly in the Azure CNI Powered by Cilium configuration.

Check the Cilium installation status and verify Azure CNI integration:

```bash
# Set these to your AKS cluster values
export RESOURCE_GROUP="<resource-group>"
export CLUSTER_NAME="<aks-cluster-name>"

# Verify Azure CNI and the Cilium data plane are enabled
az aks show \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --query "networkProfile.{plugin:networkPlugin,mode:networkPluginMode,dataplane:networkDataplane}" \
  -o table

# List all Cilium agents across nodes
kubectl get pods -n kube-system -l k8s-app=cilium -o wide

# Confirm the ACNS Hubble relay is running
kubectl get pods -n kube-system -l k8s-app=hubble-relay -o wide
```

## Step 2: Enable Hubble Observability

Activate Hubble for deep network flow visibility within the Cilium cluster.

Enable ACNS so AKS deploys the managed Hubble components for cluster-wide flow collection:

```bash
# Enable ACNS on an existing AKS cluster
az aks update \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --enable-acns

# Wait for the Hubble relay to be ready
kubectl wait --for=condition=Ready pod -l k8s-app=hubble-relay \
  -n kube-system --timeout=120s

# Port-forward to the Hubble relay for CLI access
kubectl port-forward -n kube-system svc/hubble-relay \
  --address 127.0.0.1 4245:443 &

# If you have deployed the AKS Hubble UI manifest, expose it locally
kubectl port-forward -n kube-system svc/hubble-ui 12000:80 &
```

## Step 3: Monitor Network Flows with Hubble CLI

Use the Hubble CLI to observe and filter real-time network flows.

Port-forward the Hubble relay and observe live traffic:

```bash
# Configure Hubble CLI to use the ACNS relay client certificates
CERT_DIR="$(pwd)/.certs"
mkdir -p "$CERT_DIR"
kubectl get secret hubble-relay-client-certs -n kube-system \
  -o jsonpath="{.data['tls\.crt']}" | base64 -d > "$CERT_DIR/tls.crt"
kubectl get secret hubble-relay-client-certs -n kube-system \
  -o jsonpath="{.data['tls\.key']}" | base64 -d > "$CERT_DIR/tls.key"
kubectl get secret hubble-relay-client-certs -n kube-system \
  -o jsonpath="{.data['ca\.crt']}" | base64 -d > "$CERT_DIR/ca.crt"
hubble config set tls true
hubble config set tls-server-name instance.hubble-relay.cilium.io
hubble config set tls-client-cert-file "$CERT_DIR/tls.crt"
hubble config set tls-client-key-file "$CERT_DIR/tls.key"
hubble config set tls-ca-cert-files "$CERT_DIR/ca.crt"

# Observe all network flows in real time
hubble observe --follow

# Filter flows for a specific namespace to monitor application traffic
hubble observe --namespace production --follow

# Monitor dropped flows to identify policy violations
hubble observe --verdict DROPPED --follow

# Count flows by destination port to identify traffic patterns
hubble observe --last 1000 --output json | \
  jq '.flow.l4.TCP.destination_port' | sort | uniq -c | sort -rn | head -10
```

## Step 4: Configure Cilium Metrics for Azure Monitor

Export Cilium and Hubble metrics to Azure Monitor through ACNS and Azure Monitor managed service for Prometheus.

Enable Azure Monitor metrics collection for the AKS cluster:

```bash
az aks update \
  --resource-group "$RESOURCE_GROUP" \
  --name "$CLUSTER_NAME" \
  --enable-azure-monitor-metrics
```

Confirm the managed metrics components are running:

```bash
kubectl get pods -n kube-system -l rsName=ama-metrics
kubectl get pods -n kube-system -l k8s-app=hubble-relay
```

## Step 5: Create Connectivity Monitors with OneUptime

Set up OneUptime monitors to continuously validate pod-to-pod and service connectivity.

Configure synthetic monitors in OneUptime for critical service paths:

```bash
# Run the Cilium connectivity test to validate all network paths
cilium connectivity test --test-namespace cilium-test

# After tests pass, document the critical connectivity paths for OneUptime monitors:
# 1. Pod-to-service DNS resolution: coredns.kube-system:53
# 2. Pod-to-pod cross-node: verify with hubble observe
# 3. External egress: pods reaching Azure services

# Check CiliumNetworkPolicy enforcement statistics
kubectl get ciliumnetworkpolicies -A -o wide
```

## Best Practices

- Enable Hubble on all production AKS clusters for flow-level debugging capability
- Use Azure Network Watcher in addition to Hubble for VNet-level traffic analysis
- Set up Grafana dashboards using Cilium's official dashboard templates for eBPF metrics
- Monitor the Cilium agent DaemonSet rollout health during AKS upgrades
- Configure OneUptime synthetic checks for all critical service-to-service paths and alert on latency increases

## Conclusion

Monitoring an Azure CNI with Cilium cluster requires a dual approach: using Hubble for deep Cilium eBPF observability and Azure Monitor for infrastructure-level networking metrics. Together, these tools provide comprehensive visibility into your cluster's network health, from individual flow drops to VNet-level routing anomalies. Complement your monitoring stack with OneUptime for external synthetic checks that validate end-user-facing connectivity independent of the infrastructure monitoring layer.
