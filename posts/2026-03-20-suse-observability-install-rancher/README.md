# How to Install SUSE Observability in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SUSE Observability, Rancher, Kubernetes, Monitoring, StackState

Description: Install SUSE Observability (StackState) on Rancher-managed Kubernetes clusters for full-stack topology and monitoring.

## Introduction

SUSE Observability (formerly StackState) is a full-stack observability platform that provides topology-based monitoring for Kubernetes and cloud-native applications. Unlike traditional metrics-only monitoring tools, SUSE Observability builds a real-time topology map of your infrastructure, making it easier to understand dependencies and pinpoint root causes. This guide covers How to Install SUSE Observability in Rancher.

## Prerequisites

- A Rancher-managed Kubernetes/RKE2 cluster that matches the SUSE Observability compatibility matrix
- Helm v3.13.1 or higher
- Enough CPU, memory, and SSD-backed storage for the SUSE Observability sizing profile you choose
- A SUSE Observability license key
- Permissions to create privileged pods, ClusterRoles, and ClusterRoleBindings

## Understanding SUSE Observability Architecture

SUSE Observability consists of:

- **SUSE Observability Server**: Core services for topology, metrics, traces, logs, state, and notifications
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
  --set-string 'global.suseObservability.license=your-license-key' \
  --set-string 'global.suseObservability.baseUrl=https://observability.example.com' \
  --set-string 'global.suseObservability.adminPassword=change-me-secure-password' \
  --set-string 'global.suseObservability.sizing.profile=trial' \
  --set-string 'stackstate.allowedOrigins[0]=http://localhost:8080'
```

## Step 2: Deploy the Agent

```bash
# Add the SUSE Observability Helm repository if you have not already added it
helm repo add suse-observability https://charts.rancher.com/server-charts/prime/suse-observability
helm repo update

# Deploy agent on target cluster
helm upgrade --install suse-observability-agent suse-observability/suse-observability-agent \
  --namespace suse-observability \
  --create-namespace \
  --set-string 'stackstate.apiKey=your-api-key' \
  --set-string 'stackstate.cluster.name=production-cluster' \
  --set-string 'stackstate.cluster.authToken=your-cluster-auth-token' \
  --set-string 'stackstate.url=https://observability.example.com/receiver/stsAgent'
```

## Step 3: Configure Data Collection

```yaml
# agent-values.yaml
stackstate:
  apiKey: "your-api-key"
  url: "https://observability.example.com/receiver/stsAgent"
  cluster:
    name: "production-cluster"
    authToken: "your-cluster-auth-token"

# Kubernetes topology, events, and metrics are enabled by default.
clusterAgent:
  collection:
    kubernetesEvents: true
    kubernetesMetrics: true
    kubernetesTopology: true

# Tune node-agent resources if needed.
nodeAgent:
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
  --create-namespace \
  --values agent-values.yaml
```

## Step 4: Verify Data Collection

```bash
# Check agent pods are running
kubectl get pods -n suse-observability \
  -l app.kubernetes.io/instance=suse-observability-agent

# View agent logs
kubectl logs -n suse-observability \
  -l app.kubernetes.io/instance=suse-observability-agent \
  --all-containers \
  --follow

# Check for warnings or errors in recent agent logs
kubectl logs -n suse-observability \
  -l app.kubernetes.io/instance=suse-observability-agent \
  --all-containers \
  --tail=200 \
  | grep -Ei "error|warn"
```

## Step 5: Access the SUSE Observability UI

```bash
# Check the router service
kubectl get svc -n suse-observability suse-observability-router

# Set up port forwarding
kubectl port-forward -n suse-observability \
  service/suse-observability-router 8080:8080

# Access the UI at http://localhost:8080
```

## Key Features to Configure

### Topology Maps

Navigate to **Topology** in the UI to see:
- Service dependencies
- Infrastructure relationships
- Real-time component health
- Change tracking

### Health States

Create monitors to produce health states for matching components:

```yaml
# monitor.yaml
nodes:
- _type: Monitor
  arguments:
    metric:
      query: 'max by (cluster_name, namespace, pod_name, container) (kubernetes_state_container_restarts)'
      unit: short
      aliasTemplate: 'Restarts - ${container}'
    comparator: GT
    threshold: 5.0
    failureState: DEVIATING
    urnTemplate: 'urn:kubernetes:/${cluster_name}:${namespace}:pod/${pod_name}'
    titleTemplate: 'Pod restarts: ${pod_name}'
  description: 'Monitor pods with more than five container restarts.'
  function: {{ get "urn:stackpack:kubernetes-v2:shared:monitor-function:threshold" }}
  identifier: urn:custom:monitor:pod-restart-alert
  intervalSeconds: 30
  name: Pod Restart Alert
  remediationHint: 'Inspect the pod logs and recent Kubernetes events.'
  status: ENABLED
  tags:
  - kubernetes
```

### Monitors and Alerts

```bash
# Create or update a monitor with the SUSE Observability CLI
sts monitor apply -f monitor.yaml

# List configured monitors
sts monitor list
```

## Troubleshooting

```bash
# Check the SUSE Observability release and pods
helm list --namespace suse-observability
kubectl get pods --namespace suse-observability

# Describe a pod that is Pending, ImagePullBackOff, or CrashLoopBackOff
kubectl describe pod <pod-name> --namespace suse-observability

# Restart agent if not sending data
kubectl rollout restart daemonset/suse-observability-agent-node-agent \
  --namespace suse-observability

# Check agent configuration
kubectl get configmap suse-observability-agent-node-agent \
  --namespace suse-observability \
  -o yaml
```

## Conclusion

How to Install SUSE Observability in Rancher enables comprehensive observability of your Kubernetes infrastructure through topology-based monitoring. SUSE Observability's unique approach of building a real-time dependency map makes it significantly easier to understand the impact of changes and identify root causes of issues. By combining topology visualization with metrics, events, and traces, it provides the full context needed for effective troubleshooting.
