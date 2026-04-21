# How to Configure SUSE Observability Agent

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SUSE Observability, Agent, Kubernetes, Monitoring, Configuration

Description: Deploy and configure the SUSE Observability agent on Kubernetes clusters to collect topology and telemetry data.

## Introduction

SUSE Observability (formerly StackState) is a full-stack observability platform that provides topology-based monitoring for Kubernetes and cloud-native applications. Unlike traditional metrics-only monitoring tools, SUSE Observability builds a real-time topology map of your infrastructure, making it easier to understand dependencies and pinpoint root causes. This guide covers How to Configure SUSE Observability Agent.

## Prerequisites

- A supported Kubernetes cluster
- Rancher Prime with a supported Rancher version (for Rancher-integrated installation)
- Helm v3.13.1 or higher
- Cluster capacity for the selected SUSE Observability sizing profile
- A SUSE Observability license key

## Understanding SUSE Observability Architecture

SUSE Observability consists of:

- **SUSE Observability Server**: Core processing and storage engine
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
  --set global.suseObservability.license="your-license-key" \
  --set global.suseObservability.baseUrl="https://observability.example.com" \
  --set global.suseObservability.sizing.profile="trial" \
  --set global.suseObservability.adminPassword="replace-with-strong-admin-password"
```

## Step 2: Deploy the Agent

```bash
# Add the SUSE Observability Helm repository
helm repo add suse-observability https://charts.rancher.com/server-charts/prime/suse-observability
helm repo update

# Deploy agent on target cluster
helm upgrade --install suse-observability-agent suse-observability/suse-observability-agent \
  --namespace stackstate \
  --create-namespace \
  --set-string stackstate.apiKey="your-service-token-or-receiver-api-key" \
  --set-string stackstate.cluster.name="production-cluster" \
  --set-string stackstate.cluster.authToken="stable-random-cluster-token" \
  --set-string stackstate.url="https://observability.example.com/receiver/stsAgent"
```

## Step 3: Configure Data Collection

```yaml
# agent-values.yaml
stackstate:
  url: "https://observability.example.com/receiver/stsAgent"
  apiKey: "your-service-token-or-receiver-api-key"
  cluster:
    name: "production-cluster"
    authToken: "stable-random-cluster-token"

# Collect Kubernetes events, metrics, and topology
clusterAgent:
  collection:
    kubernetesEvents: true
    kubernetesMetrics: true
    kubernetesTopology: true

# Collect pod logs
logsAgent:
  enabled: true

# Tune node agent resources
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
  --namespace stackstate \
  --values agent-values.yaml
```

## Step 4: Verify Data Collection

```bash
# Check agent pods are running
kubectl get pods -n stackstate \
  -l app.kubernetes.io/instance=suse-observability-agent

# Check agent workloads are rolled out
kubectl rollout status deployment/suse-observability-agent-cluster-agent -n stackstate
kubectl rollout status daemonset/suse-observability-agent-node-agent -n stackstate

# View cluster agent logs
kubectl logs -n stackstate \
  -l app.kubernetes.io/instance=suse-observability-agent,app.kubernetes.io/component=cluster-agent \
  --follow

# View node agent logs
kubectl logs -n stackstate daemonset/suse-observability-agent-node-agent \
  -c agent \
  --follow
```

## Step 5: Access the SUSE Observability UI

```bash
# Check the router service
kubectl get svc -n suse-observability \
  suse-observability-suse-observability-router

# Set up port forwarding
kubectl port-forward -n suse-observability \
  svc/suse-observability-suse-observability-router 8080:8080 &

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

For external health synchronization, create an external monitor and send health data through the Receiver API:

```yaml
# externalMonitor.yaml
nodes:
  - _type: ExternalMonitor
    healthStreamUrn: "urn:health:kubernetes:external-health"
    description: "Monitored by external health synchronization."
    identifier: "urn:custom:external-monitor:heartbeat"
    name: "External Monitor Heartbeat"
    remediationHint: ""
    tags:
      - "heartbeat"
```

### Monitors and Alerts

```yaml
# monitor.yaml
nodes:
  - _type: Monitor
    arguments:
      metric:
        query: "kubernetes_state_deployment_replicas_available"
        unit: "short"
        aliasTemplate: "Deployment replicas"
      comparator: "LTE"
      threshold: 0.0
      failureState: "DEVIATING"
      urnTemplate: "urn:kubernetes:/${cluster_name}:${namespace}:deployment/${deployment}"
    description: "Monitor whether a deployment has available replicas."
    function: '{{ get "urn:stackpack:kubernetes-v2:shared:monitor-function:threshold" }}'
    identifier: "urn:custom:monitor:deployment-has-replicas"
    intervalSeconds: 30
    name: "Deployment has replicas"
    remediationHint: "Check the deployment rollout status and pod logs."
    status: "ENABLED"
    tags:
      - "deployments"
```

```bash
# Apply external monitor and custom monitor definitions
sts settings apply -f externalMonitor.yaml
sts monitor apply -f monitor.yaml
```

## Troubleshooting

```bash
# Check the server release and pods
helm list --namespace suse-observability
kubectl get pods --namespace suse-observability

# Restart agent if not sending data
kubectl rollout restart daemonset/suse-observability-agent-node-agent -n stackstate
kubectl rollout restart deployment/suse-observability-agent-cluster-agent -n stackstate

# Check agent configuration
kubectl get configmap suse-observability-agent-cluster-agent -n stackstate -o yaml
```

## Conclusion

How to Configure SUSE Observability Agent enables comprehensive observability of your Kubernetes infrastructure through topology-based monitoring. SUSE Observability's unique approach of building a real-time dependency map makes it significantly easier to understand the impact of changes and identify root causes of issues. By combining topology visualization with metrics, events, and traces, it provides the full context needed for effective troubleshooting.
