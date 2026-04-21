# How to Configure Health Checks in SUSE Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SUSE Observability, Health Check, Monitoring, Kubernetes, Alerting

Description: Define and configure health check states in SUSE Observability to track component health across your infrastructure.

## Introduction

SUSE Observability (formerly StackState) is a full-stack observability platform that provides topology-based monitoring for Kubernetes and cloud-native applications. Unlike traditional metrics-only monitoring tools, SUSE Observability builds a real-time topology map of your infrastructure, making it easier to understand dependencies and pinpoint root causes. This guide covers How to Configure Health Checks in SUSE Observability.

## Prerequisites

- Kubernetes cluster supported by your SUSE Observability release
- Rancher Prime version supported by your SUSE Observability release (for Rancher-integrated installation)
- Helm v3.13.1+
- A default storage class and enough CPU, memory, and persistent storage for the selected sizing profile
- A SUSE Observability license key and administrator password

## Understanding SUSE Observability Architecture

SUSE Observability consists of:

- **SUSE Observability Server**: Core services and storage for topology, metrics, traces, logs, monitoring, and notifications
- **Agents**: Collect data from Kubernetes nodes, workloads, and cluster APIs
- **Receiver**: Accepts topology, telemetry, events, traces, logs, and health data from agents and integrations
- **UI**: Web interface for topology visualization and monitoring

## Step 1: Install SUSE Observability

```bash
# Add the SUSE Observability Helm repository
helm repo add suse-observability https://charts.rancher.com/server-charts/prime/suse-observability
helm repo update

# Install with your license key, base URL, sizing profile, and admin password
helm upgrade --install suse-observability suse-observability/suse-observability \
  --namespace suse-observability \
  --create-namespace \
  --set-string global.suseObservability.license="your-license-key" \
  --set-string global.suseObservability.baseUrl="https://observability.example.com" \
  --set-string global.suseObservability.sizing.profile="trial" \
  --set-string global.suseObservability.adminPassword="your-admin-password"
```

## Step 2: Deploy the Agent

```bash
# The agent chart is in the same SUSE Observability Helm repository
helm repo update

# Deploy agent on target cluster
helm upgrade --install suse-observability-agent suse-observability/suse-observability-agent \
  --namespace suse-observability \
  --create-namespace \
  --set-string stackstate.apiKey="your-receiver-api-key" \
  --set-string stackstate.cluster.name="production-cluster" \
  --set-string stackstate.cluster.authToken="your-cluster-auth-token" \
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

clusterAgent:
  collection:
    kubernetesTopology: true
    kubernetesMetrics: true
    kubernetesEvents: true
    kubeStateMetrics:
      enabled: true

logsAgent:
  enabled: true

checksAgent:
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
  --namespace suse-observability \
  --create-namespace \
  --values agent-values.yaml
```

## Step 4: Verify Data Collection

```bash
# Check agent pods are running
kubectl get pods -n suse-observability \
  -l app.kubernetes.io/name=suse-observability-agent

# Check cluster agent rollout
kubectl rollout status deployment/suse-observability-agent-cluster-agent \
  -n suse-observability

# Check node agent rollout
kubectl rollout status daemonset/suse-observability-agent-node-agent \
  -n suse-observability

# View cluster agent logs
kubectl logs -n suse-observability \
  deployment/suse-observability-agent-cluster-agent \
  --tail=100
```

## Step 5: Access the SUSE Observability UI

```bash
# Check the router service
kubectl get svc suse-observability-router -n suse-observability

# Or set up port forwarding. For port-forward access, allow
# http://localhost:8080 in stackstate.allowedOrigins first.
kubectl port-forward -n suse-observability \
  svc/suse-observability-router 8080:8080 &

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

External health checks are synchronized through the Receiver API. Define an external monitor for the health stream, then send health payloads whose `topologyElementIdentifier` matches a topology identifier:

```yaml
# externalMonitor.yaml
nodes:
  - _type: ExternalMonitor
    healthStreamUrn: "urn:health:kubernetes:external-health"
    description: "Monitored by external tool."
    identifier: "urn:custom:external-monitor:kubernetes-health"
    name: "External Kubernetes Health"
    remediationHint: ""
    tags:
      - "kubernetes"
```

```bash
sts settings apply -f externalMonitor.yaml
```

```json
{
  "collection_timestamp": 1548857167,
  "internalHostname": "production-cluster",
  "health": [
    {
      "consistency_model": "REPEAT_SNAPSHOTS",
      "start_snapshot": {
        "repeat_interval_s": 300
      },
      "stop_snapshot": {},
      "stream": {
        "urn": "urn:health:kubernetes:external-health"
      },
      "check_states": [
        {
          "checkStateId": "pod-high-cpu",
          "message": "Pod CPU usage is above 80%.",
          "health": "Deviating",
          "topologyElementIdentifier": "<component-identifier-from-the-topology-panel>",
          "name": "High CPU Usage"
        }
      ]
    }
  ]
}
```

### Monitors and Alerts

Configure monitors with the SUSE Observability `sts` CLI:

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
      titleTemplate: "Deployment has no available replicas"
    description: "Monitor whether a deployment has available replicas."
    function: '{{ get "urn:stackpack:kubernetes-v2:shared:monitor-function:threshold" }}'
    identifier: "urn:custom:monitor:deployment-has-replicas"
    intervalSeconds: 30
    name: "Deployment has replicas"
    remediationHint: |-
      Check the deployment rollout status and the logs of its pods.
    status: "ENABLED"
    tags:
      - "deployments"
```

```bash
sts monitor apply -f monitor.yaml
sts monitor list
```

## Troubleshooting

```bash
# Check the Helm release and server pods
helm list --namespace suse-observability
kubectl get pods -n suse-observability

# Inspect a pod that is Pending, ImagePullBackOff, or CrashLoopBackOff
POD_NAME="your-pod-name"
kubectl describe pod -n suse-observability "$POD_NAME"

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

How to Configure Health Checks in SUSE Observability enables comprehensive observability of your Kubernetes infrastructure through topology-based monitoring. SUSE Observability's unique approach of building a real-time dependency map makes it significantly easier to understand the impact of changes and identify root causes of issues. By combining topology visualization with metrics, events, and traces, it provides the full context needed for effective troubleshooting.
