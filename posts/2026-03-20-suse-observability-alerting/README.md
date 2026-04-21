# How to Set Up Alerting in SUSE Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SUSE Observability, Alerting, Monitoring, Notification, Kubernetes

Description: Configure monitors and alert notifications in SUSE Observability to get notified of infrastructure and application issues.

## Introduction

SUSE Observability (formerly StackState) is a full-stack observability platform that provides topology-based monitoring for Kubernetes and cloud-native applications. Unlike traditional metrics-only monitoring tools, SUSE Observability builds a real-time topology map of your infrastructure, making it easier to understand dependencies and pinpoint root causes. This guide covers How to Set Up Alerting in SUSE Observability.

## Prerequisites

- Kubernetes cluster (v1.25 to v1.35.3 for current self-hosted SUSE Observability)
- Rancher v2.12 to v2.14 (for Rancher-integrated installation)
- Helm v3.13.1+
- Cluster resources that match the selected SUSE Observability sizing profile
- A SUSE Observability license key
- The SUSE Observability `sts` CLI configured with an API token

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
  --set-string global.suseObservability.license="your-license-key" \
  --set-string global.suseObservability.baseUrl="https://observability.example.com" \
  --set-string global.suseObservability.sizing.profile="trial" \
  --set-string global.suseObservability.adminPassword="change-this-admin-password"
```

## Step 2: Deploy the Agent

```bash
# The agent chart is in the same SUSE Observability Helm repository
helm repo update

# Deploy agent on target cluster
helm upgrade --install suse-observability-agent suse-observability/suse-observability-agent \
  --namespace stackstate \
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
    authToken: "your-cluster-auth-token"

# Enable all Kubernetes data collection
clusterAgent:
  collection:
    kubernetesEvents: true
    kubernetesMetrics: true
    kubernetesTopology: true
    kubeStateMetrics:
      enabled: true

# Collect node and container metrics
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
# Check the release and agent pods
helm list -n stackstate
kubectl get pods -n stackstate \
  -l app.kubernetes.io/instance=suse-observability-agent

# View cluster agent logs
kubectl logs -n stackstate \
  -l app.kubernetes.io/component=cluster-agent,app.kubernetes.io/instance=suse-observability-agent \
  --follow

# View node agent logs
kubectl logs -n stackstate \
  -l app.kubernetes.io/component=node-agent,app.kubernetes.io/instance=suse-observability-agent \
  -c agent \
  --tail=100
```

## Step 5: Access the SUSE Observability UI

```bash
# Get the router service
kubectl get svc -n suse-observability \
  suse-observability-suse-observability-router

# Set up port forwarding
kubectl port-forward -n suse-observability \
  service/suse-observability-suse-observability-router 8080:8080 &

# Access the UI at https://localhost:8080
```

## Key Features to Configure

### Topology Maps

Navigate to **Topology** in the UI to see:
- Service dependencies
- Infrastructure relationships
- Real-time component health
- Change tracking

### Health States

Configure a derived-state monitor to propagate component status:

```yaml
# derived-health-monitor.yaml
nodes:
- _type: "Monitor"
  name: "Aggregated health state of Kubernetes workloads"
  tags:
  - "deployments"
  - "replicasets"
  - "statefulsets"
  - "daemonsets"
  - "derived"
  - "propagated"
  identifier: "urn:custom:monitor:kubernetes-workload-derived-health"
  status: "ENABLED"
  description: "Derive workload health from dependent Kubernetes components."
  function: {{ get "urn:stackpack:common:monitor-function:derived-state-monitor" }}
  arguments:
    componentTypes: "deployment, replicaset, statefulset, daemonset"
  intervalSeconds: 30
  remediationHint: "Investigate component [{{ causeComponentName }}](/#/components/{{ causeComponentUrnForUrl }}) as it is causing the workload to be unhealthy."
```

```bash
sts monitor apply -f derived-health-monitor.yaml
```

### Monitors and Alerts

Configure notifications in the SUSE Observability UI, then scope them to monitors, monitor tags, component types, or component tags.

```bash
# List monitors and check a monitor's current health-state output
sts monitor list
sts monitor status --id <monitor-id>
```

## Troubleshooting

```bash
# Check the server release and pods
helm list -n suse-observability
kubectl get pods -n suse-observability

# Check router logs
kubectl logs -n suse-observability \
  -l app.kubernetes.io/component=router \
  --tail=100

# Restart agent if not sending data
kubectl rollout restart daemonset/suse-observability-agent-node-agent -n stackstate

# Check agent configuration ConfigMaps
kubectl get configmap -n stackstate \
  -l app.kubernetes.io/instance=suse-observability-agent
```

## Conclusion

How to Set Up Alerting in SUSE Observability enables comprehensive observability of your Kubernetes infrastructure through topology-based monitoring. SUSE Observability's unique approach of building a real-time dependency map makes it significantly easier to understand the impact of changes and identify root causes of issues. By combining topology visualization with metrics, events, and traces, it provides the full context needed for effective troubleshooting.
