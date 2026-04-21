# How to Configure SUSE Observability Dashboards

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SUSE Observability, Dashboard, Visualization, Monitoring, Kubernetes

Description: Build custom dashboards in SUSE Observability to visualize key metrics, health states, and topology data.

## Introduction

SUSE Observability (formerly StackState) is a full-stack observability platform that provides topology-based monitoring for Kubernetes and cloud-native applications. Unlike traditional metrics-only monitoring tools, SUSE Observability builds a real-time topology map of your infrastructure, making it easier to understand dependencies and pinpoint root causes. This guide covers How to Configure SUSE Observability Dashboards.

## Prerequisites

- Kubernetes cluster supported by the SUSE Observability compatibility matrix
- Rancher v2.12+ (for Rancher-integrated installation)
- Helm v3.13.1+
- Cluster capacity that matches the selected SUSE Observability sizing profile
- A SUSE Observability license key

## Understanding SUSE Observability Architecture

SUSE Observability consists of:

- **StackState Server and API**: Core processing and query services
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
  --set global.suseObservability.sizing.profile="150-ha" \
  --set global.suseObservability.adminPassword="your-admin-password"
```

## Step 2: Deploy the Agent

```bash
# Deploy agent on target cluster
helm upgrade --install stackstate-agent suse-observability/suse-observability-agent \
  --namespace stackstate \
  --create-namespace \
  --set-string stackstate.apiKey="your-service-token-or-receiver-api-key" \
  --set-string stackstate.cluster.name="production-cluster" \
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

# Configure Kubernetes data collection
clusterAgent:
  collection:
    kubernetesEvents: true
    kubernetesMetrics: true
    kubernetesTopology: true
    kubeStateMetrics:
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
helm upgrade --install stackstate-agent \
  suse-observability/suse-observability-agent \
  --namespace stackstate \
  --values agent-values.yaml
```

## Step 4: Verify Data Collection

```bash
# Check agent pods are running
kubectl get pods -n stackstate

# View cluster agent logs
kubectl logs -n stackstate \
  -l app.kubernetes.io/instance=stackstate-agent,app.kubernetes.io/component=cluster-agent \
  --tail=100

# View node agent logs
kubectl logs -n stackstate \
  -l app.kubernetes.io/instance=stackstate-agent,app.kubernetes.io/component=node-agent \
  --tail=100
```

## Step 5: Access the SUSE Observability UI

```bash
# Check the router service
kubectl get svc -n suse-observability suse-observability-router

# Set up port forwarding
kubectl port-forward -n suse-observability \
  svc/suse-observability-router 8080:8080

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

Configure monitors to produce health states for components:

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
    titleTemplate: "Deployment ${deployment} has no available replicas"
  description: "Monitor whether a deployment has available replicas."
  function: {{ get "urn:stackpack:kubernetes-v2:shared:monitor-function:threshold" }}
  identifier: urn:custom:monitor:deployment-has-replicas
  intervalSeconds: 30
  name: Deployment has replicas
  remediationHint: |-
    Check the deployment, replica set, and pod logs for scheduling or image pull errors.
  status: "ENABLED"
  tags:
    - "deployments"
```

### Monitors and Alerts

```bash
# Create or update the monitor from the YAML above
sts monitor apply -f monitor.yaml

# List monitors and check execution status
sts monitor list
sts monitor status --id <monitor-id>
```

## Troubleshooting

```bash
# Check the Helm release and pods
helm status suse-observability -n suse-observability
kubectl get pods -n suse-observability

# Inspect a pod that is Pending, ImagePullBackOff, or CrashLoopBackOff
kubectl describe pod <pod-name> -n suse-observability

# Restart agent if not sending data
kubectl rollout restart daemonset stackstate-agent-node-agent -n stackstate

# Check agent configuration
kubectl get configmap stackstate-agent-cluster-agent -n stackstate -o yaml
kubectl get configmap stackstate-agent-url -n stackstate -o yaml
```

## Conclusion

How to Configure SUSE Observability Dashboards enables comprehensive observability of your Kubernetes infrastructure through topology-based monitoring. SUSE Observability's unique approach of building a real-time dependency map makes it significantly easier to understand the impact of changes and identify root causes of issues. By combining topology visualization with metrics, events, and traces, it provides the full context needed for effective troubleshooting.
