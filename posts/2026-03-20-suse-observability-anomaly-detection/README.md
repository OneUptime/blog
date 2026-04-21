# How to Set Up Anomaly Detection in SUSE Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SUSE Observability, Anomaly Detection, AI/ML, Monitoring, Observability

Description: Configure anomaly detection in SUSE Observability to automatically identify unusual patterns in metrics and performance.

## Introduction

SUSE Observability (formerly StackState) is a full-stack observability platform that provides topology-based monitoring for Kubernetes and cloud-native applications. Unlike traditional metrics-only monitoring tools, SUSE Observability builds a real-time topology map of your infrastructure, making it easier to understand dependencies and pinpoint root causes. This guide covers How to Set Up Anomaly Detection in SUSE Observability.

## Prerequisites

- Kubernetes cluster supported by your SUSE Observability release (for example, Kubernetes 1.25 to 1.35.3 for the current self-hosted compatibility matrix)
- Rancher v2.12+ (for Rancher-integrated installation)
- Helm v3.13.1+
- CPU, memory, and storage that match your selected SUSE Observability sizing profile
- A SUSE Observability license key

## Understanding SUSE Observability Architecture

SUSE Observability consists of:

- **StackState Server**: Core processing and storage engine
- **Agents**: Collect data from Kubernetes nodes and services
- **Receiver**: Accepts data from agents and integrations
- **UI**: Web interface for topology visualization and monitoring

## Step 1: Install SUSE Observability

```bash
# Add the SUSE Observability Helm repository

helm repo add suse-observability https://charts.rancher.com/server-charts/prime/suse-observability
helm repo update

# Create namespace
kubectl create namespace suse-observability

# Install with your license key
helm upgrade --install suse-observability suse-observability/suse-observability \
  --namespace suse-observability \
  --set-string global.suseObservability.license="your-license-key" \
  --set-string global.suseObservability.baseUrl="https://observability.example.com" \
  --set-string global.suseObservability.sizing.profile="trial" \
  --set-string global.suseObservability.adminPassword="your-admin-password" \
  --set anomaly-detection.enabled=true
```

## Step 2: Deploy the Agent

```bash
# Add the SUSE Observability Helm repository
helm repo add suse-observability https://charts.rancher.com/server-charts/prime/suse-observability
helm repo update

# Deploy agent on target cluster
helm upgrade --install suse-observability-agent suse-observability/suse-observability-agent \
  --namespace suse-observability \
  --create-namespace \
  --set-string stackstate.apiKey="your-receiver-api-key" \
  --set-string stackstate.cluster.name="production-cluster" \
  --set-string stackstate.url="https://observability.example.com/receiver/stsAgent"
```

## Step 3: Configure Data Collection

```yaml
# agent-values.yaml
stackstate:
  url: "https://observability.example.com/receiver/stsAgent"
  apiKey: "your-receiver-api-key"
  cluster:
    name: "production-cluster"

# Optional: skip kubelet TLS verification when kubelet certificates are not trusted
nodeAgent:
  skipKubeletTLSVerify: true
  containers:
    agent:
      resources:
        requests:
          cpu: "100m"
          memory: "256Mi"
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
  -l app.kubernetes.io/instance=suse-observability-agent

# View agent logs
kubectl logs -n suse-observability \
  -l app.kubernetes.io/instance=suse-observability-agent,app.kubernetes.io/component=node-agent \
  -c node-agent \
  --tail=100

# Check registered agents through the SUSE Observability CLI
sts agent list
```

## Step 5: Access the SUSE Observability UI

```bash
# Get the service URL
kubectl get svc -n suse-observability suse-observability-suse-observability-router

# Or set up port forwarding
kubectl port-forward -n suse-observability \
  service/suse-observability-suse-observability-router 8080:8080 &

# Access the UI
open https://localhost:8080
```

## Key Features to Configure

### Topology Maps

Navigate to **Topology** in the UI to see:
- Service dependencies
- Infrastructure relationships
- Real-time component health
- Change tracking

### Health States

Configure a Dynamic Threshold monitor to detect metric anomalies and reflect the result on topology components:

```yaml
# anomaly-monitor.yaml
nodes:
  - _type: "Monitor"
    name: "Deployment Replica Anomaly"
    identifier: "urn:custom:monitor:deployment-replica-anomaly"
    status: "ENABLED"
    description: "Detect unusual deployment replica counts"
    function: {{ get "urn:stackpack:aad-v2:shared:monitor-function:dt" }}
    arguments:
      telemetryQuery:
        query: "kubernetes_state_deployment_replicas_available"
        unit: "short"
        aliasTemplate: "Deployment replicas"
      topologyQuery: 'type = "deployment" and label = "stackpack:kubernetes"'
      falsePositiveRate: !!float 1e-8
      checkWindowMinutes: 10
      historicWindowMinutes: 120
      historySizeWeeks: 2
      includePreviousDay: false
      removeTrend: true
    intervalSeconds: 60
    remediationHint: "Check recent deployment changes and pod logs for this workload."
```

### Monitors and Alerts

```bash
# Create or update the anomaly monitor
sts monitor apply -f anomaly-monitor.yaml

# Verify configured monitors
sts monitor list
```

## Troubleshooting

```bash
# Check the release and pods
helm list --namespace suse-observability
kubectl get pods --namespace suse-observability

# Inspect pod events and logs
kubectl describe pod <pod-name> --namespace suse-observability
kubectl logs <pod-name> --namespace suse-observability --all-containers=true

# Restart agent if not sending data
kubectl rollout restart daemonset/suse-observability-agent-node-agent \
  --namespace suse-observability

# Check agent configuration
kubectl get configmap suse-observability-agent-cluster-name \
  --namespace suse-observability \
  -o yaml
```

## Conclusion

How to Set Up Anomaly Detection in SUSE Observability enables comprehensive observability of your Kubernetes infrastructure through topology-based monitoring. SUSE Observability's unique approach of building a real-time dependency map makes it significantly easier to understand the impact of changes and identify root causes of issues. By combining topology visualization with metrics, events, and traces, it provides the full context needed for effective troubleshooting.
