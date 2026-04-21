# How to Troubleshoot Application Issues with SUSE Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SUSE Observability, Troubleshooting, Application, Kubernetes, Root Cause Analysis

Description: Use SUSE Observability's topology and dependency mapping to investigate and resolve application performance issues.

## Introduction

SUSE Observability (formerly StackState) is a full-stack observability platform that provides topology-based monitoring for Kubernetes and cloud-native applications. Unlike traditional metrics-only monitoring tools, SUSE Observability builds a real-time topology map of your infrastructure, making it easier to understand dependencies and pinpoint root causes. This guide covers How to Troubleshoot Application Issues with SUSE Observability.

## Prerequisites

- Supported Kubernetes or OpenShift cluster
- Rancher version that matches the SUSE Observability compatibility matrix (for Rancher-integrated installation)
- Helm v3.13.1+
- Resources for the selected sizing profile; the trial profile requests about 7 vCPU and 22.7 GiB memory, and HA profiles require at least 3 nodes
- A SUSE Observability license key and admin password

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

# Install with your license key, admin password, and sizing profile
helm upgrade --install suse-observability \
  suse-observability/suse-observability \
  --namespace suse-observability \
  --set-string global.suseObservability.license="your-license-key" \
  --set-string global.suseObservability.baseUrl="https://observability.example.com" \
  --set-string global.suseObservability.sizing.profile="trial" \
  --set-string global.suseObservability.adminPassword="your-admin-password"
```

## Step 2: Deploy the Agent

```bash
# The agent chart is published in the same SUSE Observability Helm repository
helm repo update

# Deploy agent on target cluster
helm upgrade --install stackstate-agent \
  suse-observability/suse-observability-agent \
  --namespace stackstate \
  --create-namespace \
  --set-string stackstate.apiKey="your-receiver-api-key" \
  --set-string stackstate.url="https://observability.example.com/receiver/stsAgent" \
  --set-string stackstate.cluster.name="production-cluster"
```

## Step 3: Configure Data Collection

```yaml
# agent-values.yaml
stackstate:
  url: "https://observability.example.com/receiver/stsAgent"
  apiKey: "your-receiver-api-key"
  cluster:
    name: "production-cluster"

# Adjust node agent resources when needed
nodeAgent:
  containers:
    agent:
      resources:
        requests:
          cpu: "100m"
          memory: "256Mi"
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
kubectl get pods -n stackstate \
  -l app.kubernetes.io/instance=stackstate-agent

# View agent logs
kubectl logs -n stackstate \
  -l app.kubernetes.io/instance=stackstate-agent \
  --all-containers=true \
  --tail=100 \
  --follow

# Check recent agent logs for receiver/API errors
kubectl logs -n stackstate \
  -l app.kubernetes.io/instance=stackstate-agent \
  --all-containers=true \
  --tail=200 \
  | grep -Ei "error|forbidden|unauthorized|timeout"
```

## Step 5: Access the SUSE Observability UI

```bash
# Access the configured external URL
open https://observability.example.com

# Or set up port forwarding to the router service for local debugging.
# If you use localhost, include http://localhost:8080 in stackstate.allowedOrigins.
kubectl port-forward -n suse-observability \
  svc/suse-observability-router 8080:8080 &

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

SUSE Observability accepts external health data through the Receiver API. A health state must be bound to an existing topology element identifier:

```json
{
  "collection_timestamp": 1548857167,
  "internalHostname": "local.test",
  "health": [
    {
      "consistency_model": "REPEAT_STATES",
      "expiry": {
        "repeat_interval_s": 300,
        "expiry_interval_s": 600
      },
      "stream": {
        "urn": "urn:health:custom:production"
      },
      "check_states": [
        {
          "checkStateId": "high-cpu-api",
          "name": "High CPU Usage",
          "message": "CPU usage is above 80%.",
          "health": "Deviating",
          "topologyElementIdentifier": "<topology-element-identifier>"
        }
      ]
    }
  ]
}
```

### Monitors and Alerts

```bash
# Create or update a monitor definition through the SUSE Observability CLI
sts monitor apply -f monitor.yaml

# Verify and inspect monitors
sts monitor list
sts monitor status --id <id>
```

## Troubleshooting

```bash
# Check SUSE Observability pods
kubectl get pods -n suse-observability

# Inspect router logs; repeat with suspected component labels as needed
kubectl logs -n suse-observability \
  -l app.kubernetes.io/component=router \
  --all-containers=true \
  --tail=200

# Describe a suspected pod
kubectl describe pod -n suse-observability <pod-name>

# Restart agent if not sending data
kubectl rollout restart daemonset/stackstate-agent-node-agent -n stackstate
kubectl rollout restart deployment/stackstate-agent-cluster-agent -n stackstate
kubectl rollout restart deployment/stackstate-agent-checks-agent -n stackstate

# Check agent configuration
kubectl get configmap stackstate-agent-url -n stackstate -o yaml
kubectl get configmap stackstate-agent-cluster-name -n stackstate -o yaml
```

## Conclusion

How to Troubleshoot Application Issues with SUSE Observability enables comprehensive observability of your Kubernetes infrastructure through topology-based monitoring. SUSE Observability's unique approach of building a real-time dependency map makes it significantly easier to understand the impact of changes and identify root causes of issues. By combining topology visualization with metrics, events, and traces, it provides the full context needed for effective troubleshooting.
