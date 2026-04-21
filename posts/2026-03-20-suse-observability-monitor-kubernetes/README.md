# How to Monitor Kubernetes Clusters with SUSE Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SUSE Observability, Kubernetes, Monitoring, Topology, Observability

Description: Set up comprehensive Kubernetes cluster monitoring with SUSE Observability for topology, metrics, and events.

## Introduction

SUSE Observability (formerly StackState) is a full-stack observability platform that provides topology-based monitoring for Kubernetes and cloud-native applications. Unlike traditional metrics-only monitoring tools, SUSE Observability builds a real-time topology map of your infrastructure, making it easier to understand dependencies and pinpoint root causes. This guide covers How to Monitor Kubernetes Clusters with SUSE Observability.

## Prerequisites

- Kubernetes cluster supported by your SUSE Observability release
- Rancher Prime supported by your SUSE Observability release (for Rancher-integrated installation)
- Helm v3.x (v3.13.1+ for Kubernetes agent integration)
- Cluster capacity that matches the selected SUSE Observability sizing profile
- Permission to create privileged pods, ClusterRoles, and ClusterRoleBindings on the monitored cluster
- A SUSE Observability license key

## Understanding SUSE Observability Architecture

SUSE Observability consists of:

- **SUSE Observability Server**: Core processing and storage engine
- **Agents**: Collect data from Kubernetes nodes and services
- **Receiver/router**: Accepts data from agents and integrations
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
  --set global.imageRegistry="registry.rancher.com" \
  --set-string global.suseObservability.license="your-license-key" \
  --set-string global.suseObservability.baseUrl="https://observability.example.com" \
  --set-string global.suseObservability.sizing.profile="trial" \
  --set-string global.suseObservability.adminPassword="change-this-password" \
  --set 'stackstate.allowedOrigins={http://localhost:8080}'
```

## Step 2: Deploy the Agent

```bash
# The agent chart is in the same Helm repository
helm repo update

# Deploy agent on target cluster
helm upgrade --install suse-observability-agent suse-observability/suse-observability-agent \
  --namespace suse-observability \
  --create-namespace \
  --set-string stackstate.apiKey="your-service-token-or-api-key" \
  --set-string stackstate.cluster.name="production-cluster" \
  --set-string stackstate.url="https://observability.example.com/receiver/stsAgent" \
  --set nodeAgent.skipKubeletTLSVerify=true
```

## Step 3: Configure Data Collection

```yaml
# agent-values.yaml
stackstate:
  url: "https://observability.example.com/receiver/stsAgent"
  apiKey: "your-service-token-or-api-key"
  cluster:
    name: "production-cluster"

# Collect node metrics
nodeAgent:
  skipKubeletTLSVerify: true
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
kubectl get pods -n suse-observability

# View cluster agent logs
kubectl logs -n suse-observability \
  deployment/suse-observability-agent-cluster-agent \
  --tail=100

# View node agent logs
kubectl logs -n suse-observability \
  daemonset/suse-observability-agent-node-agent \
  -c node-agent \
  --tail=100
```

## Step 5: Access the SUSE Observability UI

```bash
# Get the service URL
kubectl get svc suse-observability-router -n suse-observability

# Or set up port forwarding
kubectl port-forward -n suse-observability \
  svc/suse-observability-router 8080:8080 &

# Access the UI
# Browse to http://localhost:8080
```

## Key Features to Configure

### Topology Maps

Navigate to **Topology** in the UI to see:
- Service dependencies
- Infrastructure relationships
- Real-time component health
- Change tracking

### Health States

Configure monitor arguments to reflect component status:

```yaml
# Example override for an out-of-the-box Kubernetes monitor
metadata:
  annotations:
    monitor.kubernetes-v2.stackstate.io/service-available-endpoint: |-
      {
        "threshold": 0.0,
        "failureState": "CRITICAL",
        "enabled": true
      }
```

### Monitors and Alerts

```bash
# Create or update a monitor definition via the SUSE Observability CLI
sts monitor apply -f monitor.yaml

# List monitors and check monitor status
sts monitor list
sts monitor status --id <id>
```

## Troubleshooting

```bash
# Check the server release and pods
helm list --namespace suse-observability
kubectl get pods --namespace suse-observability

# Describe pods that are Pending, ImagePullBackOff, or CrashLoopBackOff
kubectl describe pod <pod-name> --namespace suse-observability

# Restart agent if not sending data
kubectl rollout restart daemonset/suse-observability-agent-node-agent -n suse-observability

# Check agent configuration
kubectl get configmap suse-observability-agent-node-agent -n suse-observability -o yaml
```

## Conclusion

How to Monitor Kubernetes Clusters with SUSE Observability enables comprehensive observability of your Kubernetes infrastructure through topology-based monitoring. SUSE Observability's unique approach of building a real-time dependency map makes it significantly easier to understand the impact of changes and identify root causes of issues. By combining topology visualization with metrics, events, and traces, it provides the full context needed for effective troubleshooting.
