# How to Configure SUSE Observability for Multi-Cluster Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SUSE Observability, Multi-Cluster, Kubernetes, Monitoring, Rancher

Description: Set up SUSE Observability to monitor multiple Kubernetes clusters from a single pane of glass.

## Introduction

SUSE Observability (formerly StackState) is a full-stack observability platform that provides topology-based monitoring for Kubernetes and cloud-native applications. Unlike traditional metrics-only monitoring tools, SUSE Observability builds a real-time topology map of your infrastructure, making it easier to understand dependencies and pinpoint root causes. This guide covers How to Configure SUSE Observability for Multi-Cluster Monitoring.

## Prerequisites

- Kubernetes cluster (v1.25 to v1.35.3)
- Rancher Prime version supported by the SUSE Observability compatibility matrix (for Rancher-integrated installation)
- Helm v3.13.1 or later
- Capacity for the selected SUSE Observability sizing profile
- Persistent storage with a default StorageClass
- A SUSE Observability license key

## Understanding SUSE Observability Architecture

SUSE Observability consists of:

- **SUSE Observability Server**: Stores topology, metrics, traces, and logs, and runs monitoring and notification services
- **Agents**: Collect Kubernetes topology, metrics, events, and logs from downstream clusters
- **Receiver**: Accepts telemetry and health data from agents and integrations
- **UI**: Web interface for topology visualization and monitoring

## Step 1: Install SUSE Observability

```bash
# Add the SUSE Observability Helm repository

helm repo add suse-observability https://charts.rancher.com/server-charts/prime/suse-observability
helm repo update

# Create namespace
kubectl create namespace suse-observability

# Create values.yaml
cat > values.yaml <<'EOF'
global:
  suseObservability:
    license: "your-license-key"
    baseUrl: "https://observability.example.com"
    sizing:
      profile: "trial"
    adminPassword: "your-admin-password"
EOF

# Install with your values file
helm upgrade --install suse-observability suse-observability/suse-observability \
  --namespace suse-observability \
  --values values.yaml
```

## Step 2: Deploy the Agent

```bash
# The server and agent charts are in the same Helm repository
helm repo add suse-observability https://charts.rancher.com/server-charts/prime/suse-observability
helm repo update

# Deploy agent on each target cluster
helm upgrade --install suse-observability-agent suse-observability/suse-observability-agent \
  --namespace suse-observability \
  --create-namespace \
  --set-string 'stackstate.apiKey'='your-service-token-or-receiver-api-key' \
  --set-string 'stackstate.cluster.name'='production-cluster' \
  --set-string 'stackstate.url'='https://observability.example.com/receiver/stsAgent'
```

Repeat the agent installation for each Kubernetes cluster you want to monitor, using a unique `stackstate.cluster.name`.

## Step 3: Configure Data Collection

```yaml
# agent-values.yaml
stackstate:
  url: "https://observability.example.com/receiver/stsAgent"
  apiKey: "your-service-token-or-receiver-api-key"
  cluster:
    name: "production-cluster"

clusterAgent:
  collection:
    kubernetesTopology: true
    kubernetesEvents: true
    kubernetesMetrics: true
    kubeStateMetrics:
      enabled: true

nodeAgent:
  protocolInspection:
    enabled: true
  httpTracing:
    enabled: true
  containers:
    agent:
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
```

```bash
helm upgrade --install suse-observability-agent \
  suse-observability/suse-observability-agent \
  --namespace suse-observability \
  --values agent-values.yaml
```

## Step 4: Verify Data Collection

```bash
# Check agent pods are running
kubectl get pods -n suse-observability \
  -l app.kubernetes.io/name=suse-observability-agent

# Check agent rollouts
kubectl rollout status daemonset/suse-observability-agent-node-agent \
  -n suse-observability
kubectl rollout status deployment/suse-observability-agent-cluster-agent \
  -n suse-observability
kubectl rollout status deployment/suse-observability-agent-checks-agent \
  -n suse-observability

# View node agent logs
kubectl logs -n suse-observability \
  -l app.kubernetes.io/component=node-agent \
  -c node-agent \
  --follow
```

## Step 5: Access the SUSE Observability UI

```bash
# Check the router service
kubectl get svc suse-observability-router -n suse-observability

# Allow localhost for local debugging with port forwarding
helm upgrade --install suse-observability suse-observability/suse-observability \
  --namespace suse-observability \
  --reuse-values \
  --set 'stackstate.allowedOrigins={http://localhost:8080}'

# Set up port forwarding
kubectl port-forward -n suse-observability \
  service/suse-observability-router 8080:8080 &

# Access the UI
open http://localhost:8080
```

## Key Features to Configure

### Topology Maps

Navigate to **Topology** in the UI to see:
- Service dependencies
- Infrastructure relationships
- Real-time component health
- Change tracking

### Health States

Configure health states through SUSE Observability monitors or external health synchronization. For external health data, create an `ExternalMonitor` that matches the health stream you send to the Receiver API:

```yaml
# external-monitor.yaml
nodes:
- _type: ExternalMonitor
  healthStreamUrn: "urn:health:kubernetes:external-health"
  description: "Monitored by an external health source."
  identifier: "urn:custom:external-monitor:kubernetes-health"
  name: "External Kubernetes Health"
  remediationHint: "Check the external health source."
  tags:
  - "kubernetes"
```

```bash
sts settings apply -f external-monitor.yaml
```

### Monitors and Alerts

```bash
# Inspect existing monitors
sts monitor list

# Create or update custom monitors from a monitor.yaml file
sts monitor apply -f monitor.yaml
```

Configure notification channels separately in the SUSE Observability UI. Notifications are triggered by monitor health-state changes.

## Troubleshooting

```bash
# Check the server install and pods
helm list --namespace suse-observability
kubectl get pods --namespace suse-observability

# Inspect startup failures
kubectl describe pod <pod-name> --namespace suse-observability

# Restart agent if not sending data
kubectl rollout restart daemonset/suse-observability-agent-node-agent \
  -n suse-observability
kubectl rollout restart deployment/suse-observability-agent-cluster-agent \
  -n suse-observability

# Check agent configuration
kubectl get configmap suse-observability-agent-cluster-agent \
  -n suse-observability \
  -o yaml
```

## Conclusion

How to Configure SUSE Observability for Multi-Cluster Monitoring enables comprehensive observability of your Kubernetes infrastructure through topology-based monitoring. SUSE Observability's unique approach of building a real-time dependency map makes it significantly easier to understand the impact of changes and identify root causes of issues. By combining topology visualization with metrics, events, and traces, it provides the full context needed for effective troubleshooting.
